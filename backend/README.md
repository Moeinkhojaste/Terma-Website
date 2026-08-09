# Terma API (Backend)

The Terma backend is built using ASP.NET Core and .NET 8 Web API, adhering to **Clean Architecture** principles.

## Clean Architecture Layers

```text
backend/
├── src/
│   ├── Terma.Domain/          # Core entities, value objects, domain rules (Zero dependencies)
│   ├── Terma.Application/     # Use cases, DTOs, queries/commands, interfaces
│   ├── Terma.Infrastructure/  # EF Core DbContext, entity configurations, DB access
│   └── Terma.Api/             # Web API controllers, dependency injection composition, OpenAPI
├── tests/
│   ├── Terma.UnitTests/       # Domain & Application unit tests
│   └── Terma.IntegrationTests/# Web API integration tests (Microsoft.AspNetCore.Mvc.Testing)
└── Terma.sln
```

### Dependency Rules

- **`Terma.Domain`**: Pure domain logic. Does not depend on any other project or framework.
- **`Terma.Application`**: Application services and use cases. Depends only on `Terma.Domain`.
- **`Terma.Infrastructure`**: EF Core persistence and external adapters. Depends on `Terma.Application` and `Terma.Domain`.
- **`Terma.Api`**: API controllers and composition root (`Program.cs`). Depends on `Terma.Application` and `Terma.Infrastructure`.

---

## Build & Execution Instructions

### 1. Restore Dependencies & Build Solution

```bash
dotnet restore Terma.sln
dotnet build Terma.sln
```

### 2. Run All Tests

```bash
dotnet test Terma.sln
```

### 3. Run the API Server

```bash
dotnet run --project src/Terma.Api
```

Swagger UI will be available at:
- `https://localhost:7090/swagger`
- `http://localhost:5242/swagger`

### Endpoints:
- `GET /health`: Returns 200 OK service health status.
- `GET /api/products`: Returns list of active products from domain/application query.
