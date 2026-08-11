# Terma E-Commerce Platform

Terma is an e-commerce platform featuring a luxury Iranian tablecloth storefront built with Next.js App Router and a modular ASP.NET Core 8 Web API backend following Clean Architecture.

## Repository Architecture

This repository strictly separates the frontend and backend applications into independent top-level directories:

```text
Website/
├── frontend/             # Next.js App Router + TypeScript + Tailwind CSS
├── backend/              # ASP.NET Core 8 Web API (Clean Architecture)
├── docs/                 # Architectural & Design System documentation
├── product-content/      # Raw product photography & catalog assets
├── AGENTS.md             # Permanently enforced architectural rules
├── README.md             # Global repository guide
└── .gitignore            # Version control exclusions
```

---

## Quick Start

### 1. Running the Frontend Application

```bash
cd frontend
npm install
npm run dev
```

The storefront will start at `http://localhost:3000`.

**Frontend Commands**:
- `npm run dev`: Start Next.js development server.
- `npm run build`: Build production bundle.
- `npm run lint`: Run ESLint check.
- `npm run typecheck`: Run TypeScript compiler check.
- `npm test`: Run frontend unit and component tests.
- `npm run test:e2e`: Run the Playwright CMS journeys.

See [`frontend/README.md`](file:///d:/Personal/Shop/Website/frontend/README.md) for detailed frontend documentation.

---

### 2. Running the Backend Application

```bash
cd backend
dotnet restore Terma.sln
dotnet run --project src/Terma.Api
```

The Web API will start with Swagger UI accessible at `https://localhost:7090/swagger` or `http://localhost:5242/swagger`.

**Backend Commands**:
- `dotnet build Terma.sln`: Build all backend projects.
- `dotnet test Terma.sln`: Execute unit and integration tests.

The catalog API exposes category and product CRUD, product variants, secure Identity Cookie authentication for the `Admin` role, guest checkout/orders with inventory reservations, promotions, shipping rules, structured store content, contact messages, local media upload, RFC 7807 errors, Swagger, and liveness/readiness health checks. Catalog reads remain public, while writes require an authenticated admin and an antiforgery token. SQL Server is configured through `ConnectionStrings__DefaultConnection`; the API does not migrate or seed the database on startup. The first admin is provisioned separately with the documented `--seed-admin` command.

See [`backend/README.md`](backend/README.md) for setup, migration, endpoint, and architecture details.

The versioned block CMS, its publishing workflow, media rules, API surface, and release checks are documented in [`docs/cms.md`](docs/cms.md).

---

## Content & Assets

- **Deliverable Web Assets**: Located in `frontend/public/images/`.
- **Raw Product Materials**: Located in `product-content/` (includes raw photos and info text files).
- **Design System Specs**: Located in `docs/design-system/`.
