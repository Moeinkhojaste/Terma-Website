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

# Load production environment variables
PROD_DB_PASSWORD=""
if [[ -f /opt/terma/production/.env.production ]]; then
    PROD_DB_PASSWORD=$(grep -E "^(PROD_DB_PASSWORD|DB_PASSWORD)=" /opt/terma/production/.env.production | head -n1 | cut -d= -f2- | tr -d '\r"' || true)
elif [[ -f .env.production ]]; then
    PROD_DB_PASSWORD=$(grep -E "^(PROD_DB_PASSWORD|DB_PASSWORD)=" .env.production | head -n1 | cut -d= -f2- | tr -d '\r"' || true)
fi

# Load staging environment variables
STAGING_DB_PASSWORD=""
if [[ -f /opt/terma/staging/.env.staging ]]; then
    STAGING_DB_PASSWORD=$(grep -E "^(STAGING_DB_PASSWORD|DB_PASSWORD)=" /opt/terma/staging/.env.staging | head -n1 | cut -d= -f2- | tr -d '\r"' || true)
elif [[ -f .env.staging ]]; then
    STAGING_DB_PASSWORD=$(grep -E "^(STAGING_DB_PASSWORD|DB_PASSWORD)=" .env.staging | head -n1 | cut -d= -f2- | tr -d '\r"' || true)
fi

# Sourced / fallback
PROD_SAVED_PASS="${PROD_DB_PASSWORD:-${DB_PASSWORD:-${DB_SA_PASSWORD:-}}}"
STAGING_SAVED_PASS="${STAGING_DB_PASSWORD:-${PROD_SAVED_PASS}}"

export DB_SA_PASSWORD="${DB_SA_PASSWORD:-${PROD_SAVED_PASS}}"
export PROD_DB_PASSWORD="${PROD_SAVED_PASS}"
export STAGING_DB_PASSWORD="${STAGING_SAVED_PASS}"
export PROD_DOMAIN="${PROD_DOMAIN:-termabrand.ir}"
export STAGING_DOMAIN="${STAGING_DOMAIN:-staging.termabrand.ir}"
export PROD_OTP_HASH_KEY="${PROD_OTP_HASH_KEY:-TermaProduction_OtpSecretKey_9876543210_Secure!#}"
export STAGING_OTP_HASH_KEY="${STAGING_OTP_HASH_KEY:-TermaStaging_OtpSecretKey_9876543210_Secure!#}"

set +a

if [[ -z "$DB_SA_PASSWORD" ]]; then
    echo "[-] Error: DB_SA_PASSWORD environment variable is required." >&2
    exit 1
fi

if [[ -z "$PROD_DB_PASSWORD" ]] || [[ -z "$STAGING_DB_PASSWORD" ]]; then
    echo "[-] Error: PROD_DB_PASSWORD and STAGING_DB_PASSWORD are required." >&2
    exit 1
fi

ENV_ARGS=()
if [[ -f .env.production ]]; then
    ENV_ARGS+=(--env-file .env.production)
elif [[ -f /opt/terma/production/.env.production ]]; then
    ENV_ARGS+=(--env-file /opt/terma/production/.env.production)
elif [[ -f /opt/terma/production/.env ]]; then
    ENV_ARGS+=(--env-file /opt/terma/production/.env)
elif [[ -f /opt/terma/.env.production ]]; then
    ENV_ARGS+=(--env-file /opt/terma/.env.production)
elif [[ -f .env.staging ]]; then
    ENV_ARGS+=(--env-file .env.staging)
elif [[ -f /opt/terma/staging/.env.staging ]]; then
    ENV_ARGS+=(--env-file /opt/terma/staging/.env.staging)
elif [[ -f .env ]]; then
    ENV_ARGS+=(--env-file .env)
elif [[ -f /opt/terma/.env ]]; then
    ENV_ARGS+=(--env-file /opt/terma/.env)
fi

echo "[+] Ensuring SQL Server container (terma-db) is running and healthy..."
docker compose -p terma "${ENV_ARGS[@]}" up -d db

# Wait for healthy database
MAX_RETRIES=30
RETRY_COUNT=0
SQLCMD_BIN=""

while [[ $RETRY_COUNT -lt $MAX_RETRIES ]]; do
    if docker exec terma-db /opt/mssql-tools18/bin/sqlcmd -S localhost -U sa -P "$DB_SA_PASSWORD" -C -Q "SELECT 1" &>/dev/null; then
        SQLCMD_BIN="/opt/mssql-tools18/bin/sqlcmd"
        break
    elif docker exec terma-db /opt/mssql-tools/bin/sqlcmd -S localhost -U sa -P "$DB_SA_PASSWORD" -Q "SELECT 1" &>/dev/null; then
        SQLCMD_BIN="/opt/mssql-tools/bin/sqlcmd"
        break
    fi
    RETRY_COUNT=$((RETRY_COUNT + 1))
    echo "[*] Waiting for SQL Server... (${RETRY_COUNT}/${MAX_RETRIES})"
    sleep 2
done

if [[ -z "$SQLCMD_BIN" ]]; then
    echo "[-] Timeout waiting for SQL Server to become available with SA credentials." >&2
    exit 1
fi

echo "[+] Executing database provisioning and security hardening script..."

SQL_EXTRA_FLAGS=()
if [[ "$SQLCMD_BIN" == *tools18* ]]; then
    SQL_EXTRA_FLAGS+=("-C")
fi

docker exec -i terma-db "$SQLCMD_BIN" -S localhost -U sa -P "$DB_SA_PASSWORD" "${SQL_EXTRA_FLAGS[@]}" -v PROD_PASS="$PROD_DB_PASSWORD" -v STAGING_PASS="$STAGING_DB_PASSWORD" <<'EOSQL'
SET NOCOUNT ON;

-- 1. Create Databases if they do not exist, or ensure AUTO_CLOSE is OFF
IF NOT EXISTS (SELECT name FROM sys.databases WHERE name = N'TermaDb_Production')
BEGIN
    PRINT 'Creating database: TermaDb_Production...';
    CREATE DATABASE [TermaDb_Production];
    ALTER DATABASE [TermaDb_Production] SET AUTO_CLOSE OFF;
    ALTER DATABASE [TermaDb_Production] SET RECOVERY FULL;
    ALTER DATABASE [TermaDb_Production] SET READ_COMMITTED_SNAPSHOT ON;
END
ELSE
BEGIN
    PRINT 'Ensuring TermaDb_Production is ONLINE and AUTO_CLOSE is OFF...';
    ALTER DATABASE [TermaDb_Production] SET AUTO_CLOSE OFF;
    ALTER DATABASE [TermaDb_Production] SET READ_COMMITTED_SNAPSHOT ON;
END
GO

IF NOT EXISTS (SELECT name FROM sys.databases WHERE name = N'TermaDb_Staging')
BEGIN
    PRINT 'Creating database: TermaDb_Staging...';
    CREATE DATABASE [TermaDb_Staging];
    ALTER DATABASE [TermaDb_Staging] SET AUTO_CLOSE OFF;
    ALTER DATABASE [TermaDb_Staging] SET RECOVERY SIMPLE;
    ALTER DATABASE [TermaDb_Staging] SET READ_COMMITTED_SNAPSHOT ON;
END
ELSE
BEGIN
    PRINT 'Ensuring TermaDb_Staging is ONLINE and AUTO_CLOSE is OFF...';
    ALTER DATABASE [TermaDb_Staging] SET AUTO_CLOSE OFF;
    ALTER DATABASE [TermaDb_Staging] SET READ_COMMITTED_SNAPSHOT ON;
END
GO

-- 2. Create / Update Logins with Strong Passwords
IF NOT EXISTS (SELECT name FROM sys.server_principals WHERE name = N'terma_prod_user')
BEGIN
    PRINT 'Creating SQL Login: terma_prod_user...';
    CREATE LOGIN [terma_prod_user] WITH PASSWORD = '$(PROD_PASS)', DEFAULT_DATABASE = [TermaDb_Production], CHECK_POLICY = OFF, CHECK_EXPIRATION = OFF;
END
ELSE
BEGIN
    PRINT 'Updating SQL Login password for terma_prod_user...';
    ALTER LOGIN [terma_prod_user] WITH PASSWORD = '$(PROD_PASS)';
    ALTER LOGIN [terma_prod_user] WITH DEFAULT_DATABASE = [TermaDb_Production], CHECK_POLICY = OFF, CHECK_EXPIRATION = OFF;
    ALTER LOGIN [terma_prod_user] ENABLE;
END
GO

IF NOT EXISTS (SELECT name FROM sys.server_principals WHERE name = N'terma_staging_user')
BEGIN
    PRINT 'Creating SQL Login: terma_staging_user...';
    CREATE LOGIN [terma_staging_user] WITH PASSWORD = '$(STAGING_PASS)', DEFAULT_DATABASE = [TermaDb_Staging], CHECK_POLICY = OFF, CHECK_EXPIRATION = OFF;
END
ELSE
BEGIN
    PRINT 'Updating SQL Login password for terma_staging_user...';
    ALTER LOGIN [terma_staging_user] WITH PASSWORD = '$(STAGING_PASS)';
    ALTER LOGIN [terma_staging_user] WITH DEFAULT_DATABASE = [TermaDb_Staging], CHECK_POLICY = OFF, CHECK_EXPIRATION = OFF;
    ALTER LOGIN [terma_staging_user] ENABLE;
END
GO

-- 3. Configure TermaDb_Production Permissions
USE [TermaDb_Production];
GO

IF NOT EXISTS (SELECT name FROM sys.database_principals WHERE name = N'terma_prod_user')
BEGIN
    CREATE USER [terma_prod_user] FOR LOGIN [terma_prod_user];
END
ALTER ROLE [db_owner] ADD MEMBER [terma_prod_user];
PRINT 'terma_prod_user mapped to TermaDb_Production with db_owner role.';

IF EXISTS (SELECT name FROM sys.database_principals WHERE name = N'terma_staging_user')
BEGIN
    PRINT 'Revoking and dropping terma_staging_user from TermaDb_Production...';
    DROP USER [terma_staging_user];
END
GO

-- 4. Configure TermaDb_Staging Permissions
USE [TermaDb_Staging];
GO

IF NOT EXISTS (SELECT name FROM sys.database_principals WHERE name = N'terma_staging_user')
BEGIN
    CREATE USER [terma_staging_user] FOR LOGIN [terma_staging_user];
END
ALTER ROLE [db_owner] ADD MEMBER [terma_staging_user];
PRINT 'terma_staging_user mapped to TermaDb_Staging with db_owner role.';

IF EXISTS (SELECT name FROM sys.database_principals WHERE name = N'terma_prod_user')
BEGIN
    PRINT 'Revoking and dropping terma_prod_user from TermaDb_Staging...';
    DROP USER [terma_prod_user];
END
GO

PRINT 'Database initialization & user security mapping completed successfully!';
EOSQL

echo "[+] Verifying SQL authentication for terma_prod_user..."
if ! docker exec terma-db "$SQLCMD_BIN" -S localhost -U terma_prod_user -P "$PROD_DB_PASSWORD" "${SQL_EXTRA_FLAGS[@]}" -d TermaDb_Production -Q "SELECT 1" &>/dev/null; then
    echo "[-] CRITICAL: Authentication test for terma_prod_user failed on TermaDb_Production." >&2
    exit 1
fi
echo "[+] Verification successful: terma_prod_user authenticated with db_owner access."

echo "[+] Database and user isolation configured successfully!"
