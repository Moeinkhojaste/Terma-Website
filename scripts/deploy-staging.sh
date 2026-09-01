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

if [[ -f .env.production ]]; then
    # shellcheck disable=SC1091
    source .env.production
elif [[ -f /opt/terma/production/.env.production ]]; then
    # shellcheck disable=SC1091
    source /opt/terma/production/.env.production
fi

if [[ -f .env.staging ]]; then
    # shellcheck disable=SC1091
    source .env.staging
elif [[ -f /opt/terma/staging/.env.staging ]]; then
    # shellcheck disable=SC1091
    source /opt/terma/staging/.env.staging
fi

DB_SA_PASSWORD="${DB_SA_PASSWORD:-${DB_PASSWORD:-}}"
STAGING_DB_PASSWORD="${STAGING_DB_PASSWORD:-}"
STAGING_DOMAIN="${STAGING_DOMAIN:-staging.termabrand.ir}"
STAGING_OTP_HASH_KEY="${STAGING_OTP_HASH_KEY:-TermaStaging_OtpSecretKey_9876543210_Secure!#}"
PROD_DB_PASSWORD="${PROD_DB_PASSWORD:-${STAGING_DB_PASSWORD}}"
PROD_DOMAIN="${PROD_DOMAIN:-termabrand.ir}"
PROD_OTP_HASH_KEY="${PROD_OTP_HASH_KEY:-TermaProduction_OtpSecretKey_9876543210_Secure!#}"

set +a

ENV_ARGS=()
if [[ -f .env.production ]]; then
    ENV_ARGS+=(--env-file .env.production)
fi
if [[ -f .env.staging ]]; then
    ENV_ARGS+=(--env-file .env.staging)
fi
if [[ -f .env ]]; then
    ENV_ARGS+=(--env-file .env)
fi

# 1. Run database migrations for TermaDb_Staging
echo "[+] Step 1: Running database migrations on TermaDb_Staging..."
docker compose "${ENV_ARGS[@]}" run --rm staging-backend dotnet Terma.Api.dll --migrate

# 2. Deploy updated staging containers
echo "[+] Step 2: Starting staging services with tag ${COMMIT_SHA}..."
docker compose "${ENV_ARGS[@]}" up -d --build staging-backend staging-frontend

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

echo "$COMMIT_SHA" > "/opt/terma/staging_current_sha.txt" 2>/dev/null || true
echo "=============================================================================="
echo " [SUCCESS] Staging deployment verified and live for SHA: ${COMMIT_SHA}"
echo "=============================================================================="
