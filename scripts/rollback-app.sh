#!/usr/bin/env bash
# ==============================================================================
# Terma Application Rollback Script
# Rolls back backend and frontend containers to a specified previous commit SHA
# Note: Decoupled from database restore to protect live transaction data.
# ==============================================================================
set -euo pipefail

# Ensure script runs from repository root
cd "$(dirname "$0")/.."

ENV_TARGET="${1:-prod}"
PREVIOUS_TAG="${2:-}"

if [[ -z "$PREVIOUS_TAG" ]]; then
    echo "Usage: $0 <prod|staging> <previous-commit-sha>" >&2
    exit 1
fi

echo "=============================================================================="
echo " [ROLLBACK] Initiating Application Rollback for [${ENV_TARGET}] -> Tag: ${PREVIOUS_TAG}"
echo "=============================================================================="

if [[ "$ENV_TARGET" == "prod" ]]; then
    export PROD_IMAGE_TAG="$PREVIOUS_TAG"
    SERVICES="prod-backend prod-frontend"
    HEALTH_URL="http://localhost:8080/health/ready"
elif [[ "$ENV_TARGET" == "staging" ]]; then
    export STAGING_IMAGE_TAG="$PREVIOUS_TAG"
    SERVICES="staging-backend staging-frontend"
    HEALTH_URL="http://localhost:8081/health/ready"
else
    echo "[-] Invalid environment: $ENV_TARGET" >&2
    exit 1
fi

echo "[+] 1. Rolling back container images to version: ${PREVIOUS_TAG}..."
# shellcheck disable=SC2086
docker compose up -d --no-build $SERVICES

echo "[+] 2. Performing post-rollback health verification..."
MAX_RETRIES=20
RETRY_COUNT=0
HEALTHY=false

while [[ $RETRY_COUNT -lt $MAX_RETRIES ]]; do
    if docker exec "terma-${ENV_TARGET}-backend" curl -s -f http://localhost:8080/health/ready | grep -q '"Healthy"'; then
        HEALTHY=true
        break
    fi
    RETRY_COUNT=$((RETRY_COUNT + 1))
    echo "[*] Waiting for rolled-back application to become healthy... (${RETRY_COUNT}/${MAX_RETRIES})"
    sleep 3
done

if [[ "$HEALTHY" == "true" ]]; then
    echo "[+] Rollback successful! Application is healthy on tag ${PREVIOUS_TAG}."
    echo "[*] Current deployed SHA saved."
    echo "$PREVIOUS_TAG" > "/opt/terma/${ENV_TARGET}_current_sha.txt" 2>/dev/null || true
else
    echo "[-] CRITICAL: Post-rollback health check failed on tag ${PREVIOUS_TAG}." >&2
    exit 1
fi
