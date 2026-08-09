# Terma backend architecture

## Boundary and dependency rules

The backend is a separate top-level application under `backend/`. It shares no source, packages, configuration, or runtime artifacts with `frontend/`.

```text
Terma.Api -> Terma.Application
Terma.Api -> Terma.Infrastructure
Terma.Infrastructure -> Terma.Application -> Terma.Domain
Terma.Infrastructure -> Terma.Domain
```

- Domain owns `Category`, `Product`, UTC lifecycle timestamps, SKU normalization, and core invariants. It has no framework or persistence dependency.
- Application owns DTOs, FluentValidation rules, AutoMapper profiles, catalog use cases, pagination, exceptions, and focused repository interfaces.
- Infrastructure owns SQL Server EF Core configuration, queries, repository implementations, unique-conflict translation, and migrations.
- API owns controllers and HTTP concerns. Controllers call application services and contain no catalog business logic.

ASP.NET Core Identity is implemented in Infrastructure and uses the existing `TermaDbContext`; Domain and Application remain free of Identity, ASP.NET Core, and EF Core dependencies. The API owns Cookie, authorization, CORS, antiforgery, and HTTP error behavior.

## Catalog behavior

Each product belongs to one category. Product SKU is trimmed, uppercased, checked before writing, and protected by a unique SQL index for concurrent requests. Price is decimal toman; length and width are decimal centimeters.

Category and product DELETE operations are idempotent soft deletes. They preserve the row and set `IsActive=false`. PUT can reactivate rows. Deactivating a category does not modify its products, but active product queries require both the product and its category to be active.

Product listings perform filtering and pagination in SQL. The default is page 1, 20 items, active records only, with deterministic name/ID ordering. Specific ID lookups can return inactive records.

## HTTP and operational behavior

Application and domain exceptions are translated centrally into RFC 7807 responses: validation `400`, missing resources `404`, duplicate SKU `409`, and unexpected failures `500`. Responses include a request trace identifier.

The host configures CORS for the independent frontend, Swagger in Development, a dependency-free liveness endpoint, and SQL Server readiness. It registers DbContext but never opens, migrates, deletes, or seeds a database during startup.

Public GET catalog operations are anonymous. Catalog POST, PUT, and DELETE operations use the `AdminOnly` policy and require the `Admin` role. Authentication uses a host-only, secure, HttpOnly cookie with a fixed 30-minute lifetime and no sliding renewal. Production uses the `__Host-` prefix and always requires HTTPS; Development uses separate localhost cookie names and `SameAsRequest` so the documented HTTP development URL remains usable. Unsafe requests also require an antiforgery cookie plus the `X-CSRF-TOKEN` request token. Cookie authentication returns API-friendly RFC 7807 `401` and `403` responses instead of browser redirects.

## Persistence and testing

EF Core configurations define table constraints, indexes, decimal precision, and the restricted category foreign key. The checked-in `InitialCatalog` migration creates the schema but no catalog rows.

Unit tests cover domain and application rules with xUnit and Moq. Integration tests replace SQL Server with one open SQLite in-memory connection and exercise the real ASP.NET Core pipeline. On Windows they use the operating system's managed SQLite library rather than bundling a vulnerable native SQLite binary. SQLite is used because it preserves relational constraints better than EF Core's non-relational in-memory provider.

## Future phases

The backend now keeps the public catalog separate from the authenticated admin operations API. Product variants, media metadata, guest customers, orders with inventory reservations, promotions, shipping rules, structured content and contact messages are persisted in SQL Server. Checkout recalculates prices and available stock on the server and uses an idempotency key. Product media is served through an opaque key and a configurable storage abstraction. Payment gateways, customer accounts, MFA, multi-admin permissions, accounting, tax, SMS and email providers remain outside this slice.
