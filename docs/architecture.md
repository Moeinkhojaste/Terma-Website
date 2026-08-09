# Terma storefront architecture

## Audit and target structure

Before this reorganization, shared UI was already separated into `src/components/ui` and `src/components/layout`, but product code was split between `src/features/catalog` and `src/data/catalog`. The main, catalog, and product-detail routes also contained their full page implementations.

The current structure is:

```text
src/
  app/                         # thin Next.js route and boundary files
  components/
    ui/                        # reusable UI primitives
    layout/                    # shared structural components
  features/
    products/
      components/              # product page, card, carousel
      data/                    # temporary product catalog data
    cart/                      # cart state and UI
    checkout/                  # checkout UI and submission flow
    orders/                    # order status UI
  lib/                         # framework-independent utilities
```

## Routes preserved

The existing storefront routes remain unchanged: `/`, `/products`, `/products/[id]`, `/cart`, `/checkout`, `/order/success`, `/order/failed`, `/order/cancelled`, and `/style-guide`.

## Deliberate omissions

No `src/config`, `src/mocks`, `tests`, backend, admin, authentication, payment integration, monorepo structure, barrel files, or speculative directories were added because this repository currently has no code that needs them. The existing product data remains temporary feature-owned data until a real data source is introduced.
