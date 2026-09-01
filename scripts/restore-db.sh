#!/usr/bin/env bash
# ==============================================================================
# Terma Safe Database Restoration Script
# Includes Safety Interlocks Against Accidental Production Overwrite
# ==============================================================================
set -euo pipefail

BAK_FILE="${1:-}"
TARGET_DB="${2:-}"
FORCE_FLAG="${3:-}"

if [[ -z "$BAK_FILE" ]] || [[ -z "$TARGET_DB" ]]; then
    echo "Usage: $0 <path-to-backup.bak> <target-database-name> [--force-prod-restore]" >&2
    echo "Example: $0 /opt/terma/backups/daily/prod_backup.bak TermaDb_Staging" >&2
    exit 1
fi

if [[ ! -f "$BAK_FILE" ]]; then
    echo "[-] Error: Backup file '$BAK_FILE' does not exist." >&2
    exit 1
fi

# Load SA credentials
set -a
if [[ -f .env.production ]]; then
    # shellcheck disable=SC1091
    source .env.production
elif [[ -f /opt/terma/production/.env.production ]]; then
    # shellcheck disable=SC1091
    source /opt/terma/production/.env.production
elif [[ -f /opt/terma/production/.env ]]; then
    # shellcheck disable=SC1091
    source /opt/terma/production/.env
elif [[ -f /opt/terma/.env.production ]]; then
    # shellcheck disable=SC1091
    source /opt/terma/.env.production
elif [[ -f /opt/terma/.env ]]; then
    # shellcheck disable=SC1091
    source /opt/terma/.env
elif [[ -f .env.staging ]]; then
    # shellcheck disable=SC1091
    source .env.staging
elif [[ -f /opt/terma/staging/.env.staging ]]; then
    # shellcheck disable=SC1091
    source /opt/terma/staging/.env.staging
elif [[ -f /opt/terma/staging/.env ]]; then
    # shellcheck disable=SC1091
    source /opt/terma/staging/.env
elif [[ -f .env ]]; then
    # shellcheck disable=SC1091
    source .env
fi

DB_SA_PASSWORD="${DB_SA_PASSWORD:-${DB_PASSWORD:-}}"
set +a
if [[ -z "$DB_SA_PASSWORD" ]]; then
    echo "[-] Error: DB_SA_PASSWORD environment variable is required." >&2
    exit 1
fi

# Strict Production Overwrite Guard
if [[ "$TARGET_DB" == "TermaDb_Production" ]]; then
    if [[ "$FORCE_FLAG" != "--force-prod-restore" ]]; then
        echo "======================================================================" >&2
        echo " [!] CRITICAL WARNING: Target is PRODUCTION database: $TARGET_DB" >&2
        echo " Restoring will overwrite active live data." >&2
        echo " To confirm, you must pass the exact flag: --force-prod-restore" >&2
        echo "======================================================================" >&2
        exit 1
    fi
fi

echo "[+] 1. Copying backup file into database container..."
CONTAINER_BAK="/var/opt/mssql/backup/restore_target.bak"
docker exec terma-db mkdir -p /var/opt/mssql/backup
docker cp "$BAK_FILE" "terma-db:${CONTAINER_BAK}"

echo "[+] 2. Setting database [${TARGET_DB}] to SINGLE_USER and terminating active connections..."
DISCONNECT_CMD="IF EXISTS (SELECT name FROM sys.databases WHERE name = N'${TARGET_DB}') ALTER DATABASE [${TARGET_DB}] SET SINGLE_USER WITH ROLLBACK IMMEDIATE;"

docker exec terma-db bash -c "
    if [ -f /opt/mssql-tools18/bin/sqlcmd ]; then
        /opt/mssql-tools18/bin/sqlcmd -S localhost -U sa -P \"$DB_SA_PASSWORD\" -C -Q \"$DISCONNECT_CMD\"
    else
        /opt/mssql-tools/bin/sqlcmd -S localhost -U sa -P \"$DB_SA_PASSWORD\" -Q \"$DISCONNECT_CMD\"
    fi
"

echo "[+] 3. Executing RESTORE DATABASE [${TARGET_DB}]..."
RESTORE_CMD="RESTORE DATABASE [${TARGET_DB}] FROM DISK = N'${CONTAINER_BAK}' WITH REPLACE, STATS = 10; ALTER DATABASE [${TARGET_DB}] SET MULTI_USER;"

docker exec terma-db bash -c "
    if [ -f /opt/mssql-tools18/bin/sqlcmd ]; then
        /opt/mssql-tools18/bin/sqlcmd -S localhost -U sa -P \"$DB_SA_PASSWORD\" -C -Q \"$RESTORE_CMD\"
    else
        /opt/mssql-tools/bin/sqlcmd -S localhost -U sa -P \"$DB_SA_PASSWORD\" -Q \"$RESTORE_CMD\"
    fi
"

echo "[+] 4. Cleaning up temporary restoration artifact in container..."
docker exec terma-db rm -f "$CONTAINER_BAK"

echo "[+] Database [${TARGET_DB}] restored and brought online successfully!"
