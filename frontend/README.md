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
│   ├── products/         # Product components, page views, and catalog data
│   ├── cart/             # Cart provider state & checkout preview
│   ├── checkout/         # Checkout client forms & validation
│   └── orders/           # Order status screens
└── lib/                  # Utilities (currency formatting, helpers)
```

## Available Scripts

In the `frontend` directory:

- `npm run dev`: Runs the app in development mode on `http://localhost:3000`.
- `npm run build`: Compiles and builds the production app.
- `npm run start`: Starts Next.js production server.
- `npm run lint`: Runs ESLint check across all files.
- `npm run typecheck`: Runs TypeScript `tsc --noEmit` check.
