# Terma Storefront (Frontend)

The Terma e-commerce storefront is built using Next.js App Router, TypeScript, and Tailwind CSS.

## Architecture

The frontend follows a feature-based folder layout inside `src/`:

```text
frontend/src/
├── app/                  # Thin route components and Next.js boundary files
├── components/
│   ├── layout/           # Shared structural elements (Header, Footer, Container)
│   └── ui/               # Reusable UI primitives (Button, Icons, SectionHeader)
├── features/
│   ├── products/         # Product components, API DTO mapping, and catalog data access
│   ├── cart/             # Cart provider state & checkout preview
│   ├── checkout/         # Checkout client forms & validation
│   └── orders/           # Order status screens
└── lib/                  # Utilities (currency formatting, helpers)
```

## Backend API

Copy `.env.example` to `.env.local`, then set the public base URL for the separately running backend:

```env
NEXT_PUBLIC_API_BASE_URL=http://localhost:5242
```

The storefront reads categories and products from `/api/categories` and `/api/products`. Product images use a local placeholder until image upload is implemented. Do not put credentials in this variable or commit `.env.local`.

Start the ASP.NET Core API from the separate `backend/` application before opening API-backed pages. The backend development CORS policy allows `http://localhost:3000` by default.

## Available Scripts

In the `frontend` directory:

- `npm run dev`: Runs the app in development mode on `http://localhost:3000`.
- `npm run build`: Compiles and builds the production app.
- `npm run start`: Starts Next.js production server.
- `npm run lint`: Runs ESLint check across all files.
- `npm run typecheck`: Runs TypeScript `tsc --noEmit` check.
