# Terma Project Instructions & Architecture Rules

## Mandatory Architectural Rules

1. **Strict Decoupling**: `frontend/` and `backend/` MUST ALWAYS remain completely separate top-level applications. This rule is permanent and must be preserved across all future updates.
2. **Root Repository Structure**:
   ```text
   Website/
   ├── frontend/             # Next.js App Router storefront
   ├── backend/              # ASP.NET Core Clean Architecture API
   ├── docs/                 # System & design documentation
   ├── product-content/      # Raw product photography & catalog assets
   ├── AGENTS.md             # Architecture rules for AI agents
   ├── README.md             # Global repository overview & execution instructions
   └── .gitignore            # Git exclusion definitions
   ```
3. **No Shared Root Source**: Do NOT create a shared root-level `src/` directory. Do not place backend code inside `frontend/` or frontend code inside `backend/`. Do not share dependencies, configuration, or runtime artifacts between frontend and backend.

---

## Frontend Architecture (`frontend/`)

- Built with **Next.js App Router**, **TypeScript**, and **Tailwind CSS**.
- Follows a **Feature-based architecture**:
  ```text
  frontend/src/
  ├── app/                  # Thin route files and boundary components only
  ├── components/
  │   ├── layout/           # Shared structural components (Header, Footer, Container)
  │   └── ui/               # Reusable UI primitives (Button, Icons, SectionHeader)
  ├── features/
  │   ├── products/         # Product components, page views, and catalog data
  │   ├── cart/             # Cart provider, cart page, and cart interactions
  │   ├── checkout/         # Checkout page client and forms
  │   └── orders/           # Order status display
  └── lib/                  # Framework-independent utilities
  ```
- **Server Components by default**: Use Client Components (`"use client"`) only where interactive browser state requires it.
- **Route Discipline**: Keep route files in `src/app` thin. Business and domain logic must live inside feature modules in `src/features`.
- **Assets**: Keep raw product photography and non-runtime files in `product-content/`. Web-optimized deliverable media belongs strictly in `frontend/public/`.

---

## Backend Architecture (`backend/`)

- Built with **ASP.NET Core .NET 8 Web API** following **Clean Architecture**:
  ```text
  backend/
  ├── src/
  │   ├── Terma.Domain/          # Core entities, value objects, domain rules (Zero dependencies)
  │   ├── Terma.Application/     # Use cases, DTOs, queries/commands, interfaces
  │   ├── Terma.Infrastructure/  # EF Core DbContext, repository implementations, DB configurations
  │   └── Terma.Api/             # Web API controllers, dependency injection composition, OpenAPI
  ├── tests/
  │   ├── Terma.UnitTests/       # Domain & Application unit tests
  │   └── Terma.IntegrationTests/# Web API integration tests (Microsoft.AspNetCore.Mvc.Testing)
  └── Terma.sln
  ```
- **Dependency Hierarchy**:
  - `Terma.Domain` has NO dependencies on any other project or infrastructure package.
  - `Terma.Application` depends ONLY on `Terma.Domain`.
  - `Terma.Infrastructure` depends on `Terma.Application` and `Terma.Domain`.
  - `Terma.Api` depends on `Terma.Application` and `Terma.Infrastructure`.
  - `Domain` and `Application` MUST NOT depend on ASP.NET Core, EF Core, SQL Server, controllers, HTTP, or infrastructure details.
- **No Controller Business Logic**: Business logic must reside in `Terma.Application` or `Terma.Domain`.

---

## Change Discipline & Validation

- Inspect existing structure and conventions before adding files.
- Run validation suites before committing structural changes:
  - **Frontend**: `npm install`, `npm run lint`, `npm run typecheck`, `npm run build`
  - **Backend**: `dotnet restore`, `dotnet build`, `dotnet test`
- Do not commit generated build outputs (`.next`, `bin/`, `obj/`, `*.tsbuildinfo`), test screenshots/logs, or local environment `.env` files.
