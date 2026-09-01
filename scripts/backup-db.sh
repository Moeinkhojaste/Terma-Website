#!/usr/bin/env bash
# ==============================================================================
# Terma Database Backup Script
# Supports: Pre-Deploy, Daily, Weekly Backups + Verification + Off-Site Sync
# ==============================================================================
set -euo pipefail

ENV_TARGET="${1:-prod}"
BACKUP_MODE="${2:---daily}"

BACKUP_ROOT="/opt/terma/backups"
TIMESTAMP="$(date +'%Y%m%d_%H%M%S')"

if [[ "$ENV_TARGET" == "prod" ]]; then
    DB_NAME="TermaDb_Production"
    ENV_PREFIX="prod"
elif [[ "$ENV_TARGET" == "staging" ]]; then
    DB_NAME="TermaDb_Staging"
    ENV_PREFIX="staging"
else
    echo "[-] Invalid target environment: $ENV_TARGET (Choose: prod or staging)" >&2
    exit 1
fi

case "$BACKUP_MODE" in
    --pre-deploy)
        SUBDIR="pre-deploy"
        RETENTION_COUNT=3
        ;;
    --weekly)
        SUBDIR="weekly"
        RETENTION_COUNT=4
        ;;
    *)
        SUBDIR="daily"
        RETENTION_COUNT=7
        ;;
esac

TARGET_DIR="${BACKUP_ROOT}/${SUBDIR}"
mkdir -p "$TARGET_DIR"

BAK_FILENAME="${ENV_PREFIX}_${DB_NAME}_${SUBDIR}_${TIMESTAMP}.bak"
CONTAINER_BAK_PATH="/var/opt/mssql/backup/${BAK_FILENAME}"
HOST_BAK_PATH="${TARGET_DIR}/${BAK_FILENAME}"

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
    echo "[-] Error: DB_SA_PASSWORD is required for native database backups." >&2
    exit 1
fi

echo "[+] 1. Initializing native SQL Server backup for [${DB_NAME}] (${BACKUP_MODE})..."

# Ensure backup directory inside container exists
docker exec terma-db mkdir -p /var/opt/mssql/backup

# Execute BACKUP DATABASE with CHECKSUM and COMPRESSION
SQL_CMD="BACKUP DATABASE [${DB_NAME}] TO DISK = N'${CONTAINER_BAK_PATH}' WITH FORMAT, INIT, CHECKSUM, COMPRESSION, STATS = 10;"

SQLCMD_BIN="/opt/mssql-tools18/bin/sqlcmd"
SQL_EXTRA_FLAGS=("-C")
if ! docker exec terma-db test -f /opt/mssql-tools18/bin/sqlcmd 2>/dev/null; then
    SQLCMD_BIN="/opt/mssql-tools/bin/sqlcmd"
    SQL_EXTRA_FLAGS=()
fi

docker exec -i terma-db "$SQLCMD_BIN" -S localhost -U sa -P "$DB_SA_PASSWORD" "${SQL_EXTRA_FLAGS[@]}" -Q "$SQL_CMD"

echo "[+] 2. Verifying backup integrity with RESTORE VERIFYONLY (CHECKSUM)..."
VERIFY_CMD="RESTORE VERIFYONLY FROM DISK = N'${CONTAINER_BAK_PATH}' WITH CHECKSUM;"

docker exec -i terma-db "$SQLCMD_BIN" -S localhost -U sa -P "$DB_SA_PASSWORD" "${SQL_EXTRA_FLAGS[@]}" -Q "$VERIFY_CMD"

echo "[+] 3. Copying verified backup to host: ${HOST_BAK_PATH}..."
docker cp "terma-db:${CONTAINER_BAK_PATH}" "$HOST_BAK_PATH"
docker exec terma-db rm -f "$CONTAINER_BAK_PATH"
chmod 600 "$HOST_BAK_PATH"

echo "[+] 4. Enforcing local retention policy (Keeping last ${RETENTION_COUNT} snapshots)..."
find "$TARGET_DIR" -name "${ENV_PREFIX}_${DB_NAME}_${SUBDIR}_*.bak" -type f | sort -r | tail -n +"$((RETENTION_COUNT + 1))" | while read -r old_backup; do
    if [[ -n "$old_backup" ]]; then
        echo "[*] Removing expired local backup: $old_backup"
        rm -f "$old_backup"
    fi
done

# Off-site Cloud Synchronization
if [[ "${OFFSITE_BACKUP_ENABLED:-false}" == "true" ]] && [[ -n "${S3_BUCKET_NAME:-}" ]]; then
    echo "[+] 5. Synchronizing backup off-site to S3/Cloud Storage..."
    if command -v aws &>/dev/null; then
        export AWS_ACCESS_KEY_ID="${AWS_ACCESS_KEY_ID:-}"
        export AWS_SECRET_ACCESS_KEY="${AWS_SECRET_ACCESS_KEY:-}"
        ENDPOINT_FLAG=""
        if [[ -n "${S3_ENDPOINT_URL:-}" ]]; then
            ENDPOINT_FLAG="--endpoint-url ${S3_ENDPOINT_URL}"
        fi
        # shellcheck disable=SC2086
        aws s3 cp "$HOST_BAK_PATH" "s3://${S3_BUCKET_NAME}/${ENV_PREFIX}/${SUBDIR}/${BAK_FILENAME}" $ENDPOINT_FLAG
        echo "[*] Off-site upload complete."
    elif command -v rclone &>/dev/null; then
        rclone copy "$HOST_BAK_PATH" "terma-s3:${S3_BUCKET_NAME}/${ENV_PREFIX}/${SUBDIR}/"
        echo "[*] Off-site upload via rclone complete."
    else
        echo "[!] Warning: Off-site sync enabled but neither 'aws' nor 'rclone' CLI is installed." >&2
    fi
fi

echo "[+] Backup completed successfully: ${HOST_BAK_PATH}"
