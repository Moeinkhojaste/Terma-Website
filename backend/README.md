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

## Run the API

```powershell
dotnet run --project src/Terma.Api --urls http://localhost:5242
```

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

Product listing supports `categoryId`, `minPrice`, `maxPrice`, `tableCapacity`, `isActive`, `search`, `page`, and `pageSize`. It returns `items`, `page`, `pageSize`, `totalCount`, and `totalPages`. Page size is limited to 100.

Deletes are soft deletes. They set `IsActive` to `false`; PUT can reactivate a record. Active product listings also hide products whose category is inactive. Errors use RFC 7807 Problem Details, and validation errors include an `errors` object.

The separate Next.js frontend can call this API using its own environment-based API base URL. CORS origins are configured under `Cors:AllowedOrigins`; no frontend source code is coupled to this backend.

## Intentionally Postponed

Authentication and user accounts, persistent shopping carts, orders, payment gateways, shipping calculation, admin authorization, product image upload, notifications, discounts, and coupons are future phases.
