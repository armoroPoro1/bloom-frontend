# Bloom frontend verification

This record distinguishes automated domain checks from observed browser interactions. All checks use local demonstration data. They do not verify production authentication, a Node backend, real payment handling, courier APIs or shared server persistence; those services are not deployed.

## Frontend completion — 14 November 2026 (Asia/Bangkok)

This is the latest verification pass. **`npm test` passed 42/42 tests, and the full TypeScript check passed.** Final production packaging/build is handled by the publication workflow after these checks; its result is reported separately.

### Responsive coverage

The browser pass checked **14 page/view combinations at four frame widths: 56 page checks**, plus **five dialog types at the same four widths: 20 dialog checks**. All measured page and dialog checks passed without horizontal overflow.

| Group | Views checked |
| --- | --- |
| Buyer/public — 8 | Home, shop, account, public store `s1`, orders, nutrition, exercise, articles |
| Admin — 3 | Reports, members, orders |
| Seller — 3 | Products, orders, reports |
| Dialogs — 5 | Member details, product editor, product details, buyer order details, health profile |

| Outer frame width | Measured inner document width |
| --- | --- |
| 320 px | 303 px |
| 390 px | 373 px |
| 768 px | 751 px |
| 1440 px | 1423 px |

Frame borders and the desktop scrollbar account for the smaller inner widths. Modal measurements vary when opening a dialog locks body scrolling. Tables and other deliberately contained scroll areas may scroll internally; they did not widen the outer page. These are browser-frame measurements, **not physical iPhone, iPad or Android device tests**. The earlier 155-check responsive pass is retained below as historical coverage, not added to this pass's counts.

### Navigation and customer interactions

- Product-link copying was verified against the actual clipboard. Product refresh and browser Back worked. The empty-hash Back defect found during testing was fixed and successfully retested.
- Buyer order deep links opened the exact order and survived refresh/Back. Tracking-number search worked.
- Notifications opened the exact buyer/admin order. An order belonging to another account showed a generic not-found response without exposing that order's contents.
- Article search, its no-result state and unavailable-article links were checked.
- Member details opened correctly. The member-block confirmation was opened and cancelled without applying the block.
- A synthetic health profile using height 170 cm, weight 60 kg and a sample goal was saved, retained after reload and separated between accounts. This tests data handling, not medical or nutritional accuracy.

### Complete transfer-proof and fulfilment browser flow

The previously unverified file-selection/payment-correction interaction **was completed in this pass through the actual browser file chooser**:

1. Checked out products from two shops: **1,080 + 80 shipping − 108 discount = 1,052 baht**. The orders were split into **391** and **661 baht**.
2. Selected a valid **74-byte synthetic PNG** as sample payment proof. An invalid PNG was rejected while the existing preview remained; retrying the same file was also checked.
3. Admin rejected the proof with a reason; the buyer resubmitted it; admin approved the corrected proof.
4. Seller prepared and shipped test order **`BL-652654159-F1B5-1`** with sample tracking number **`DEMO-FRONTEND-001`**.
5. Buyer confirmed receipt, submitted a review, and the stored review replaced the repeat-entry form.

This verifies the connected frontend demo flow, including file selection, correction, status progression and review eligibility. It does **not** represent a real payment, a live courier lookup, production authentication or a server upload service.

### Seller uploads, reporting and downloads

- A seller created a product with an uploaded image, a **99.50-baht** price and stock of **3**. The image preview was checked before saving, and the saved product remained after reload.
- Admin report filters for **14 November 2026**, shop **`s1`** and **delivered** status returned **351 baht net merchandise + 40 baht shipping = 391 baht** for the test order.
- The downloaded sales CSV was inspected: it contained **two lines (header plus the matching order)** and the expected amounts. An iframe download-event attempt did not complete, but the actual top-level browser download succeeded and its contents were verified. The download verification limit is therefore resolved for this tested export path.
- Automated management scenarios cover paid-sales/refund aggregation, inclusive Bangkok date boundaries, combined payment/shop filters, store attribution, CSV escaping and role-appropriate dashboard routes.

### Evidence and remaining boundaries

Evidence files: frontend screenshot (`bloom-frontend-complete.jpg`, retained in the original project; not included in this source export) and [browser verification data](frontend-verification.json).

The frontend still uses browser-local demonstration persistence. There is no deployed Node.js/TypeScript API, shared database, production file storage, real payment processor or live courier integration. Sample role controls demonstrate the interface and are not a production security boundary. Physical-device behavior and all possible browser/storage conditions are not claimed as tested. The completed scenarios above resolve the earlier transfer-proof file-chooser and payment-correction gap; the historical record below describes the earlier versions only.

## Earlier responsive recheck — 14 November 2026 (Asia/Bangkok)

The recheck covered **31 views at five frame widths: 155 document-overflow checks, all passed**. Coverage comprised 10 buyer/public pages, 13 admin views and 8 seller views. These were browser-frame viewport checks, not tests on physical iOS or Android devices.

| Frame width | Measured inner document width | Result across the 31 views |
| --- | --- | --- |
| 320 px | 303 px | No horizontal document overflow |
| 390 px | 373 px | No horizontal document overflow |
| 768 px | 751 px | No horizontal document overflow |
| 1024 px | 1007 px | No horizontal document overflow |
| 1440 px | 1423 px | No horizontal document overflow |

Frame borders and the desktop browser scrollbar account for the difference between frame and inner widths. Intentional scrolling inside tables, navigation/day strips and similar contained regions was allowed; those regions must not widen the document.

Additional dialog checks passed:

- Product details, cart and mobile product filters at 320 px.
- Checkout at 320, 390, 768 and 1024 px.
- Product editor, meal-template editor and exercise-template editor at 320, 390 and 768 px. No horizontal modal overflow was observed, and product-editor fields stayed within their containers.
- Escape dismissed the mobile filter dialog. Opening an article and using browser Back cleared its reader. The mobile dashboard retained its “สิ่งที่ต้องดูแล” action panel.

### Fixes included in this recheck

- **Buyer pages:** mobile filters use the shared dialog behavior; long names, references and receipt/order content wrap; hidden-category or suspended-shop products no longer appear through the wishlist; navigation closes the mobile menu and resets scroll on a route change. Site naming is consistent in the footer, and the general-category icon is supported.
- **Seller/admin:** restored the action panel on smaller screens, changed mobile product-editor fields to one column, contained long tracking/shop/product text, and enlarged management controls. Numeric negative stock changes remain numbers in CSV exports while user-entered strings retain formula-prefix protection. Promotion forms now match the shared validation contract and identify unavailable shops.
- **Wellness/CMS:** improved phone-sized article cards, food and activity rows, day strips, template editors and action controls; article reader state follows navigation correctly. Personal-record storage failures now show explicit feedback instead of silently implying persistence.
- **Shared layout:** corrected the 320 px strip margins, constrained long brand text and set mobile form text to 16 px with appropriately sized controls.

The existing domain suite was rerun: **13/13 passed**. `git diff --check` passed. Production build/deployment confirmation remains the responsibility of the final publication workflow.

Evidence files: responsive screenshot (`bloom-responsive-recheck.jpg`, retained in the original project; not included in this source export) and [viewport check data](responsive-checks.json).

During this earlier responsive recheck, the transfer-proof file chooser was not retested and its verification gap remained open. The subsequent frontend-completion pass above resolved that browser-flow gap. The application remains a React/TypeScript, browser-local prototype, with no deployed Node backend, shared database, real payments or live courier integration.

## Earlier v2 automated domain checks

Command:

```sh
node --test tests/domain.test.mjs
```

**Result: 13 tests passed.** The scenarios cover:

1. Multi-store checkout agrees with the quoted discount and shipping, captures order snapshots and deducts stock.
2. A seller coupon applies only to its store, enforces minimum spend, maximum discount, dates and usage limits, and counts one use per checkout.
3. Payment rejection, corrected-proof resubmission and approval retain timestamped events and respect the simulated seller/buyer permissions.
4. Repeated cancellation does not restore stock twice; cancelling a paid order requires a separate simulated-refund action.
5. Carts and wishlists stay separated by account, while an actual guest login merges the guest cart.
6. A blocked demo account cannot re-enter through role switching or perform protected actions.
7. Active category/store status governs sale availability, and referenced categories are preserved.
8. Each delivered product can be reviewed once; moderation updates the visible rating and count.
9. Sellers cannot transfer product ownership, modify another store's products or create a site-wide coupon.
10. Order price/image snapshots remain stable after product edits, and product creation dates are retained.
11. Concurrent duplicate registration is rejected; address operations stay within the current account.
12. v1 migration retains compatible shopping data and establishes safe defaults for new structures.
13. Cart quantity can be reduced after available stock falls, and a suspended store can deactivate an existing coupon.

TypeScript checking passed during integration. Production packaging/build is performed by the Site publication workflow; this document does not substitute for its final build result.

## Browser interactions observed in v2

- Added products from two stores as a guest, continued to sample login, and returned to checkout with the purchasing intent retained and the default address available.
- The checkout summary showed product totals of 390 + 690 = 1,080 baht, shipping of 80 baht and a BLOOM10 discount of 108 baht, for a total of **1,052 baht**.
- Created a category through admin management. The former read-only category view has been replaced with editable category management.
- Added a food record with 250 kcal through the content manager, logged it in the customer diary, then changed the catalogue record to 300 kcal as admin. The existing diary entry remained **250 kcal**, confirming the historical food snapshot behavior.
- Inspected the storefront at a desktop content width of **1,348 px**.
- Checked responsive layouts in outer frames of **390 px** and **768 px**. Their inner content widths were **375 px** and **753 px**, respectively, with **no horizontal document overflow**.
- Checked the mobile content-management view: its section headings were present and the inner page width remained **375 px**.

That earlier checkout browser check established only the cart/login/address/quote path. The complete transfer-proof/correction/fulfilment browser flow was subsequently verified in the latest pass above.

## Historical upload limitation — v2, resolved in the latest pass

In v2, the browser automation lost its tab while attempting to use the transfer-proof file chooser. At that time, actual file selection and the complete payment-correction flow had not been verified end to end in the browser; only the automated rejection → resubmission → approval scenario using sample image data had passed.

The latest frontend-completion pass above verified the actual chooser, invalid-image handling, proof resubmission, approval, fulfilment and review flow. This historical limitation is therefore resolved for that tested frontend path. File storage still uses localStorage, rather than a production upload service; comprehensive coverage of every possible browser condition is not implied.

## Earlier v1 observations

The previous version had passing TypeScript/Vite checks and browser observations of seller preparation/shipment, admin shop approval and exercise completion. It also demonstrated splitting the 1,052-baht multi-store total into orders of 391 and 661 baht. These are retained as historical observations; the frontend-completion section at the top is the current verification record.

The old read-only category limitation no longer applies. v2 also adds editable wellness content, store coupons, review management, payment-correction states, status events, stock/audit history, address management, public store pages and account-separated personal data.
