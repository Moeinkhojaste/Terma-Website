#!/usr/bin/env bash
# ==============================================================================
# Terma Automated Backup Restoration Verification Test
# Tests full recovery pipeline into an isolated temporary database
# ==============================================================================
set -euo pipefail

# Ensure script runs from repository root
cd "$(dirname "$0")/.."

echo "=============================================================================="
echo " [TEST] Starting Automated Database Backup & Restoration Verification"
echo "=============================================================================="

# 1. Take a fresh pre-test backup
echo "[+] Step 1: Generating fresh verified snapshot..."
bash scripts/backup-db.sh prod --pre-deploy

# Locate latest pre-deploy backup
LATEST_BACKUP="$(find /opt/terma/backups/pre-deploy -name "prod_TermaDb_Production_pre-deploy_*.bak" -type f | sort -r | head -n 1)"

if [[ -z "$LATEST_BACKUP" || ! -f "$LATEST_BACKUP" ]]; then
    echo "[-] Error: Could not locate generated pre-deploy backup." >&2
    exit 1
fi
echo "[*] Using backup file: $LATEST_BACKUP"

# 2. Restore into isolated test database: TermaDb_RestoreTest
TEST_DB_NAME="TermaDb_RestoreTest"
echo "[+] Step 2: Restoring into temporary test database: [${TEST_DB_NAME}]..."
bash scripts/restore-db.sh "$LATEST_BACKUP" "$TEST_DB_NAME"

# 3. Query and Validate schema and table integrity
echo "[+] Step 3: Validating schema, tables, and row integrity in [${TEST_DB_NAME}]..."

if [[ -f .env.production ]]; then
    # shellcheck disable=SC1091
    source .env.production
fi
DB_SA_PASSWORD="${DB_SA_PASSWORD:-${DB_PASSWORD:-}}"

VALIDATION_SQL="
SET NOCOUNT ON;
USE [${TEST_DB_NAME}];

DECLARE @ProductCount INT = (SELECT COUNT(*) FROM sys.tables WHERE name = 'Products');
DECLARE @CategoryCount INT = (SELECT COUNT(*) FROM sys.tables WHERE name = 'Categories');
DECLARE @OrderCount INT = (SELECT COUNT(*) FROM sys.tables WHERE name = 'Orders');
DECLARE @UserCount INT = (SELECT COUNT(*) FROM sys.tables WHERE name = 'Users');

IF (@ProductCount = 1 AND @CategoryCount = 1 AND @OrderCount = 1 AND @UserCount = 1)
BEGIN
    PRINT 'VERIFICATION_SUCCESS: Core tables exist and are verified.';
END
ELSE
BEGIN
    PRINT 'VERIFICATION_FAILURE: Missing core tables in restored database.';
    THROW 51000, 'Schema integrity verification failed', 1;
END
"

docker exec terma-db bash -c "
    if [ -f /opt/mssql-tools18/bin/sqlcmd ]; then
        /opt/mssql-tools18/bin/sqlcmd -S localhost -U sa -P \"$DB_SA_PASSWORD\" -C -Q \"$VALIDATION_SQL\"
    else
        /opt/mssql-tools/bin/sqlcmd -S localhost -U sa -P \"$DB_SA_PASSWORD\" -Q \"$VALIDATION_SQL\"
    fi
"

# 4. Clean up temporary test database
echo "[+] Step 4: Cleaning up temporary test database [${TEST_DB_NAME}]..."
CLEANUP_SQL="
IF EXISTS (SELECT name FROM sys.databases WHERE name = N'${TEST_DB_NAME}')
BEGIN
    ALTER DATABASE [${TEST_DB_NAME}] SET SINGLE_USER WITH ROLLBACK IMMEDIATE;
    DROP DATABASE [${TEST_DB_NAME}];
    PRINT 'Temporary test database dropped cleanly.';
END
"

docker exec terma-db bash -c "
    if [ -f /opt/mssql-tools18/bin/sqlcmd ]; then
        /opt/mssql-tools18/bin/sqlcmd -S localhost -U sa -P \"$DB_SA_PASSWORD\" -C -Q \"$CLEANUP_SQL\"
    else
        /opt/mssql-tools/bin/sqlcmd -S localhost -U sa -P \"$DB_SA_PASSWORD\" -Q \"$CLEANUP_SQL\"
    fi
"

echo "=============================================================================="
echo " [PASS] Disaster Recovery Verification Test Completed Successfully!"
echo "=============================================================================="
