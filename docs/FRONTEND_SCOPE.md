# Frontend scope and Node API handoff

Updated 14 November 2026 (Asia/Bangkok).

This map follows the user's written membership, seller and admin requirements and the HealthShop Context Diagram. The pink image supplies the theme only. It does not add face analysis, AI chat, fashion, makeup recommendations or diagnostic features.

“Implemented” below describes frontend/local-demo behavior. Browser verification is recorded in [VERIFICATION.md](VERIFICATION.md), with its own dates and limitations. This map does not assert a completed browser test for every row.

## Customer and membership scope

| Original requirement / flow | Current frontend behavior | Main implementation |
| --- | --- | --- |
| สมัครสมาชิก / เข้าสู่ระบบ / ออกจากระบบ | Local registration/login/logout, duplicate-account checks, visible password controls and checkout continuation | `App.tsx`, `BuyerPasswordField.tsx`, `actions.ts` |
| แก้ไขข้อมูลส่วนตัว / เปลี่ยนรหัสผ่าน | Profile/contact form and current/new/confirmation password flow | `App.tsx`, `actions.ts` |
| ผู้ใช้ทั่วไปและผู้ขาย | Customer and seller sample roles; seller retains shopping functions | `store.tsx`, `actions.ts`, `domain.ts` |
| ดูสินค้าทุกหมวดหมู่ / ค้นหา / รายละเอียด | Search, category/shop/price filtering, sorting, detail links, storefronts and unavailable states | `App.tsx`, `components.tsx`, `buyerNavigation.ts` |
| สินค้าแนะนำ / สินค้าขายดี / สินค้าใหม่ | Storefront sections derived from available catalogue records and local order history | `App.tsx`, `domain.ts` |
| Wishlist | Account-separated saved listings, respecting active shop/category/product status | `App.tsx`, `components.tsx`, `domain.ts` |
| ตะกร้าสินค้า | Quantity updates, stock/availability checks, removal and per-account carts; guest-cart merge at sign-in | `App.tsx`, `actions.ts`, `domain.ts` |
| สั่งซื้อ / ข้อมูลจัดส่ง | Address book/default address, multi-shop quote, per-shop shipping and order snapshots | `App.tsx`, `actions.ts`, `domain.ts` |
| ชำระเงิน / หลักฐานโอน | Simulated paid checkout or validated local proof selection; review/rejection/resubmission states | `App.tsx`, `imageUpload.ts`, `useImageUpload.ts`, `actions.ts` |
| สถานะคำสั่งซื้อ / ประวัติการซื้อ | Search, date/status filters, sorting, order links, timestamped events and cancellation/delivery actions | `App.tsx`, `buyerNavigation.ts`, `actions.ts` |
| ติดตามพัสดุ | Shop-provided sample carrier/reference, copy action and shipment-status history | `App.tsx`, `OrderInspector.tsx` |
| ใบเสร็จรับเงิน | Printable sample receipt with order snapshot, discounts and shipping | `App.tsx` |
| รีวิวและคะแนนสินค้า | Delivered-purchase eligibility, per-product reviews, duplicate prevention, replies and moderation | `App.tsx`, `ManagementPanels.tsx`, `actions.ts`, `domain.ts` |
| โปรโมชัน | Applicable coupon display, eligibility/minimum/cap/date/use-limit validation and checkout discount | `App.tsx`, `ManagementPanels.tsx`, `domain.ts` |
| การแจ้งเตือน | Local order/shop messages with direct navigation to the relevant order or management view | `App.tsx`, `buyerNavigation.ts`, `actions.ts` |

## Seller and admin scope

| Original requirement / flow | Current frontend behavior | Main implementation |
| --- | --- | --- |
| สมัครเป็นผู้ขาย / กรอกข้อมูลร้าน / รออนุมัติ | Application, pending/approved/rejected/suspended states, reason display and rejected-application resubmission | `App.tsx`, `ManagementPanels.tsx`, `actions.ts` |
| Seller Center หลังอนุมัติ | Management navigation and shop-scoped controls; existing orders remain accessible during suspension | `Dashboard.tsx`, `actions.ts` |
| ตั้งชื่อและรายละเอียดร้านค้า | Editable shop profile, contact information and shipping settings | `ManagementPanels.tsx`, `actions.ts` |
| เพิ่ม / แก้ไข / ลบสินค้า | Product form, category/pricing/description, stock and visibility. Removal archives a listing from sale to preserve historical orders | `Dashboard.tsx`, `actions.ts` |
| อัปโหลดรูปสินค้า | Format/size/signature/decode validation, preview, replacement/removal and sample image selection | `Dashboard.tsx`, `imageUpload.ts`, `useImageUpload.ts` |
| ราคา / จำนวนสินค้า / สต็อก | Product pricing/stock controls, checkout deduction, cancellation restoration and movement history/export | `Dashboard.tsx`, `ManagementPanels.tsx`, `actions.ts`, `domain.ts` |
| คำสั่งซื้อของร้าน / อัปเดตสถานะ / จัดส่ง | Search and status/payment filters, order details, preparation/shipment workflow, carrier/reference and event history | `Dashboard.tsx`, `OrderInspector.tsx`, `managementReports.ts`, `actions.ts` |
| ยอดขาย / รายได้ / ประวัติการขาย | Date/status filters, paid item sales after discount, shipping and collected totals, cancellation/refund summaries and CSV export | `Dashboard.tsx`, `managementReports.ts` |
| โปรโมชันร้านค้า | Shop-scoped coupon creation/editing/activation/deletion with eligibility limits | `ManagementPanels.tsx`, `actions.ts`, `domain.ts` |
| รายงานรีวิวสินค้า | Shop review list and reply controls; admin moderation with reasons | `ManagementPanels.tsx`, `actions.ts` |
| Admin จัดการสมาชิก | Search/filter, member details and purchase totals, CSV export, blocking/reactivation confirmation | `MembersManager.tsx`, `actions.ts` |
| Admin อนุมัติและจัดการร้านค้า | Approval/rejection/suspension/reactivation with feedback | `ManagementPanels.tsx`, `actions.ts` |
| Admin จัดการสินค้า / หมวดหมู่ | All-store product management and editable category visibility/deletion rules | `Dashboard.tsx`, `ManagementPanels.tsx`, `actions.ts` |
| Admin ตรวจคำสั่งซื้อและการชำระเงิน | All-store order/payment filters, proof review/rejection, cancellation and separate simulated refund | `Dashboard.tsx`, `OrderInspector.tsx`, `actions.ts` |
| Admin รายงานยอดขาย | Date/status/shop filters, per-shop summaries, order history and CSV export | `Dashboard.tsx`, `managementReports.ts` |
| Admin จัดการเว็บไซต์ / สถิติ | Site title and notice controls, local page usage and management audit history | `ManagementPanels.tsx`, `actions.ts` |

## Health content from the Context Diagram

| Flow | Current frontend behavior | Main implementation |
| --- | --- | --- |
| บทความสุขภาพ | Published article list, text search, category filters, bookmarks, reader links and unavailable-article states | `Wellness.tsx`, `wellnessState.ts` |
| ข้อมูลอาหาร / แคลอรี | Active food catalogue, servings and meal diary totals; historical name/portion/calorie snapshots | `Wellness.tsx`, `wellnessState.ts` |
| ตารางควบคุมอาหาร | Admin meal templates copied into a selected day, append/replace choice and editable personal servings | `ContentManager.tsx`, `Wellness.tsx`, `contentValidation.ts` |
| ตารางออกกำลังกาย | Seven-day templates, week navigation, activity creation/edit/removal and completion records | `ContentManager.tsx`, `Wellness.tsx`, `wellnessState.ts` |
| ข้อมูลสุขภาพส่วนตัว | Optional height, weight and self-written goal, separated by account | `Wellness.tsx`, `wellnessState.ts` |
| Admin เนื้อหาสุขภาพ / อาหาร / ตาราง | Article draft/publish controls, food activation, template editing, reference-safe deletion and activation validation | `ContentManager.tsx`, `contentValidation.ts`, `actions.ts` |

The values and schedules are demonstration content. The personal profile stores supplied notes without generating nutritional, training or medical prescriptions.

## Shared interface behavior

Responsive layouts, keyboard-dismissable/focus-contained dialogs, readable narrow-screen forms, empty/error states and long-text containment apply across the customer and management interfaces. Deep links preserve product, order and dashboard context. Typed personal-record recovery, storage warnings/retry/backup controls and an application error boundary provide recovery paths without treating a failed save as a completed external operation.

Automated suites are in `tests/domain.test.mjs`, `tests/buyer.test.mjs`, `tests/management.test.mjs`, `tests/wellness.test.mjs` and `tests/frontend.test.mjs`. Run all with `npm test`. For observed browser checks, use the separate verification record rather than inferring coverage from these modules.

## Future Node.js/TypeScript boundary

| Area | Existing frontend responsibility | Required production responsibility |
| --- | --- | --- |
| Identity and permissions | Forms, simulated sessions, role/ownership-aware UI and local action rules | Real account/session lifecycle, server-derived actor, secure password storage/recovery, server authorization and abuse controls |
| Shared persistence | Browser-local state and per-account buckets | Database schema, migrations, authenticated CRUD, concurrency handling and backups |
| Checkout and stock | Quote display, validation and local order simulation | Server price/discount/shipping recomputation and atomic stock/coupon/order transaction |
| Images and proofs | Local file selection, client validation and preview | Authenticated uploads, independent file validation, object storage, access controls and retention |
| Payments and refunds | Clearly labeled simulated payment/proof/refund states | Payment provider integration, verified callbacks, reconciliation and authorized refunds |
| Shipping | Carrier/reference entry and local event display | Courier integration and authenticated status updates |
| Notifications | Browser-local messages and navigation | Persistent notifications plus any chosen delivery channels |
| Reports | Local order-derived views and exports | Authorized server queries, durable audit records, settlement/accounting rules where required |
| Health records | Account-scoped local diary, schedule and optional profile | Authenticated storage/access controls, retention and deletion behavior for personal records |

There is no deployed Node API in this source package. No production payment, courier, database, email or external notification service is represented as connected. Browser-local role checks and password hashing are prototype behavior and must not serve as the production security boundary.
