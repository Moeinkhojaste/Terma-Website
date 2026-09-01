#!/usr/bin/env bash
# ==============================================================================
# Terma Database Initialization & User Provisioning
# Sets up TermaDb_Production and TermaDb_Staging with isolated credentials
# ==============================================================================
set -euo pipefail

# Ensure script runs from repository root
cd "$(dirname "$0")/.."

# Automatically export all sourced variables for docker compose
set -a

# Load environment variables if available
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

set +a

export DB_SA_PASSWORD="${DB_SA_PASSWORD:-${DB_PASSWORD:-}}"
export PROD_DB_PASSWORD="${PROD_DB_PASSWORD:-${STAGING_DB_PASSWORD:-}}"
export STAGING_DB_PASSWORD="${STAGING_DB_PASSWORD:-${PROD_DB_PASSWORD:-}}"
export PROD_DOMAIN="${PROD_DOMAIN:-termabrand.ir}"
export STAGING_DOMAIN="${STAGING_DOMAIN:-staging.termabrand.ir}"
export PROD_OTP_HASH_KEY="${PROD_OTP_HASH_KEY:-TermaProduction_OtpSecretKey_9876543210_Secure!#}"
export STAGING_OTP_HASH_KEY="${STAGING_OTP_HASH_KEY:-TermaStaging_OtpSecretKey_9876543210_Secure!#}"

if [[ -z "$DB_SA_PASSWORD" ]]; then
    echo "[-] Error: DB_SA_PASSWORD environment variable is required." >&2
    exit 1
fi

if [[ -z "$PROD_DB_PASSWORD" ]] || [[ -z "$STAGING_DB_PASSWORD" ]]; then
    echo "[-] Error: PROD_DB_PASSWORD and STAGING_DB_PASSWORD are required." >&2
    exit 1
fi

echo "[+] Ensuring SQL Server container (terma-db) is running and healthy..."
# Handle any stale conflicting container from previous legacy setups
if docker ps -a --format '{{.Names}}' | grep -Eq "^terma-db$"; then
    docker stop terma-db &>/dev/null || true
    docker rm -f terma-db &>/dev/null || true
fi

docker compose up -d db

# Wait for healthy database
MAX_RETRIES=30
RETRY_COUNT=0
until docker exec terma-db /opt/mssql-tools18/bin/sqlcmd -S localhost -U sa -P "$DB_SA_PASSWORD" -C -Q "SELECT 1" &>/dev/null || \
      docker exec terma-db /opt/mssql-tools/bin/sqlcmd -S localhost -U sa -P "$DB_SA_PASSWORD" -Q "SELECT 1" &>/dev/null; do
    RETRY_COUNT=$((RETRY_COUNT + 1))
    if [[ $RETRY_COUNT -ge $MAX_RETRIES ]]; then
        echo "[-] Timeout waiting for SQL Server to become available." >&2
        exit 1
    fi
    echo "[*] Waiting for SQL Server... (${RETRY_COUNT}/${MAX_RETRIES})"
    sleep 2
done

echo "[+] Executing database provisioning and security hardening script..."
docker exec -i terma-db bash -c "cat > /tmp/init-databases.sql" < sql/init-databases.sql

docker exec terma-db bash -c "
    if [ -f /opt/mssql-tools18/bin/sqlcmd ]; then
        /opt/mssql-tools18/bin/sqlcmd -S localhost -U sa -P \"$DB_SA_PASSWORD\" -C \
            -v PROD_DB_PASSWORD=\"$PROD_DB_PASSWORD\" \
            -v STAGING_DB_PASSWORD=\"$STAGING_DB_PASSWORD\" \
            -i /tmp/init-databases.sql
    else
        /opt/mssql-tools/bin/sqlcmd -S localhost -U sa -P \"$DB_SA_PASSWORD\" \
            -v PROD_DB_PASSWORD=\"$PROD_DB_PASSWORD\" \
            -v STAGING_DB_PASSWORD=\"$STAGING_DB_PASSWORD\" \
            -i /tmp/init-databases.sql
    fi
    rm -f /tmp/init-databases.sql
"

echo "[+] Database and user isolation configured successfully!"
