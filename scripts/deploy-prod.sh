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

# Ensure environment file is available
if [[ -f .env.production ]]; then
    # shellcheck disable=SC1091
    source .env.production
fi

# Step 1: Pre-Deploy Verified Database Backup
echo "[+] Step 1: Executing pre-deployment verified backup of TermaDb_Production..."
if ! bash scripts/backup-db.sh prod --pre-deploy; then
    echo "[-] CRITICAL: Pre-deployment database backup failed. Aborting deployment to protect data." >&2
    exit 1
fi

# Step 2: Database Schema Migration
echo "[+] Step 2: Executing database migrations on TermaDb_Production..."
if ! docker compose run --rm prod-backend dotnet Terma.Api.dll --migrate; then
    echo "[-] CRITICAL: Database migration failed. Active production containers have NOT been touched." >&2
    exit 1
fi

# Step 3: Rolling Deploy Updated Application Containers
echo "[+] Step 3: Deploying updated application containers with tag ${COMMIT_SHA}..."
export PROD_IMAGE_TAG="$COMMIT_SHA"
if ! docker compose up -d prod-backend prod-frontend; then
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
    if docker exec terma-prod-backend curl -s -f http://localhost:8080/health/ready | grep -q '"Healthy"'; then
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

# Step 5: Save State
echo "$COMMIT_SHA" > "/opt/terma/prod_current_sha.txt" 2>/dev/null || true
echo "=============================================================================="
echo " [SUCCESS] Production deployment verified and live for SHA: ${COMMIT_SHA}"
echo "=============================================================================="
