#!/usr/bin/env bash
# ==============================================================================
# Terma Staging Deployment Script (Triggered on develop branch)
# Flow: Migration -> Deploy Staging Containers -> Health Check Verification
# ==============================================================================
set -euo pipefail

cd "$(dirname "$0")/.."

COMMIT_SHA="${1:-$(git rev-parse --short HEAD 2>/dev/null || echo "staging")}"
export STAGING_IMAGE_TAG="$COMMIT_SHA"

echo "=============================================================================="
echo " [DEPLOY STAGING] Deploying version: ${COMMIT_SHA}"
echo "=============================================================================="

# Ensure all environment variables are exported for docker compose
set -a

if [[ -f .env.staging ]]; then
    # shellcheck disable=SC1091
    source .env.staging
elif [[ -f /opt/terma/staging/.env.staging ]]; then
    # shellcheck disable=SC1091
    source /opt/terma/staging/.env.staging
elif [[ -f .env ]]; then
    # shellcheck disable=SC1091
    source .env
fi

DB_SA_PASSWORD="${DB_SA_PASSWORD:-${DB_PASSWORD:-}}"
STAGING_DB_PASSWORD="${STAGING_DB_PASSWORD:-${DB_PASSWORD:-}}"
STAGING_DOMAIN="${STAGING_DOMAIN:-staging.termabrand.ir}"
STAGING_OTP_HASH_KEY="${STAGING_OTP_HASH_KEY:-TermaStaging_OtpSecretKey_9876543210_Secure!#}"
PROD_DB_PASSWORD="${PROD_DB_PASSWORD:-${STAGING_DB_PASSWORD}}"
PROD_DOMAIN="${PROD_DOMAIN:-termabrand.ir}"
PROD_OTP_HASH_KEY="${PROD_OTP_HASH_KEY:-TermaProduction_OtpSecretKey_9876543210_Secure!#}"

set +a

ENV_ARGS=()
if [[ -f .env.staging ]]; then
    ENV_ARGS+=(--env-file .env.staging)
elif [[ -f /opt/terma/staging/.env.staging ]]; then
    ENV_ARGS+=(--env-file /opt/terma/staging/.env.staging)
elif [[ -f .env ]]; then
    ENV_ARGS+=(--env-file .env)
fi

# 0. Ensure Shared Database Engine (terma-db) and User Logins are Configured
echo "[+] Step 0: Ensuring database container and user logins are configured..."
bash scripts/init-databases.sh

# Build verified explicit connection string & image tag
export STAGING_IMAGE_TAG="$COMMIT_SHA"
export STAGING_CONNECTION_STRING="Server=db,1433;Database=TermaDb_Staging;User Id=terma_staging_user;Password=${STAGING_DB_PASSWORD};TrustServerCertificate=True"
export ConnectionStrings__DefaultConnection="$STAGING_CONNECTION_STRING"

# 1. Build updated staging images
echo "[+] Step 1: Building staging services with tag ${COMMIT_SHA}..."
docker compose "${ENV_ARGS[@]}" build staging-backend staging-frontend

# 2. Run database migrations for TermaDb_Staging
echo "[+] Step 2: Running database migrations on TermaDb_Staging..."
docker compose "${ENV_ARGS[@]}" run --rm -e ConnectionStrings__DefaultConnection="$STAGING_CONNECTION_STRING" staging-backend dotnet Terma.Api.dll --migrate

# 3. Deploy updated staging containers
echo "[+] Step 3: Starting staging services with tag ${COMMIT_SHA}..."
docker compose "${ENV_ARGS[@]}" up -d staging-backend staging-frontend

# 3. Health check verification
echo "[+] Step 3: Verifying staging readiness health check..."
MAX_RETRIES=20
RETRY_COUNT=0
HEALTHY=false

while [[ $RETRY_COUNT -lt $MAX_RETRIES ]]; do
    if docker exec terma-staging-backend curl -s -f http://localhost:8080/health/ready 2>/dev/null | grep -q '"Healthy"'; then
        HEALTHY=true
        break
    elif docker exec terma-staging-backend wget -q -O - http://localhost:8080/health/ready 2>/dev/null | grep -q '"Healthy"'; then
        HEALTHY=true
        break
    fi
    RETRY_COUNT=$((RETRY_COUNT + 1))
    echo "[*] Polling Staging health check... (${RETRY_COUNT}/${MAX_RETRIES})"
    sleep 3
done

if [[ "$HEALTHY" != "true" ]]; then
    echo "[-] Staging health check verification failed!" >&2
    echo "[-] Diagnostic backend logs:" >&2
    docker logs --tail 30 terma-staging-backend >&2 || true
    exit 1
fi

# 4. Post-deployment read-only API and Storefront smoke checks
echo "[+] Step 4: Running post-deployment smoke tests (categories, catalog, CMS content)..."
if ! docker exec terma-staging-backend curl -s -f http://localhost:8080/api/categories >/dev/null; then
    echo "[-] Smoke check failed: GET /api/categories returned non-200" >&2
    exit 1
fi
if ! docker exec terma-staging-backend curl -s -f "http://localhost:8080/api/products?pageSize=1" >/dev/null; then
    echo "[-] Smoke check failed: GET /api/products returned non-200" >&2
    exit 1
fi
if ! docker exec terma-staging-backend curl -s -f "http://localhost:8080/api/store/content?page=home" >/dev/null; then
    echo "[-] Smoke check failed: GET /api/store/content returned non-200" >&2
    exit 1
fi
echo "[+] All post-deployment smoke checks passed successfully."

# 5. Ensure Nginx Gateway is Active and Reloaded
echo "[+] Step 5: Ensuring Nginx reverse proxy gateway is active..."
docker compose "${ENV_ARGS[@]}" up -d nginx
if docker ps | grep -q "terma-nginx"; then
    docker exec terma-nginx nginx -s reload 2>/dev/null || true
fi

echo "$COMMIT_SHA" > "/opt/terma/staging_current_sha.txt" 2>/dev/null || true
echo "=============================================================================="
echo " [SUCCESS] Staging deployment verified and live for SHA: ${COMMIT_SHA}"
echo "=============================================================================="
