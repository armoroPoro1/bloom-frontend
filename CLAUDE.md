# Bloom Health & Wellness — Claude handoff

## Start here

This is an existing React + TypeScript frontend. Continue this project; preserve its working pink interface and customer, seller, admin and wellness flows.

Read these files before changing code:

1. `START_HERE_TH.md` — Thai quick start and handoff summary.
2. `README.md` — implemented features, structure and prototype boundaries.
3. `docs/FRONTEND_SCOPE.md` — the written requirements and Context Diagram mapped to implementation.
4. `docs/VERIFICATION.md` and `docs/HANDOFF_VERIFICATION.md` — observed tests, limitations and export checks.
5. `src/types.ts`, `src/contentTypes.ts`, `src/domain.ts`, `src/actions.ts` — current contracts and behavior.

Base source commit: `563a659eee0e25cdb8b1a21516345b2fcccea05d`.
This export adds handoff documentation; it does not change application code.

## User requirements and design decisions

- The frontend is React. The future backend must use Node.js and TypeScript.
- The pink reference defines visual styling only. The user's written features and HealthShop Context Diagram define scope.
- Do not introduce face analysis, AI chat, fashion, makeup advice, diagnosis or other features merely because they appeared in the theme reference.
- Keep Thai interface copy and the pink Bloom branding.
- A seller remains able to buy from other stores.
- A regular member applies to become a seller; admin approval precedes Seller Center access.
- Required marketplace features include accounts, catalog/search, cart, checkout, payment, order history/tracking, reviews, seller management and admin management.
- The Context Diagram also includes promotions, articles, foods/calories, meal plans, exercise schedules and personal health records.
- Preserve responsive layouts, accessible dialogs, validation, empty/error states and recovery paths.

The user has not selected a Node framework, database, ORM, payment provider or courier provider. Treat these choices and any endpoint/schema examples as proposals, not as existing configuration.

## Current state

The frontend is implemented and uses browser-local demonstration persistence. There is no production Node API, shared database, real payment/refund processor, durable upload service or courier integration in this package.

Demo role switching, local password hashing, local ownership checks and account buckets illustrate intended flows. They are not production authentication or authorization. Never present them as a security boundary.

Payment and refund actions are simulated. Tracking references display locally and do not query a carrier. Sample products, wellness content, people and transactions are demonstration data.

## Run

The export was verified in Node.js `v24.22.1`. Use a compatible modern Node runtime; the exact versions installed by npm are captured in `package-lock.json`.

```sh
npm ci
npm run dev
npm test
npm run build
npm run preview
```

Run commands from the directory containing `package.json`. Open the local URL Vite prints. `preview` serves the output after a build.

No `.env` or API key is needed for the current frontend. The first dependency installation requires access to the npm registry. Dependencies and compiled output are intentionally not bundled.

Use the demo role controls to explore buyer, seller and admin views. All changes are local to that browser/origin; opening another port or browser does not share the same stored data.

## Architecture map

| Area | Files |
| --- | --- |
| Customer pages and checkout | `src/App.tsx`, `src/buyerNavigation.ts`, `src/BuyerPasswordField.tsx` |
| Seller/admin pages | `src/Dashboard.tsx`, `src/ManagementPanels.tsx`, `src/MembersManager.tsx`, `src/OrderInspector.tsx` |
| Reporting and CSV | `src/managementReports.ts` |
| React state and shared local persistence | `src/store.tsx`, `src/persistence.ts` |
| Local operations and pure domain rules | `src/actions.ts`, `src/domain.ts` |
| Commerce/content types | `src/types.ts`, `src/contentTypes.ts` |
| Wellness pages and per-account/week records | `src/Wellness.tsx`, `src/wellnessState.ts` |
| Content administration | `src/ContentManager.tsx`, `src/contentValidation.ts` |
| Local image handling | `src/imageUpload.ts`, `src/useImageUpload.ts` |
| Shared UI/recovery | `src/components.tsx`, `src/ErrorBoundary.tsx` |
| Demonstration seed | `src/data.ts`, `src/contentSeed.ts` |
| Behavioral tests | `tests/*.test.mjs` |
| Images and fonts | `public/images/`, `public/fonts/` |

Personal wellness persistence is separate from the shared commerce store. A backend migration must handle both.

## Recommended backend sequence

This is a continuation plan, not a claim that these services exist.

1. Establish a Node.js/TypeScript service, configuration, validation, database migrations and API error contract.
2. Add server accounts and sessions, secure password storage, password change/recovery, and server-derived role/ownership checks. Connect current account forms.
3. Persist members, addresses, seller applications, shops, categories, products and uploads. Connect the existing screens through a typed API layer.
4. Implement transactional checkout, order snapshots, stock movements, coupon usage and idempotency before integrating real money.
5. Implement order/payment/proof/refund/fulfilment transitions and server notifications. Add provider integrations only when selected and configured.
6. Persist reviews, reports, site settings, CMS and account-owned wellness records. Add durable audit events.
7. Run existing tests and add server tests for authorization, concurrent checkout, idempotency and integration boundaries. Recheck the buyer → admin → seller → buyer flow in the UI.

An API adapter can preserve the current UI while replacing local operations. Design asynchronous loading, mutation errors and retries explicitly; do not simply replace a synchronous local function without updating its callers.

## Invariants to preserve and enforce on the server

- Derive the actor from an authenticated session. Do not trust a request's user ID, role, shop ID or browser storage.
- A seller can manage their own store only. Admin access must be checked server-side.
- Recompute prices, discounts, shipping and eligibility on the server. Never trust the client checkout total.
- Create store-specific orders, immutable product/price/image/address snapshots, stock deductions and coupon usage atomically. Prevent overselling and duplicate submissions.
- A coupon use currently counts once per checkout, including a checkout split into multiple store orders.
- Keep payment status, fulfilment status and refund obligations distinct. Cancelling a paid order does not mean a refund has occurred.
- Repeated cancellation must not restore stock twice. Payment callbacks and refund requests need idempotency.
- Archive removed listings to preserve historical orders. Product edits must not rewrite order snapshots.
- Suspended shops stop accepting new sales but may complete existing orders.
- Preserve delivered-purchase review eligibility, duplicate prevention, seller replies and moderation effects on public ratings.
- Keep carts, wishlists, addresses, personal diary/profile/schedules and bookmarks scoped to their owner.
- Preserve logged meal name/portion/calorie snapshots and copied exercise schedules when source content changes.
- Current reports filter by Bangkok order-creation date. Their figures are not profit, tax accounting or settlement calculations.
- Use integer minor units or an appropriate database decimal type for money, with explicit rounding rules.
- Validate uploads independently on the server and apply ownership/access rules to payment proofs. Client validation is for interaction quality.
- Keep private credentials server-side; browser-bundled `VITE_*` variables are not secret storage.
- Disable sample role switching in production. The local SHA-256 password comparison must not become the production password scheme.

## Test baseline and practical limits

- `npm test`: 42 behavioral tests passed.
- `npm run build`: TypeScript and Vite production build passed.
- Latest prior browser pass: 56 page checks and 20 dialog checks at four frame widths; see the verification document.
- Transfer-proof selection/rejection/resubmission, fulfilment, review, uploads and CSV download were exercised with synthetic data.
- Browser viewport checks do not establish physical-device coverage, real payments, carrier integration or backend security.
- Existing Vite output has a nonblocking large-chunk warning. Consider route-level code splitting as later optimization; do not misreport it as a failed build.
- Tests import `esbuild` through Vite's locked dependency tree. Making it an explicit dev dependency is a possible maintenance improvement.
- The existing Vite dev server permits all hosts for the preview environment. Restrict development host access to the target environment when appropriate.

When changing behavior, add focused tests for meaningful risks and run the existing suites. Keep the requirement map and verification record honest about what was actually checked.

## Package contents

`SOURCE_VERSION.json` identifies the original source and excluded hosting/screenshot files.
`FILE_MANIFEST.sha256` covers the included files.
Site-specific hosting metadata, Git history, secrets, dependencies, compiled output, browser-state exports and browser screenshots are not needed to continue this source project and are not bundled.

No backend directory or API endpoint should be described as existing until it is implemented.

