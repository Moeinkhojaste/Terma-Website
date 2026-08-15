# Terma CMS

Terma CMS is a versioned, block-based content system. It manages public pages and global site settings without allowing raw HTML, CSS, JavaScript, or iframes.

## Scope

- Pages, SEO, header, menus, footer, contact details, announcements, and media are managed in `/admin/content`.
- Products, categories, orders, checkout, inventory, and payments remain in their dedicated modules.
- `home`, `about`, `contact`, and `site-settings` are protected system pages.
- Custom pages are rendered at root paths such as `/privacy`. Store routes keep priority over the dynamic CMS route.

## Content lifecycle

Each save creates an immutable `CmsRevision`. A `CmsPage` points to its current draft and published revisions. Saving a draft never changes the public site. The supported states are `Draft`, `Scheduled`, `Published`, and `Archived`.

Admin updates use the page row version through the `If-Match` header. A stale edit receives HTTP `412 Precondition Failed`, so another admin's changes are not silently overwritten. Scheduled timestamps are stored as UTC and the editor converts Tehran time to UTC before sending it. A background service publishes due revisions safely.

## Blocks

Schema version 1 supports: hero, announcement, rich text, image and text, feature cards, FAQ, call to action, contact information, link lists, product showcase, and category links. Rich text is stored as Tiptap JSON and rendered without raw HTML.

## Main endpoints

Public:

- `GET /api/store/cms/site`
- `GET /api/store/cms/pages/{slug}`
- `GET /api/media/{key}`

Admin endpoints are under `/api/admin/cms`. Mutations require the existing admin cookie and antiforgery token. Page mutations also require `If-Match`.

## Media safety

The media library accepts verified JPEG, PNG, and WebP files up to 10 MB. Deletion is blocked while an asset is referenced by a current draft or published revision. Storage stays behind `IMediaStorage`, with local storage used for development.

## Migration and initial content

The EF Core migration `AddVersionedCms` creates the CMS tables. Startup migration then runs the idempotent CMS seeder. The seeder creates initial published system pages and copies relevant legacy `StoreContent` title/body values when available. The legacy content API remains temporarily available as a compatibility adapter.

## Validation

Run these commands before release:

```powershell
cd backend
dotnet restore Terma.sln
dotnet build Terma.sln -c Release
dotnet test Terma.sln -c Release

cd ../frontend
npm install
npm run typecheck
npm run lint
npm test
npm run build
npm run test:e2e
```

Playwright requires a running isolated API/database and frontend configured by the environment variables documented in `frontend/playwright.config.ts`.
