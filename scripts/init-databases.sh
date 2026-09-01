#!/usr/bin/env bash
# ==============================================================================
# Terma Database Initialization & User Provisioning
# Sets up TermaDb_Production and TermaDb_Staging with isolated credentials
# ==============================================================================
set -euo pipefail

# Ensure script runs from repository root
cd "$(dirname "$0")/.."

# Load environment variables if available
if [[ -f .env.production ]]; then
    # shellcheck disable=SC1091
    source .env.production
fi

if [[ -f .env.staging ]]; then
    # shellcheck disable=SC1091
    source .env.staging
fi

DB_SA_PASSWORD="${DB_SA_PASSWORD:-${DB_PASSWORD:-}}"
PROD_DB_PASSWORD="${PROD_DB_PASSWORD:-}"
STAGING_DB_PASSWORD="${STAGING_DB_PASSWORD:-}"

if [[ -z "$DB_SA_PASSWORD" ]]; then
    echo "[-] Error: DB_SA_PASSWORD environment variable is required." >&2
    exit 1
fi

if [[ -z "$PROD_DB_PASSWORD" ]] || [[ -z "$STAGING_DB_PASSWORD" ]]; then
    echo "[-] Error: PROD_DB_PASSWORD and STAGING_DB_PASSWORD are required." >&2
    exit 1
fi

echo "[+] Ensuring SQL Server container (terma-db) is running and healthy..."
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
