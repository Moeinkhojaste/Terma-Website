# Terma Backend API

The backend is an independent ASP.NET Core 8 Web API. It uses Clean Architecture, Entity Framework Core, SQL Server, FluentValidation, AutoMapper, Swagger, xUnit, Moq, and SQLite-backed integration tests.

## Projects

```text
backend/
|-- src/
|   |-- Terma.Domain/          # Entities and domain rules; no project dependencies
|   |-- Terma.Application/     # Use cases, DTOs, validators, mapping, repository contracts
|   |-- Terma.Infrastructure/  # EF Core, SQL Server, repositories, migrations
|   `-- Terma.Api/             # Controllers, middleware, health checks, Swagger, CORS
|-- tests/
|   |-- Terma.UnitTests/
|   `-- Terma.IntegrationTests/
`-- Terma.sln
```

Project references point inward: Domain <- Application <- Infrastructure <- API. The API also references Application directly. Frontend and backend dependencies are never shared.

## Configuration

`ConnectionStrings:DefaultConnection` is required. The committed configuration uses a safe Windows LocalDB development connection with no password. Override it without editing tracked files:

```powershell
$env:ConnectionStrings__DefaultConnection = 'Server=YOUR_SERVER;Database=TermaDb;Trusted_Connection=True;TrustServerCertificate=True'
$env:Cors__AllowedOrigins__0 = 'http://localhost:3000'
```

Prices are stored in Iranian toman. Product length and width are stored in centimeters. All timestamps are UTC.

Admin authentication uses an encrypted ASP.NET Core Identity cookie. The frontend origin must be listed explicitly under `Cors:AllowedOrigins`; wildcard origins are not allowed with credentials. Production uses HTTPS-only `__Host-` cookies and must persist ASP.NET Core Data Protection keys outside an ephemeral instance. Development uses separate localhost cookies so the documented `http://localhost:5242` URL works without weakening production settings.

## Restore, Build, and Test

Run from `backend/`:

```powershell
dotnet tool restore
dotnet restore Terma.sln
dotnet build Terma.sln
dotnet test Terma.sln
```

Integration tests use an isolated SQLite in-memory database with the Windows-managed SQLite library. They do not need SQL Server or production credentials.

## Migrations

The repository-local EF Core 8 tool avoids conflicts with global tool versions:

```powershell
dotnet tool restore
dotnet ef migrations list --project src/Terma.Infrastructure --startup-project src/Terma.Api
dotnet ef database update --project src/Terma.Infrastructure --startup-project src/Terma.Api
```

`database update` changes the configured database, so run it only against the intended environment. The API never migrates or seeds a database during startup.

Apply the Identity migration, then provision or reset the admin account with a separate command. Keep the password out of tracked configuration and command history:

```powershell
$env:AdminSeed__Email = 'admin@example.com'
$env:AdminSeed__Password = 'replace-with-a-strong-password'
dotnet run --project src/Terma.Api -- --seed-admin
Remove-Item Env:AdminSeed__Email, Env:AdminSeed__Password
```

The password must contain at least 12 characters, uppercase and lowercase letters, a number, and a symbol. Running the command again updates that account's password and ensures it has the `Admin` role. Normal API startup never creates an account.

## Run the API

```powershell
dotnet run --project src/Terma.Api --urls http://localhost:5242
```

The checked-in `http` launch profile sets `ASPNETCORE_ENVIRONMENT=Development`, so this command supports the HTTP localhost frontend and development cookies. Production deployments must set their environment explicitly and use HTTPS.

Development URLs:

- Swagger UI: `http://localhost:5242/swagger`
- Liveness: `GET http://localhost:5242/health/live`
- Readiness: `GET http://localhost:5242/health/ready`

Liveness does not access the database. Readiness returns `503 Service Unavailable` when SQL Server cannot be reached. Therefore the process and Swagger can start even when the database is unavailable.

## API Summary

Categories:

- `GET /api/categories?isActive=true`
- `GET /api/categories/{id}`
- `POST /api/categories`
- `PUT /api/categories/{id}`
- `DELETE /api/categories/{id}`

Products:

- `GET /api/products`
- `GET /api/products/{id}`
- `POST /api/products`
- `PUT /api/products/{id}`
- `DELETE /api/products/{id}`

Authentication:

- `GET /api/auth/antiforgery`
- `POST /api/auth/login`
- `GET /api/auth/me`
- `POST /api/auth/logout`

Category and product GET endpoints remain public. Their POST, PUT, and DELETE endpoints require the fixed 30-minute admin cookie, the `Admin` role, and the antiforgery token in the `X-CSRF-TOKEN` header. Browser clients must send requests with credentials enabled. Missing or expired authentication returns `401`; a signed-in non-admin returns `403`; an invalid antiforgery token returns `400`. Authentication failures use RFC 7807 Problem Details, and five failed password attempts lock the account for 15 minutes.

Product listing supports `categoryId`, `minPrice`, `maxPrice`, `tableCapacity`, `isActive`, `search`, `page`, and `pageSize`. It returns `items`, `page`, `pageSize`, `totalCount`, and `totalPages`. Page size is limited to 100.

Deletes are soft deletes. They set `IsActive` to `false`; PUT can reactivate a record. Active product listings also hide products whose category is inactive. Errors use RFC 7807 Problem Details, and validation errors include an `errors` object.

The separate Next.js frontend can call this API using its own environment-based API base URL. CORS origins are configured under `Cors:AllowedOrigins`; no frontend source code is coupled to this backend.

## Store operations

The admin API now includes the dashboard, products, categories, guest customers, orders, promotions, shipping rules, structured content, contact messages and local media upload. Public checkout uses the server as the source of truth for prices and stock and creates a 24-hour inventory reservation. Send an `Idempotency-Key` header when creating an order so a retry cannot create a duplicate.

Apply all migrations before starting the API:

```powershell
dotnet ef database update --project src/Terma.Infrastructure --startup-project src/Terma.Api
```

Product images are stored under `MediaStorage:RootPath` (default `media`) and are served through `/api/media/{key}`. In production, use a persistent volume and back it up together with SQL Server. The storage interface is isolated so an object-storage provider can be added later.

The payment gateway, MFA, customer accounts, multi-admin permissions, accounting, tax calculation, SMS and email notifications are intentionally not included. Orders are stored and managed as unpaid coordination requests until a gateway is selected.
