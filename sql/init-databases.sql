-- ============================================================================
-- Terma Storefront Database Initialization & Security Hardening Script
-- Single SQL Server Instance with Strictly Isolated Production & Staging DBs
-- ============================================================================

SET NOCOUNT ON;

-- 1. Create Databases if they do not exist
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
    PRINT 'Database TermaDb_Production already exists.';
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
    PRINT 'Database TermaDb_Staging already exists.';
END
GO

-- 2. Create Logins with Strong Passwords passed from environment
-- Note: Passwords are substituted dynamically or set via init script
IF NOT EXISTS (SELECT name FROM sys.server_principals WHERE name = N'terma_prod_user')
BEGIN
    PRINT 'Creating SQL Login: terma_prod_user...';
    CREATE LOGIN [terma_prod_user] WITH PASSWORD = '$(PROD_DB_PASSWORD)', CHECK_POLICY = ON, CHECK_EXPIRATION = OFF;
END
ELSE
BEGIN
    PRINT 'Updating SQL Login password for terma_prod_user...';
    ALTER LOGIN [terma_prod_user] WITH PASSWORD = '$(PROD_DB_PASSWORD)';
END
GO

IF NOT EXISTS (SELECT name FROM sys.server_principals WHERE name = N'terma_staging_user')
BEGIN
    PRINT 'Creating SQL Login: terma_staging_user...';
    CREATE LOGIN [terma_staging_user] WITH PASSWORD = '$(STAGING_DB_PASSWORD)', CHECK_POLICY = ON, CHECK_EXPIRATION = OFF;
END
ELSE
BEGIN
    PRINT 'Updating SQL Login password for terma_staging_user...';
    ALTER LOGIN [terma_staging_user] WITH PASSWORD = '$(STAGING_DB_PASSWORD)';
END
GO

-- 3. Configure TermaDb_Production Permissions (Least Privilege Isolation)
USE [TermaDb_Production];
GO

-- Ensure terma_prod_user exists in TermaDb_Production with db_owner
IF NOT EXISTS (SELECT name FROM sys.database_principals WHERE name = N'terma_prod_user')
BEGIN
    CREATE USER [terma_prod_user] FOR LOGIN [terma_prod_user];
END
ALTER ROLE [db_owner] ADD MEMBER [terma_prod_user];
PRINT 'terma_prod_user mapped to TermaDb_Production with db_owner role.';

-- Strictly ensure terma_staging_user HAS NO ACCESS to TermaDb_Production
IF EXISTS (SELECT name FROM sys.database_principals WHERE name = N'terma_staging_user')
BEGIN
    PRINT 'Revoking and dropping terma_staging_user from TermaDb_Production...';
    DROP USER [terma_staging_user];
END
GO

-- 4. Configure TermaDb_Staging Permissions (Least Privilege Isolation)
USE [TermaDb_Staging];
GO

-- Ensure terma_staging_user exists in TermaDb_Staging with db_owner
IF NOT EXISTS (SELECT name FROM sys.database_principals WHERE name = N'terma_staging_user')
BEGIN
    CREATE USER [terma_staging_user] FOR LOGIN [terma_staging_user];
END
ALTER ROLE [db_owner] ADD MEMBER [terma_staging_user];
PRINT 'terma_staging_user mapped to TermaDb_Staging with db_owner role.';

-- Strictly ensure terma_prod_user HAS NO ACCESS to TermaDb_Staging
IF EXISTS (SELECT name FROM sys.database_principals WHERE name = N'terma_prod_user')
BEGIN
    PRINT 'Revoking and dropping terma_prod_user from TermaDb_Staging...';
    DROP USER [terma_prod_user];
END
GO

PRINT 'Database initialization & user security mapping completed successfully!';
