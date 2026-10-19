# Live Freight Rates implementation change log

17 October 2026. Includes the calculator, versioned tariff management, server pricing, approval, RFQ handoff, tests and complete deployment export. Existing database credentials and configuration were not modified. Test tariffs and users are confined to disposable test databases.

## Source and documentation

| Change | File |
| --- | --- |
| Created | `backend/src/live/router.js` |
| Created | `backend/src/live/store.js` |
| Modified | `backend/src/server.js` |
| Created | `backend/test/live-pricing.browser.cjs` |
| Created | `backend/test/live-pricing.integration.cjs` |
| Created | `backend/test/live-pricing.test.mjs` |
| Created | `database/migrations/20261017_live_pricing.sql` |
| Created | `docs/LIVE_FREIGHT_RATE_CALCULATOR.md` |
| Created | `docs/LIVE_FREIGHT_RATE_CHANGELOG.md` |
| Modified | `frontend/app/customer/rfq/new/page.tsx` |
| Modified | `frontend/app/login/page.tsx` |
| Created | `frontend/app/operator/live-rates/layout.tsx` |
| Created | `frontend/app/operator/live-rates/page.tsx` |
| Created | `frontend/app/operator/live-rates/rates.css` |
| Modified | `frontend/components/layout/AppLayout.tsx` |
| Modified | `frontend/components/layout/Sidebar.tsx` |
| Modified | `scripts/check-deployment.cjs` |
| Created | `scripts/check-live-seo.cjs` |
| Created | `shared/livePricing.mjs` |
| Created | `src/components/live/CargoRows.jsx` |
| Created | `src/components/live/live.css` |
| Created | `src/components/live/LiveCalculator.jsx` |
| Created | `src/components/live/LocationSelect.jsx` |
| Modified | `src/pages/Home.jsx` |

## Generated deployment artifacts

The public landing build and Next export were regenerated together. Obsolete hashed bundles were removed. `frontend/out/index.html` remains included for the existing hosting setup. Rebuilt pages retain their existing metadata; the public site has 46 verified SEO invariants.

| Change | File |
| --- | --- |
| Modified | `dist/about.html` |
| Created | `dist/assets/index-B_o47XaC.css` |
| Created | `dist/assets/index-bObfmgjh.js` |
| Removed | `dist/assets/index-Cs02iLpn.js` |
| Removed | `dist/assets/index-UH2yD5VI.css` |
| Modified | `dist/case-studies/fmcg-distribution-india/index.html` |
| Modified | `dist/case-studies/heavy-lift-qatar/index.html` |
| Modified | `dist/case-studies/pharma-cold-chain-uae/index.html` |
| Modified | `dist/chairman-message.html` |
| Modified | `dist/contact.html` |
| Modified | `dist/index.html` |
| Modified | `dist/industries/automotive-logistics/index.html` |
| Modified | `dist/industries/construction-logistics/index.html` |
| Modified | `dist/industries/healthcare-logistics/index.html` |
| Modified | `dist/industries/industrial-logistics/index.html` |
| Modified | `dist/industries/oil-gas-logistics/index.html` |
| Modified | `dist/industries/retail-logistics/index.html` |
| Modified | `dist/insights/gcc-freight-report/index.html` |
| Modified | `dist/locations/bahrain/index.html` |
| Modified | `dist/locations/china/index.html` |
| Modified | `dist/locations/index.html` |
| Modified | `dist/locations/india/index.html` |
| Modified | `dist/locations/qatar/index.html` |
| Modified | `dist/locations/turkey/index.html` |
| Modified | `dist/locations/uae/index.html` |
| Modified | `dist/resources/cbm-calculator/index.html` |
| Modified | `dist/resources/chargeable-weight-calculator/index.html` |
| Modified | `dist/resources/container-size-guide/index.html` |
| Modified | `dist/resources/incoterms-guide/index.html` |
| Modified | `dist/services.html` |
| Modified | `dist/services/3pl-logistics/index.html` |
| Modified | `dist/services/air-freight/index.html` |
| Modified | `dist/services/customs-clearance/index.html` |
| Modified | `dist/services/dangerous-goods/index.html` |
| Modified | `dist/services/door-to-door-cargo/index.html` |
| Modified | `dist/services/project-cargo/index.html` |
| Modified | `dist/services/road-freight/index.html` |
| Modified | `dist/services/sea-freight/index.html` |
| Modified | `dist/services/vehicle-logistics/index.html` |
| Modified | `dist/services/warehousing/index.html` |
| Modified | `dist/team.html` |
| Modified | `dist/tracking.html` |
| Modified | `dist/trade-lanes/bahrain-to-qatar/index.html` |
| Modified | `dist/trade-lanes/china-to-qatar/index.html` |
| Modified | `dist/trade-lanes/china-to-uae/index.html` |
| Modified | `dist/trade-lanes/index.html` |
| Modified | `dist/trade-lanes/india-to-qatar/index.html` |
| Modified | `dist/trade-lanes/turkey-to-qatar/index.html` |
| Modified | `dist/trade-lanes/uae-to-qatar/index.html` |
| Modified | `dist/why-us.html` |
| Created | `frontend/out/_next/static/-UMGC_ZD5q0Xas6DuDphW/_buildManifest.js` |
| Created | `frontend/out/_next/static/-UMGC_ZD5q0Xas6DuDphW/_ssgManifest.js` |
| Removed | `frontend/out/_next/static/AfEMyeH1Gvry978VMWm_2/_buildManifest.js` |
| Removed | `frontend/out/_next/static/AfEMyeH1Gvry978VMWm_2/_ssgManifest.js` |
| Created | `frontend/out/_next/static/chunks/2255-2b1e2616c59dd727.js` |
| Created | `frontend/out/_next/static/chunks/2419-9121214c20f36f84.js` |
| Created | `frontend/out/_next/static/chunks/29f6adc0-d1f0b10d4de8c94d.js` |
| Created | `frontend/out/_next/static/chunks/3022-a8c2725ae5824c0f.js` |
| Created | `frontend/out/_next/static/chunks/4020-46d090d0bd191b45.js` |
| Removed | `frontend/out/_next/static/chunks/4020-52b1a04059c43750.js` |
| Created | `frontend/out/_next/static/chunks/403-98fd758e6825d260.js` |
| Created | `frontend/out/_next/static/chunks/4483-0f63034f791a429d.js` |
| Created | `frontend/out/_next/static/chunks/4620-60e0970d03514d9a.js` |
| Created | `frontend/out/_next/static/chunks/488-caf33ae77cfeb8a6.js` |
| Created | `frontend/out/_next/static/chunks/5050-5391d36e7276c276.js` |
| Created | `frontend/out/_next/static/chunks/5131-0f1801ef2376beb2.js` |
| Created | `frontend/out/_next/static/chunks/543-59e4d42f61bdb512.js` |
| Created | `frontend/out/_next/static/chunks/5484-8451ed4e26a79e7d.js` |
| Created | `frontend/out/_next/static/chunks/5882.d6f912888af755e3.js` |
| Created | `frontend/out/_next/static/chunks/7481-736abd11390d2baf.js` |
| Removed | `frontend/out/_next/static/chunks/9364-8e102be8db1f74b0.js` |
| Created | `frontend/out/_next/static/chunks/9364-abdf5a885740944c.js` |
| Created | `frontend/out/_next/static/chunks/97-ae3c184d6612bce8.js` |
| Created | `frontend/out/_next/static/chunks/9d82b25c-6f210bf433744e85.js` |
| Created | `frontend/out/_next/static/chunks/a8578171-48115441d089576b.js` |
| Created | `frontend/out/_next/static/chunks/app/_not-found/page-feef144472f4f901.js` |
| Created | `frontend/out/_next/static/chunks/app/admin/call-enquiries/page-82e55b9c405b866c.js` |
| Created | `frontend/out/_next/static/chunks/app/admin/call-enquiries/page-91f98bc27a7b03cb.js` |
| Removed | `frontend/out/_next/static/chunks/app/admin/call-enquiries/page-f0c1172c9f8310ab.js` |
| Created | `frontend/out/_next/static/chunks/app/admin/quotations/page-2706ab45bc086988.js` |
| Created | `frontend/out/_next/static/chunks/app/admin/quotations/page-67000efe91418feb.js` |
| Removed | `frontend/out/_next/static/chunks/app/admin/quotations/page-94a188861933651c.js` |
| Created | `frontend/out/_next/static/chunks/app/admin/register/page-c4c7ab5b868ae4a7.js` |
| Created | `frontend/out/_next/static/chunks/app/admin/register/page-d7227e1dda54d6f4.js` |
| Removed | `frontend/out/_next/static/chunks/app/admin/register/page-f78d5c4a5a84ce64.js` |
| Created | `frontend/out/_next/static/chunks/app/calculator/page-3c9b9692944e0ec9.js` |
| Removed | `frontend/out/_next/static/chunks/app/calculator/page-88fe425d84e1a0cd.js` |
| Created | `frontend/out/_next/static/chunks/app/calculator/page-98311cc32d7a8e83.js` |
| Removed | `frontend/out/_next/static/chunks/app/calling-agent/enquiries/page-01ee0b2be9c50cfe.js` |
| Created | `frontend/out/_next/static/chunks/app/calling-agent/enquiries/page-6038ef5f121622ff.js` |
| Created | `frontend/out/_next/static/chunks/app/calling-agent/enquiries/page-d4088d186af69d17.js` |
| Removed | `frontend/out/_next/static/chunks/app/calling-agent/new/page-36213ae0e844dc42.js` |
| Created | `frontend/out/_next/static/chunks/app/calling-agent/new/page-ab565608ae062108.js` |
| Created | `frontend/out/_next/static/chunks/app/calling-agent/new/page-c802d90910ab54c7.js` |
| Created | `frontend/out/_next/static/chunks/app/calling-agent/phone/page-4973ced4c30cf4de.js` |
| Removed | `frontend/out/_next/static/chunks/app/calling-agent/phone/page-9575fbbf1a626781.js` |
| Created | `frontend/out/_next/static/chunks/app/calling-agent/phone/page-c8e13c8b76a7af46.js` |
| Removed | `frontend/out/_next/static/chunks/app/confirmed/page-216896e1e5ed73d6.js` |
| Created | `frontend/out/_next/static/chunks/app/confirmed/page-4950eead1363cfe5.js` |
| Created | `frontend/out/_next/static/chunks/app/confirmed/page-c4cc3543e80dba4d.js` |
| Created | `frontend/out/_next/static/chunks/app/contacts/page-8039360a966a3e45.js` |
| Removed | `frontend/out/_next/static/chunks/app/contacts/page-c39e8488188f2491.js` |
| Created | `frontend/out/_next/static/chunks/app/contacts/page-c668eff1566c95e1.js` |
| Created | `frontend/out/_next/static/chunks/app/customer/rfq/new/page-3cf40372849cc24c.js` |
| Removed | `frontend/out/_next/static/chunks/app/customer/rfq/new/page-5f270c1c5c1257f7.js` |
| Created | `frontend/out/_next/static/chunks/app/customer/rfq/new/page-f40d886d79481188.js` |
| Created | `frontend/out/_next/static/chunks/app/customer/rfq/page-65ff96bc81efd387.js` |
| Removed | `frontend/out/_next/static/chunks/app/customer/rfq/page-95c5e26bd68954eb.js` |
| Created | `frontend/out/_next/static/chunks/app/customer/rfq/page-e536bf515ef6dff3.js` |
| Removed | `frontend/out/_next/static/chunks/app/customers/page-2d7ca600925c8890.js` |
| Created | `frontend/out/_next/static/chunks/app/customers/page-93d490362b761cca.js` |
| Created | `frontend/out/_next/static/chunks/app/customers/page-f5e603e56292ac0b.js` |
| Created | `frontend/out/_next/static/chunks/app/dashboard/page-2b3fb3c72da1c7d4.js` |
| Created | `frontend/out/_next/static/chunks/app/dashboard/page-328ab260187e97fa.js` |
| Removed | `frontend/out/_next/static/chunks/app/dashboard/page-5b1b82c57e3f273b.js` |
| Created | `frontend/out/_next/static/chunks/app/layout-773b436a0a498a24.js` |
| Removed | `frontend/out/_next/static/chunks/app/layout-8244e3a9a6ec5792.js` |
| Created | `frontend/out/_next/static/chunks/app/layout-bb5cbe779ee93916.js` |
| Created | `frontend/out/_next/static/chunks/app/login/page-3ef922e2dfb845d2.js` |
| Created | `frontend/out/_next/static/chunks/app/login/page-7a37cf591049946f.js` |
| Removed | `frontend/out/_next/static/chunks/app/login/page-de2d9d32ba8c4ea3.js` |
| Removed | `frontend/out/_next/static/chunks/app/operator/approvals/page-144acac6d31ca25a.js` |
| Created | `frontend/out/_next/static/chunks/app/operator/approvals/page-2abdd6c11d3df31a.js` |
| Created | `frontend/out/_next/static/chunks/app/operator/approvals/page-ea2965cb651fd9f4.js` |
| Created | `frontend/out/_next/static/chunks/app/operator/live-rates/layout-c11acc808aa0d881.js` |
| Created | `frontend/out/_next/static/chunks/app/operator/live-rates/layout-caadee2a87844e62.js` |
| Created | `frontend/out/_next/static/chunks/app/operator/live-rates/page-a67c66c2eeeefc57.js` |
| Created | `frontend/out/_next/static/chunks/app/operator/live-rates/page-be5a055f76851aab.js` |
| Removed | `frontend/out/_next/static/chunks/app/quotation/page-54100e47cc94e0da.js` |
| Created | `frontend/out/_next/static/chunks/app/quotation/page-6ff8fcf3c9f1813c.js` |
| Created | `frontend/out/_next/static/chunks/app/quotation/page-dc7c748d52bdd7cc.js` |
| Removed | `frontend/out/_next/static/chunks/app/register/page-12d8c2ca0414e180.js` |
| Created | `frontend/out/_next/static/chunks/app/register/page-b71e3ab693c2d898.js` |
| Created | `frontend/out/_next/static/chunks/app/register/page-c0a6984f7a987179.js` |
| Created | `frontend/out/_next/static/chunks/app/reset-password/page-033a98fbc2432306.js` |
| Removed | `frontend/out/_next/static/chunks/app/reset-password/page-7c178942e9539e62.js` |
| Created | `frontend/out/_next/static/chunks/app/reset-password/page-9f20e627178e543a.js` |
| Created | `frontend/out/_next/static/chunks/app/rfq/new/page-8f7a47937960d0c6.js` |
| Created | `frontend/out/_next/static/chunks/app/rfq/new/page-f26310f197454469.js` |
| Removed | `frontend/out/_next/static/chunks/app/rfq/new/page-fe8892f1a16071b0.js` |
| Created | `frontend/out/_next/static/chunks/app/rfq/page-1d92e7c644fa3282.js` |
| Removed | `frontend/out/_next/static/chunks/app/rfq/page-a00273cc54913b95.js` |
| Created | `frontend/out/_next/static/chunks/app/rfq/page-fd3c2e8e1da61677.js` |
| Created | `frontend/out/_next/static/chunks/app/sales/call-enquiries/page-7cc77587f08e8c44.js` |
| Created | `frontend/out/_next/static/chunks/app/sales/call-enquiries/page-95cc7e74a55a41a2.js` |
| Removed | `frontend/out/_next/static/chunks/app/sales/call-enquiries/page-a3bf63f0873118e2.js` |
| Removed | `frontend/out/_next/static/chunks/app/settings/page-03d124173300e65b.js` |
| Created | `frontend/out/_next/static/chunks/app/settings/page-e80d295e5c5b194d.js` |
| Created | `frontend/out/_next/static/chunks/app/settings/page-f533ff56dea5a7d6.js` |
| Created | `frontend/out/_next/static/chunks/app/summary/page-2b40c125eb353f58.js` |
| Removed | `frontend/out/_next/static/chunks/app/summary/page-a48ba15386f28f06.js` |
| Created | `frontend/out/_next/static/chunks/app/summary/page-fa3cbf868e450e80.js` |
| Created | `frontend/out/_next/static/chunks/framework-d64b2e7237d775cc.js` |
| Created | `frontend/out/_next/static/chunks/main-3f4df06cb9a4575a.js` |
| Created | `frontend/out/_next/static/chunks/main-45496d3287656f77.js` |
| Created | `frontend/out/_next/static/chunks/main-app-a3111e6aa28fcf8a.js` |
| Removed | `frontend/out/_next/static/chunks/main-e863e1f968cc039e.js` |
| Created | `frontend/out/_next/static/chunks/pages/_app-ebecc4e985a1c980.js` |
| Created | `frontend/out/_next/static/chunks/pages/_error-4bb4966cd81453be.js` |
| Created | `frontend/out/_next/static/chunks/webpack-01725f0bd22a0db8.js` |
| Removed | `frontend/out/_next/static/chunks/webpack-49681c579d20f8f0.js` |
| Created | `frontend/out/_next/static/chunks/webpack-e9887c5d2874d10f.js` |
| Created | `frontend/out/_next/static/css/71d60011ea7d2ee2.css` |
| Created | `frontend/out/_next/static/css/802fab4cde5d1e19.css` |
| Created | `frontend/out/_next/static/ZjVC4JbRUWIPQsKkzy-of/_buildManifest.js` |
| Created | `frontend/out/_next/static/ZjVC4JbRUWIPQsKkzy-of/_ssgManifest.js` |
| Modified | `frontend/out/404.html` |
| Modified | `frontend/out/about.html` |
| Modified | `frontend/out/admin/call-enquiries.html` |
| Modified | `frontend/out/admin/call-enquiries.txt` |
| Modified | `frontend/out/admin/quotations.html` |
| Modified | `frontend/out/admin/quotations.txt` |
| Modified | `frontend/out/admin/register.html` |
| Modified | `frontend/out/admin/register.txt` |
| Created | `frontend/out/assets/index-B_o47XaC.css` |
| Created | `frontend/out/assets/index-bObfmgjh.js` |
| Created | `frontend/out/assets/index-CqFoF1jR.css` |
| Removed | `frontend/out/assets/index-Cs02iLpn.js` |
| Created | `frontend/out/assets/index-rgbrjDmf.js` |
| Removed | `frontend/out/assets/index-UH2yD5VI.css` |
| Modified | `frontend/out/calculator.html` |
| Modified | `frontend/out/calculator.txt` |
| Modified | `frontend/out/calling-agent/enquiries.html` |
| Modified | `frontend/out/calling-agent/enquiries.txt` |
| Modified | `frontend/out/calling-agent/new.html` |
| Modified | `frontend/out/calling-agent/new.txt` |
| Modified | `frontend/out/calling-agent/phone.html` |
| Modified | `frontend/out/calling-agent/phone.txt` |
| Modified | `frontend/out/case-studies/fmcg-distribution-india/index.html` |
| Modified | `frontend/out/case-studies/heavy-lift-qatar/index.html` |
| Modified | `frontend/out/case-studies/pharma-cold-chain-uae/index.html` |
| Modified | `frontend/out/chairman-message.html` |
| Modified | `frontend/out/confirmed.html` |
| Modified | `frontend/out/confirmed.txt` |
| Modified | `frontend/out/contact.html` |
| Modified | `frontend/out/contacts.html` |
| Modified | `frontend/out/contacts.txt` |
| Modified | `frontend/out/customer/rfq.html` |
| Modified | `frontend/out/customer/rfq.txt` |
| Modified | `frontend/out/customer/rfq/new.html` |
| Modified | `frontend/out/customer/rfq/new.txt` |
| Modified | `frontend/out/customers.html` |
| Modified | `frontend/out/customers.txt` |
| Modified | `frontend/out/dashboard.html` |
| Modified | `frontend/out/dashboard.txt` |
| Modified | `frontend/out/index.html` |
| Modified | `frontend/out/industries/automotive-logistics/index.html` |
| Modified | `frontend/out/industries/construction-logistics/index.html` |
| Modified | `frontend/out/industries/healthcare-logistics/index.html` |
| Modified | `frontend/out/industries/industrial-logistics/index.html` |
| Modified | `frontend/out/industries/oil-gas-logistics/index.html` |
| Modified | `frontend/out/industries/retail-logistics/index.html` |
| Modified | `frontend/out/insights/gcc-freight-report/index.html` |
| Modified | `frontend/out/landing/index.html` |
| Modified | `frontend/out/locations/bahrain/index.html` |
| Modified | `frontend/out/locations/china/index.html` |
| Modified | `frontend/out/locations/index.html` |
| Modified | `frontend/out/locations/india/index.html` |
| Modified | `frontend/out/locations/qatar/index.html` |
| Modified | `frontend/out/locations/turkey/index.html` |
| Modified | `frontend/out/locations/uae/index.html` |
| Modified | `frontend/out/login.html` |
| Modified | `frontend/out/login.txt` |
| Modified | `frontend/out/operator/approvals.html` |
| Modified | `frontend/out/operator/approvals.txt` |
| Created | `frontend/out/operator/live-rates.html` |
| Created | `frontend/out/operator/live-rates.txt` |
| Modified | `frontend/out/quotation.html` |
| Modified | `frontend/out/quotation.txt` |
| Modified | `frontend/out/register.html` |
| Modified | `frontend/out/register.txt` |
| Modified | `frontend/out/reset-password.html` |
| Modified | `frontend/out/reset-password.txt` |
| Modified | `frontend/out/resources/cbm-calculator/index.html` |
| Modified | `frontend/out/resources/chargeable-weight-calculator/index.html` |
| Modified | `frontend/out/resources/container-size-guide/index.html` |
| Modified | `frontend/out/resources/incoterms-guide/index.html` |
| Modified | `frontend/out/rfq.html` |
| Modified | `frontend/out/rfq.txt` |
| Modified | `frontend/out/rfq/new.html` |
| Modified | `frontend/out/rfq/new.txt` |
| Modified | `frontend/out/sales/call-enquiries.html` |
| Modified | `frontend/out/sales/call-enquiries.txt` |
| Modified | `frontend/out/services.html` |
| Modified | `frontend/out/services/3pl-logistics/index.html` |
| Modified | `frontend/out/services/air-freight/index.html` |
| Modified | `frontend/out/services/customs-clearance/index.html` |
| Modified | `frontend/out/services/dangerous-goods/index.html` |
| Modified | `frontend/out/services/door-to-door-cargo/index.html` |
| Modified | `frontend/out/services/project-cargo/index.html` |
| Modified | `frontend/out/services/road-freight/index.html` |
| Modified | `frontend/out/services/sea-freight/index.html` |
| Modified | `frontend/out/services/vehicle-logistics/index.html` |
| Modified | `frontend/out/services/warehousing/index.html` |
| Modified | `frontend/out/settings.html` |
| Modified | `frontend/out/settings.txt` |
| Modified | `frontend/out/summary.html` |
| Modified | `frontend/out/summary.txt` |
| Modified | `frontend/out/team.html` |
| Modified | `frontend/out/tracking.html` |
| Modified | `frontend/out/trade-lanes/bahrain-to-qatar/index.html` |
| Modified | `frontend/out/trade-lanes/china-to-qatar/index.html` |
| Modified | `frontend/out/trade-lanes/china-to-uae/index.html` |
| Modified | `frontend/out/trade-lanes/index.html` |
| Modified | `frontend/out/trade-lanes/india-to-qatar/index.html` |
| Modified | `frontend/out/trade-lanes/turkey-to-qatar/index.html` |
| Modified | `frontend/out/trade-lanes/uae-to-qatar/index.html` |
| Modified | `frontend/out/why-us.html` |

## Validation

29 automated tests passed. Real browser checks passed across AIR, LCL, FCL and TRUCK, 320/390px layouts, operator submission, admin publication, RFQ prefilling through login and unavailable-rate handling. Both production builds and the deployment asset validator passed. See `LIVE_FREIGHT_RATE_CALCULATOR.md` for reproducible checks and deployment instructions.

## Visual refinement

The calculator now uses a champagne-tinted panel with a gold outline and top edge in light mode, slate surfaces with gold accents in dark mode, ivory recessed inputs, raised cream controls, rich gold selected states and a gold primary action. The warmer panel distinguishes the calculator from the surrounding ivory page. Styling is scoped to the public calculator. Keyboard focus, reduced-motion preferences and high-contrast mode are supported. The expanded layout was checked at 320px and 390px; both themes were visually reviewed. The pricing-unavailable state was tested with a controlled 503 response, without altering database credentials or pricing behavior. Landing and deployment exports were rebuilt.

## Database-outage diagnosis and dropdown recovery

Local `/catalog` returned HTTP 503 because the configured MySQL connection refused connections on localhost:3306. Credentials were not changed. Modified `backend/src/live/router.js` to keep the real workbook location directory available with bounded throttling when database initialization fails; pricing remains unavailable until MySQL is restored. Modified `src/components/live/LiveCalculator.jsx` to load that directory after catalog failure and retain the connection warning across input changes. Added `backend/test/live-pricing-outage.test.cjs` and troubleshooting guidance in `docs/LIVE_FREIGHT_RATE_CALCULATOR.md`. Rebuilt landing/deployment assets. All 29 outage, pricing and port-catalog tests passed. A real local browser check selected Port of Shanghai, Hamad Port, SEA/FCL and 40HQ successfully against the running API. Database-backed quotation recovery remains dependent on restoring the existing local database service.

## Compact search and shipment overlay

Modified `src/components/live/LiveCalculator.jsx` and `src/components/live/live.css`: the homepage now shows route, mode and Search, with shipment details revealed in a centered native modal over a translucent blurred page. Added input validation, focus restoration, background scroll locking and close/backdrop/Escape handling; selections and cargo persist on reopening. Updated `backend/test/live-pricing.browser.cjs` to follow the new Search step and `docs/LIVE_FREIGHT_RATE_CALCULATOR.md` with the interaction behavior. Rebuilt landing and deployment assets. Browser checks passed for initial field visibility, validation, selected route transfer, no premature quote request, FCL input retention, Escape/focus restoration, close/backdrop dismissal and scrolling at 320px/390px. Pricing integration remains dependent on restoring MySQL; this UI change does not alter credentials or pricing rules.

## Contact step and enquiry operator routing

Created `backend/src/live/enquiries.js`, `database/migrations/20261017_live_enquiries.sql`, `shared/phoneCountries.json`, `frontend/components/settings/EnquiryEmailSettings.tsx`, and `backend/test/live-enquiries.integration.cjs`. Modified `backend/src/live/router.js`, `src/components/live/LiveCalculator.jsx`, `src/components/live/live.css`, `frontend/app/settings/page.tsx`, `backend/test/live-pricing.browser.cjs`, and `docs/LIVE_FREIGHT_RATE_CALCULATOR.md`. This changelog and the generated deployment artifacts above were refreshed.

Search now asks for phone country/calling code, phone and email. Continue submits an idempotent, persisted enquiry and opens shipment details after SMTP acceptance. Admin settings configure verified TLS SMTP, encrypted credentials, editable operator recipients/country assignments, and recent delivery history. The three user-specified operator addresses initialize as Global once. Routing uses the customer phone country, then Global fallback, with transactionally persisted rotation. Throttling, actual database role checks, duplicate claims, retry-safe failures and uncertain SMTP acceptance are covered by tests. Database credentials and other email settings are unchanged.

Validation: 32 automated tests passed, including real isolated MariaDB persistence and permissions. Expanded browser checks passed for all freight modes, contact capture, 320px contact layout, SMTP failure/retry, duplicate Continue prevention, admin add/remove/country changes, submission/approval and RFQ handoff. Test mail was intercepted locally; no real operator email was sent. Vite and Next production builds and TypeScript checks passed. Exported files were copied from the isolated Next build and merged with the landing export; existing older unreferenced assets were preserved. Actual delivery still requires the existing application database to be online and SMTP credentials to be configured and enabled in admin settings.

## Enquiry email wording

Modified `backend/src/live/enquiries.js` to use the requested greeting and introduction, followed by POL, POD, Mode, Number (including the selected calling code), and email in that order. Removed the prior explanatory body and visible reference line; the internal Message-ID and enquiry history remain available. Checked backend JavaScript syntax. No frontend rebuild is required for this email-template change.
