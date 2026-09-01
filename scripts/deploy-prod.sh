#!/usr/bin/env bash
# ==============================================================================
# Terma Zero-Risk Production Deployment Pipeline (Triggered on main branch)
# Flow: Pre-Deploy Backup -> Migration -> Deploy Containers -> Health Check
#       -> Automatic Application Rollback on Failure
# ==============================================================================
set -euo pipefail

cd "$(dirname "$0")/.."

COMMIT_SHA="${1:-$(git rev-parse --short HEAD 2>/dev/null || echo "latest")}"
PREVIOUS_SHA="$(cat /opt/terma/prod_current_sha.txt 2>/dev/null || echo "latest")"

echo "=============================================================================="
echo " [DEPLOY PRODUCTION] Target Version: ${COMMIT_SHA} (Previous: ${PREVIOUS_SHA})"
echo "=============================================================================="

# Ensure all environment variables are exported for docker compose
set -a

# Attempt to source environment variables from all standard production locations
ENV_FILE=""
if [[ -f .env.production ]]; then
    ENV_FILE=".env.production"
elif [[ -f /opt/terma/production/.env.production ]]; then
    ENV_FILE="/opt/terma/production/.env.production"
elif [[ -f /opt/terma/production/.env ]]; then
    ENV_FILE="/opt/terma/production/.env"
elif [[ -f /opt/terma/.env.production ]]; then
    ENV_FILE="/opt/terma/.env.production"
elif [[ -f /opt/terma/.env ]]; then
    ENV_FILE="/opt/terma/.env"
elif [[ -f .env ]]; then
    ENV_FILE=".env"
elif [[ -f /opt/terma/staging/.env.staging ]]; then
    ENV_FILE="/opt/terma/staging/.env.staging"
elif [[ -f .env.staging ]]; then
    ENV_FILE=".env.staging"
fi

if [[ -n "$ENV_FILE" ]]; then
    echo "[*] Sourcing environment from: ${ENV_FILE}"
    # shellcheck disable=SC1090
    source "$ENV_FILE"
fi

DB_SA_PASSWORD="${DB_SA_PASSWORD:-${DB_PASSWORD:-}}"
PROD_DB_PASSWORD="${PROD_DB_PASSWORD:-${DB_PASSWORD:-${DB_SA_PASSWORD:-}}}"
PROD_DOMAIN="${PROD_DOMAIN:-termabrand.ir}"
PROD_OTP_HASH_KEY="${PROD_OTP_HASH_KEY:-TermaProduction_OtpSecretKey_9876543210_Secure!#}"
STAGING_DB_PASSWORD="${STAGING_DB_PASSWORD:-${PROD_DB_PASSWORD}}"
STAGING_DOMAIN="${STAGING_DOMAIN:-staging.termabrand.ir}"
STAGING_OTP_HASH_KEY="${STAGING_OTP_HASH_KEY:-TermaStaging_OtpSecretKey_9876543210_Secure!#}"

set +a

if [[ -z "$PROD_DB_PASSWORD" ]]; then
    echo "[-] CRITICAL: PROD_DB_PASSWORD (or DB_PASSWORD / DB_SA_PASSWORD) is empty." >&2
    echo "[-] Please ensure your environment file (e.g. /opt/terma/production/.env.production) defines PROD_DB_PASSWORD=..." >&2
    exit 1
fi

ENV_ARGS=()
if [[ -n "$ENV_FILE" ]]; then
    ENV_ARGS+=(--env-file "$ENV_FILE")
fi

# Step 0: Ensure Shared Database Engine (terma-db) and User Logins are Configured
echo "[+] Step 0: Ensuring database container and user logins are configured..."
bash scripts/init-databases.sh

# Step 1: Pre-Deploy Verified Database Backup
echo "[+] Step 1: Executing pre-deployment verified backup of TermaDb_Production..."
if ! bash scripts/backup-db.sh prod --pre-deploy; then
    echo "[-] CRITICAL: Pre-deployment database backup failed. Aborting deployment to protect data." >&2
    exit 1
fi

# Build verified explicit connection string & image tag
export PROD_IMAGE_TAG="$COMMIT_SHA"
export PROD_CONNECTION_STRING="Server=db,1433;Database=TermaDb_Production;User Id=terma_prod_user;Password=${PROD_DB_PASSWORD};TrustServerCertificate=True"
export ConnectionStrings__DefaultConnection="$PROD_CONNECTION_STRING"

# Step 2: Build Updated Application Images
echo "[+] Step 2: Building updated application containers with tag ${COMMIT_SHA}..."
if ! docker compose -p terma "${ENV_ARGS[@]}" build prod-backend prod-frontend; then
    echo "[-] CRITICAL: Docker build failed. Aborting deployment." >&2
    exit 1
fi

# Step 3: Wait for Database Readiness & Execute Database Schema Migration
echo "[+] Step 3: Verifying TermaDb_Production connectivity before migration..."
MAX_DB_RETRIES=30
DB_RETRY_COUNT=0
DB_HEALTHY=false

while [[ $DB_RETRY_COUNT -lt $MAX_DB_RETRIES ]]; do
    if docker exec terma-db /opt/mssql-tools18/bin/sqlcmd -S localhost -U terma_prod_user -P "$PROD_DB_PASSWORD" -C -d TermaDb_Production -Q "SELECT 1" &>/dev/null; then
        DB_HEALTHY=true
        break
    elif docker exec terma-db /opt/mssql-tools/bin/sqlcmd -S localhost -U terma_prod_user -P "$PROD_DB_PASSWORD" -d TermaDb_Production -Q "SELECT 1" &>/dev/null; then
        DB_HEALTHY=true
        break
    fi
    DB_RETRY_COUNT=$((DB_RETRY_COUNT + 1))
    echo "[*] Waiting for TermaDb_Production to accept queries... (${DB_RETRY_COUNT}/${MAX_DB_RETRIES})"
    sleep 2
done

if [[ "$DB_HEALTHY" != "true" ]]; then
    echo "[-] CRITICAL: TermaDb_Production is not accepting connections from terma_prod_user." >&2
    exit 1
fi

echo "[+] Step 3: Executing database migrations on TermaDb_Production..."
if ! docker compose -p terma "${ENV_ARGS[@]}" run --rm -e ConnectionStrings__DefaultConnection="$PROD_CONNECTION_STRING" prod-backend dotnet Terma.Api.dll --migrate; then
    echo "[-] CRITICAL: Database migration failed. Active production containers have NOT been touched." >&2
    exit 1
fi

# Step 4: Launch Updated Application Containers
echo "[+] Step 4: Starting updated production containers..."
if ! docker compose -p terma "${ENV_ARGS[@]}" up -d prod-backend prod-frontend; then
    echo "[-] Error launching updated containers. Initiating rollback to ${PREVIOUS_SHA}..." >&2
    bash scripts/rollback-app.sh prod "$PREVIOUS_SHA"
    exit 1
fi

# Step 4: Health Check Verification
echo "[+] Step 4: Verifying Production readiness health checks..."
MAX_RETRIES=20
RETRY_COUNT=0
HEALTHY=false

while [[ $RETRY_COUNT -lt $MAX_RETRIES ]]; do
    if docker exec terma-prod-backend curl -s -f http://localhost:8080/health/ready 2>/dev/null | grep -q '"Healthy"'; then
        HEALTHY=true
        break
    elif docker exec terma-prod-backend wget -q -O - http://localhost:8080/health/ready 2>/dev/null | grep -q '"Healthy"'; then
        HEALTHY=true
        break
    fi
    RETRY_COUNT=$((RETRY_COUNT + 1))
    echo "[*] Polling Production health check... (${RETRY_COUNT}/${MAX_RETRIES})"
    sleep 3
done

if [[ "$HEALTHY" != "true" ]]; then
    echo "[-] CRITICAL: Production health check failed after deployment!" >&2
    echo "[!] Triggering automatic application rollback to ${PREVIOUS_SHA}..." >&2
    bash scripts/rollback-app.sh prod "$PREVIOUS_SHA"
    exit 1
fi

# Step 5: Post-deployment read-only API smoke checks
echo "[+] Step 5: Running post-deployment smoke tests (categories, catalog, CMS content)..."
if ! docker exec terma-prod-backend curl -s -f http://localhost:8080/api/categories >/dev/null \
   || ! docker exec terma-prod-backend curl -s -f "http://localhost:8080/api/products?pageSize=1" >/dev/null \
   || ! docker exec terma-prod-backend curl -s -f "http://localhost:8080/api/store/content?page=home" >/dev/null; then
    echo "[-] CRITICAL: Post-deployment smoke tests failed on production API!" >&2
    echo "[!] Triggering automatic application rollback to ${PREVIOUS_SHA}..." >&2
    bash scripts/rollback-app.sh prod "$PREVIOUS_SHA"
    exit 1
fi
echo "[+] All production smoke checks passed successfully."

# Step 6: Ensure Nginx Gateway is Active and Reloaded
echo "[+] Step 6: Ensuring Nginx reverse proxy gateway is active..."
docker compose -p terma "${ENV_ARGS[@]}" up -d nginx
if docker ps | grep -q "terma-nginx"; then
    docker exec terma-nginx nginx -s reload 2>/dev/null || true
fi

# Step 7: Save State
echo "$COMMIT_SHA" > "/opt/terma/prod_current_sha.txt" 2>/dev/null || true
echo "=============================================================================="
echo " [SUCCESS] Production deployment verified and live for SHA: ${COMMIT_SHA}"
echo "=============================================================================="
