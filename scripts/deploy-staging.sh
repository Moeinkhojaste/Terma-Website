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

# Ensure environment file is available
if [[ -f .env.staging ]]; then
    # shellcheck disable=SC1091
    source .env.staging
fi

# 1. Run database migrations for TermaDb_Staging
echo "[+] Step 1: Running database migrations on TermaDb_Staging..."
docker compose run --rm staging-backend dotnet Terma.Api.dll --migrate

# 2. Deploy updated staging containers
echo "[+] Step 2: Starting staging services with tag ${COMMIT_SHA}..."
docker compose up -d staging-backend staging-frontend

# 3. Health check verification
echo "[+] Step 3: Verifying staging readiness health check..."
MAX_RETRIES=20
RETRY_COUNT=0
HEALTHY=false

while [[ $RETRY_COUNT -lt $MAX_RETRIES ]]; do
    if docker exec terma-staging-backend curl -s -f http://localhost:8080/health/ready | grep -q '"Healthy"'; then
        HEALTHY=true
        break
    fi
    RETRY_COUNT=$((RETRY_COUNT + 1))
    echo "[*] Polling Staging health check... (${RETRY_COUNT}/${MAX_RETRIES})"
    sleep 3
done

if [[ "$HEALTHY" != "true" ]]; then
    echo "[-] Staging health check verification failed!" >&2
    exit 1
fi

echo "$COMMIT_SHA" > "/opt/terma/staging_current_sha.txt" 2>/dev/null || true
echo "[+] Staging deployment verified and live for SHA: ${COMMIT_SHA}"
