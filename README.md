# Bloom Health & Wellness — frontend completion

A React + TypeScript interactive frontend for the customer, seller and admin flows in the written project brief and Context Diagram. The pink reference defines the visual theme only. The application implements the marketplace and wellness-content scope; face analysis, AI chat, styling and diagnosis are not part of this project.

## Run and check

```sh
npm install
npm run dev
npm test
npm run build
```

`npm test` runs the domain, buyer-navigation, management-report, wellness and frontend-validation suites. `npm run build` runs TypeScript checking and Vite production packaging. Browser observations and any remaining verification limits are recorded separately in [docs/VERIFICATION.md](docs/VERIFICATION.md); source implementation and automated tests do not establish browser or external-service coverage by themselves.

A requirement-to-module map is available in [docs/FRONTEND_SCOPE.md](docs/FRONTEND_SCOPE.md).

## Customer flows

- Responsive storefront, product search, category/shop/price filters, sorting, product details, public store profiles and account-specific wishlist.
- Product-detail deep links preserve the current shopping context; navigation and browser Back can return from the detail view. Unavailable product/order/article links have explicit empty states.
- Local demonstration registration, login, logout, profile editing and password changes, with show/hide password controls. Login from checkout retains the purchasing flow.
- Address book with a default shipping address; account-specific carts and wishlists. Guest sign-in merges the guest cart into the selected account.
- Shared checkout calculations for per-shop shipping and promotions. Multi-shop carts become separate store orders with stable product, price and image snapshots.
- Simulated payment or payment-proof image selection, proof-rejection feedback and resubmission. This does not charge money.
- Searchable order history by order number, product, shop or tracking reference, with date/status filters and chronological sorting.
- Order-detail deep links, timestamped status events, tracking-number display/copy, pending-order cancellation, delivery confirmation and printable sample receipts.
- Reviews for each purchased, delivered product, seller replies and notifications that open the relevant order.

## Seller and admin interfaces

### Sellers

- Shop applications with admin approval, rejection reasons and resubmission. Seller accounts retain ordinary purchasing features.
- Product creation/editing, uploaded or sample images, pricing and stock. Removing a listing archives it from sale while preserving past order information.
- Existing-order preparation and shipment updates, payment-status filters and order-detail deep links.
- Sales history with date/status filters, paid-order summaries and CSV export. Summaries distinguish item sales after discounts, shipping, collected totals, pending payment and simulated refunds.
- Shop details, shipping fee and free-shipping threshold reflected in checkout.
- Shop-specific promotions with date ranges, minimum spend, discount caps and usage limits.
- Product-review replies and stock movement history/export.
- Suspended shops stop accepting new sales while retaining access to fulfill existing orders.

### Admin

- Search/filter members by contact information, role and account status; view member details and purchase totals; export the filtered list; confirm account blocking/reactivation.
- Approve/reject/suspend/reactivate shops, manage products and inspect orders across stores.
- Approve or reject payment proofs with a reason. Cancelling a paid order creates a separate simulated-refund step.
- Category creation/editing/visibility and deletion when no product references remain.
- Site-wide and shop promotions; review moderation with reasons and consistent public rating/count updates.
- Date/status/shop filters for sales history, per-shop breakdowns and report exports.
- Editable health articles, food/calorie records, meal templates and seven-day exercise templates.
- Site title/notice settings, stock history, local page-usage counts and management audit history.
- Dashboard section/order deep links retain the selected management context across reloads and navigation.

## Wellness content and personal records

Published articles and active food/template records come from admin-managed content. The journal supports text search, categories, bookmarks and individual article links. Unpublished or missing article links show an unavailable state.

Customers can keep a meal diary, apply meal templates, edit an exercise schedule, mark activities complete and record optional height, weight and a self-written goal. Personal wellness data is separated by account. Logged meals retain name, portion and calorie snapshots, so later catalogue edits do not rewrite historical entries. Copied exercise templates also remain independent of later CMS edits.

Wellness storage validates saved records, preserves usable data and backs up malformed originals before a successful replacement. Write failures retain visible feedback instead of a saved-success message. Meal-template activation checks unavailable foods; disabling an already-referenced food leaves existing templates present but unavailable for new use until corrected.

Nutrition values, schedules and products are demonstration content. The health profile records the user's own entries; it does not calculate BMI, prescribe calories or generate personalized health advice.

## Image handling and recovery

- Image selection checks the declared format, file size, file signature and browser decoding for JPG, PNG, WebP and GIF files up to 1 MB.
- Upload controls expose progress/errors, support replacement/removal, and ignore stale results after cancellation or a newer selection. Relevant save/checkout actions wait while an image is being read.
- The shared state layer exposes a persistent storage warning, retry controls and backup download when reading or writing local data fails.
- A React error boundary provides a recovery screen instead of leaving an unhandled render failure as a blank page. Reloading does not deliberately clear stored data.

These controls improve the prototype's behavior; uploaded files still require independent server-side validation and durable storage in production.

## Prototype boundaries

**This is a frontend prototype with browser-local persistence. No Node.js/TypeScript backend, database service, payment processor or courier integration is deployed.** Data and selected sample images remain in localStorage and are not synchronized between users, devices or browsers. Compatible earlier shopping records are migrated into the current state shape.

Demo role buttons deliberately switch among customer, seller and admin sample accounts. Local password checks, role checks, ownership rules and account buckets demonstrate the intended flow. Browser storage is editable by its owner, so these controls are not production authentication or an authorization boundary. Use sample credentials and personal data. No real payment is charged or refunded, and tracking numbers do not query a carrier.

Usage and audit screens describe activity within the local demo state. They are not production visitor analytics or tamper-resistant audit logs. Sales figures describe the orders represented in this prototype, not profit, tax accounting, marketplace settlement or bank reconciliation.

## Node.js + TypeScript handoff

The implementation separates presentation, local persistence and domain operations:

- `src/store.tsx` and `src/persistence.ts` adapt shared browser-local state to React.
- `src/actions.ts` contains shared operations and flow validation.
- `src/domain.ts` contains checkout, account switching, availability, rating and migration rules.
- `src/types.ts` and `src/contentTypes.ts` define commerce and content contracts.
- `src/wellnessState.ts` contains personal-record validation/recovery and journal filtering.
- `src/buyerNavigation.ts` and `src/managementReports.ts` contain navigation, history filtering, reporting and export helpers.

Use those contracts to design the future Node.js/TypeScript API, then replace local operations with authenticated requests. The server must derive the actor from a secure session, enforce role/ownership rules, recompute order totals and transact stock, coupon usage and order creation together. Persist records in a database, store images through a validated upload service, and connect real payments, refunds and courier events through server integrations. See the boundary table in `docs/FRONTEND_SCOPE.md`.

No API endpoints or production server are implemented or implied. The local role switch and password-hash approach must not be reused as production authentication.

## Source structure

| File | Purpose |
| --- | --- |
| `src/App.tsx` | Storefront, customer accounts, addresses, checkout, order history, public stores and applications |
| `src/buyerNavigation.ts`, `src/BuyerPasswordField.tsx` | Customer deep links/history filters and accessible password controls |
| `src/Dashboard.tsx` | Seller/admin overview, products, orders, report controls and management navigation |
| `src/MembersManager.tsx` | Member search, filters, details, exports and status confirmations |
| `src/ManagementPanels.tsx` | Categories, promotions, reviews, shops, stock history, usage and settings |
| `src/OrderInspector.tsx`, `src/managementReports.ts` | Management order details, payment/shipment actions, filtered report calculations and CSV output |
| `src/ContentManager.tsx`, `src/contentValidation.ts` | CMS editors and shared content validation |
| `src/Wellness.tsx`, `src/wellnessState.ts` | Nutrition diary, exercise schedules, articles, personal profile and persistence validation |
| `src/store.tsx`, `src/persistence.ts`, `src/actions.ts`, `src/domain.ts` | Shared local-state adapter, operations, recovery and reusable domain rules |
| `src/imageUpload.ts`, `src/useImageUpload.ts` | Validated local image reading and asynchronous control state |
| `src/ErrorBoundary.tsx` | Render-error recovery screen |
| `src/components.tsx` | Shared interface components |
| `src/data.ts`, `src/contentSeed.ts` | Demonstration commerce and wellness records |
| `src/types.ts`, `src/contentTypes.ts` | Shared TypeScript contracts |
| `tests/*.test.mjs` | Automated behavioral scenarios |
| `docs/FRONTEND_SCOPE.md`, `docs/VERIFICATION.md` | Requirement mapping, implementation boundaries and observed verification |
| `public/images` | Project hero and product-atlas assets |

## Asset provenance

Two project-bound images were generated using built-in ImageGen: a blush wellness-product still-life hero and a 3-by-2 catalogue atlas featuring a vitamin jar, serum, yoga mat, plant protein, grain bowl and water bottle. Product and brand imagery is fictional. Local fonts are Noto Sans Thai and OpenAI Sans supplied in the environment.
