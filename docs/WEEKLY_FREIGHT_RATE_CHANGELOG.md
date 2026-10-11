# Weekly Freight Rate Implementation Change Log

Date: 10 October 2026. Scope: additive weekly freight submission, comparison and approved-publication feature in the existing Argus repository, plus the explicitly requested local sample operator account.

## Created files

| File | Change |
| --- | --- |
| `database/migrations/20261010_weekly_freight.sql` | Additive InnoDB schema, constraints, indexes, equipment/location reference catalogs; no price/user seeds |
| `backend/scripts/migrate-freight.js` | Explicit idempotent migration runner and migration advisory lock |
| `backend/scripts/setup-freight-preview.js` | Localhost-only sample operator setup with random bcrypt password; refuses production DB names |
| `backend/src/freight/domain.js` | Validation, integer money, normalized terms, Qatar dates/week, reference comparison algorithm, ownership rules |
| `backend/src/freight/service.js` | Persistent SQL ranking, serialized transactions, revision history, approvals, explicit markup, private PDFs, catalog configuration and shared throttling |
| `backend/src/routes/freightRates.js` | Public/private feature endpoints, existing JWT integration, current-user authorization, body/upload limits and private-safe error responses |
| `backend/test/freight-domain.test.js` | Pricing, groups, validity, ties, money, markup and permissions unit tests |
| `backend/test/freight-integration.test.js` | Real database migration, lifecycle, API privacy/authorization, concurrent writes, search, attachments, expiry and throttling tests |
| `backend/test/freight-return.test.js` | Existing quote workflow return-URL and open-redirect regression test |
| `backend/test/freight-browser-fixture.js` | Explicit isolated localhost 20-row database fixture for browser verification; never imported by production server |
| `src/components/FreightRates.jsx` | Public preview/page, independent search, suggestions, equipment/date filters, load/error/empty states, pagination, price disclosures and quote links |
| `src/components/FreightRates.css` | Scoped brand-token styling, sticky headers, ~five-row scroll region, keyboard focus and mobile overflow |
| `frontend/components/freight/FreightDashboard.tsx` | Reusable operator/admin dashboard: forms, comparisons, decisions, history, PDFs and equipment/location management |
| `frontend/components/freight/freight-dashboard.css` | Scoped portal styling using existing surfaces and gold accents |
| `frontend/app/operator/freight-rates/page.tsx` | Operator route and private noindex metadata |
| `frontend/app/admin/freight-rates/page.tsx` | Administrator route and private noindex metadata |
| `frontend/lib/freightReturn.ts` | Allowlisted quote-return helper shared by existing login and customer registration |
| `scripts/check-freight-build.mjs` | Existing metadata/H1/canonical regression checks, new public page/asset checks and private export noindex checks |
| `docs/WEEKLY_FREIGHT_RATE_SYSTEM.md` | Architecture, data model, permissions, rules, APIs, results, deployment, local setup and limitations |
| `docs/WEEKLY_FREIGHT_RATE_CHANGELOG.md` | This file-by-file implementation inventory |
| `docs/qa/freight-operator.jpg` | Screenshot of persisted sample operator submission |
| `docs/qa/freight-admin.jpg` | Screenshot of administrator comparison/approval verification |
| `docs/qa/freight-public.jpg` | Screenshot of the approved local sample price on the public page |
| `docs/qa/freight-mobile.jpg` | 390px mobile screenshot with filtered isolated QA data |

## Modified files

| File | Exact scope |
| --- | --- |
| `backend/package.json` | Add `migrate:freight` and `test:freight` scripts; no dependency changes |
| `backend/src/server.js` | Mount `/api/freight-rates` using the existing database pool |
| `src/App.jsx` | Import the new component and render `/freight-rates` in the existing router |
| `src/pages/Home.jsx` | Insert the weekly preview after the existing Global Network section |
| `src/components/Navbar.jsx` | Add Freight Rates navigation item |
| `src/seo/metadata.mjs` | Add only new `/freight-rates` title/description |
| `scripts/prerender.mjs` | Add private admin/operator exclusions to generated robots; existing public prerender pipeline retained |
| `frontend/next.config.mjs` | Add development rewrite for the public freight page |
| `frontend/components/layout/Sidebar.tsx` | Add operator and administrator freight links under existing role filtering |
| `frontend/components/layout/AppLayout.tsx` | Add freight link to mobile Other menu; preserve quote-prefill destination when redirecting an unauthenticated freight enquiry to login |
| `frontend/app/login/page.tsx` | Preserve allowlisted freight quote return after login; pass it to customer registration |
| `frontend/app/register/page.tsx` | Preserve that freight return through customer registration and the Sign In link; no registration/auth rules changed |
| `frontend/app/customer/rfq/new/page.tsx` | Optional query-driven freight route/equipment/date/reference prefill into existing fields and note; existing submit logic unchanged |
| `frontend/components/ui/ContainerInput.tsx` | Optional equipment initializer for quote prefill; callers without this prop keep existing empty defaults |

## Local verification state

- 32 automated tests passed, including real database integration, with no skipped tests in the full run.
- New public React component lint and portal TypeScript checks passed.
- Vite built/prerendered 47 public routes. Next production build exported 28 routes, including both new dashboards.
- Existing 46 public page titles, descriptions, H1s and canonicals remained byte-equivalent to their committed values in the regression checks.
- Browser verified operator submission, admin approval, public approved price, quote prefill, search, 20-row scrolling, sticky headers, keyboard scrolling and mobile overflow.
- Existing SEO checker has pre-existing schema/H1 assumptions documented in the system guide; it was not modified to conceal that failure.
- Generated tracked `dist` output and `frontend/tsconfig.tsbuildinfo` were restored after validation. No generated application build artifacts are part of this source change; rebuild and merge before deployment.
- No production data or environment files were changed. Temporary test databases are created/dropped only by the guarded integration harness. The persistent local preview database contains the user-requested sample operator and one browser-tested quotation. The temporary local QA administrator was disabled after testing. The separate 20-row QA fixture database remains isolated from the preview/production data.
- Existing authentication implementation, tracking, contact, quotation/RFQ APIs, shipment/customer schemas and data were not rewritten. Narrow login/form/container changes above only carry the new feature's quote reference into the existing workflow.

## Deployment status

Not deployed to the live website. Follow the migration, complete build/merge and staging integration checks in `WEEKLY_FREIGHT_RATE_SYSTEM.md`. The production database and external mail/tracking integrations were not available for live verification.

## Follow-up: country and port dropdowns — 10 October 2026

Requested workbook imported without changing the original. Added 1,938 facilities and 250 country/territory choices. The following inventory is additional to the initial feature inventory above.

| File | Created/modified in this follow-up |
| --- | --- |
| `scripts/extract-port-workbook.py` | Created: repeatable, read-only workbook extraction with header/row validation and source hash |
| `scripts/build-port-catalog.mjs` | Created: normalized countries, explicit preserved IDs, deterministic internal facility IDs and collision validation |
| `frontend/lib/data/workbook-ports.json` | Created: complete 1,938-row source extraction and workbook provenance |
| `frontend/lib/data/port-catalog.json` | Created: generated shared catalog, countries, aliases and AIR/SEA metadata |
| `frontend/lib/portCatalog.ts` | Created: shared country resolution and mode/country filtering |
| `frontend/components/ui/SearchComboBox.tsx` | Created: reusable accessible searchable selection, keyboard support and required-selection validation |
| `frontend/components/ui/search-combobox.css` | Created: scoped responsive dropdown, gold focus/hover and scrolling styles |
| `frontend/components/ui/CountryAutoSuggest.tsx` | Modified: shared full-country list, aliases, accessible combobox and optional strict selection |
| `frontend/components/ui/PortAutoSuggest.tsx` | Modified: supplied catalog, country/mode filtering and Airport/Seaport labels; retained RFQ free-text support |
| `frontend/components/freight/FreightDashboard.tsx` | Modified: paired country/port selectors, stable ID selection and country restoration on edit |
| `frontend/components/freight/freight-dashboard.css` | Modified: two-column origin/destination layout, stacked on mobile |
| `frontend/app/rfq/new/page.tsx` | Modified: accessible country label and clearing incompatible ports on mode changes |
| `frontend/app/customer/rfq/new/page.tsx` | Modified: country/port prefill, accessible country label and clearing ports on mode changes |
| `backend/scripts/import-freight-locations.js` | Created: additive location metadata migration, transactional catalog import and identity conflict protection |
| `backend/scripts/migrate-freight.js` | Modified: execute location import under the existing advisory lock |
| `backend/src/freight/service.js` | Modified: structured location catalog, country-first labels, seaport validation, public quote-prefill fields and compatible location configuration |
| `src/components/FreightRates.jsx` | Modified: quote links carry structured country/port fields; public suggestions only show applicable facilities and readable type labels |
| `backend/test/freight-catalog.test.js` | Created: workbook row fidelity, counts, country coverage and facility identity regressions |
| `backend/test/freight-integration.test.js` | Modified: imported facility persistence, airport rejection, country searches, labels and safe re-import tests |
| `docs/WEEKLY_FREIGHT_RATE_SYSTEM.md` | Modified: import design/provenance, UI behavior, deployment prerequisites and updated verification results |
| `docs/WEEKLY_FREIGHT_RATE_CHANGELOG.md` | Modified: this follow-up inventory |
| `docs/qa/freight-port-dropdown.jpg` | Created: desktop country/port dropdown verification |
| `docs/qa/rfq-port-dropdown.jpg` | Created: RFQ airport selection verification |
| `docs/qa/freight-port-mobile.jpg` | Created: 390px mobile dropdown verification |
| `docs/qa/freight-country-port-public.jpg` | Created: public Country, Port name labels |

Follow-up results: 37 tests passed without skips. Landing and portal production builds, public component lint, TypeScript checks and preservation of existing public metadata/H1/canonical values passed. Browser verified keyboard selection, country-dependent clearing, RFQ Air/Sea filters, edit restoration, quote prefill and mobile overflow. Local preview catalog migrated; existing prices and approvals retained. No deployment to the live site or changes to production credentials/data.


## Follow-up: automatic publication, WhatsApp and mobile cards — 10 October 2026

This explicit user request supersedes the approval workflow described in the initial historical entries above. Existing shipment/RFQ approvals are unchanged.

| File | Created/modified in this follow-up |
| --- | --- |
| `backend/scripts/migrate-freight-publication.js` | Created: persistent operator contacts, policy marker, additive active status and one-time audited activation of pending/approved rates |
| `backend/scripts/migrate-freight.js` | Modified: run the policy upgrade after catalog import under the migration lock |
| `backend/src/freight/domain.js` | Modified: active eligibility and automatic public selection |
| `backend/src/freight/service.js` | Modified: saves activate immediately, withdrawal fallback, explicit markup action, retained margin on revisions, own contact settings, contact-availability flag and current-winner WhatsApp redirect validation |
| `backend/src/freight/whatsapp.js` | Created: country/code validation, international digits, exact requested message and encoded fixed-host wa.me URL |
| `backend/src/routes/freightRates.js` | Modified: own GET/PUT contact settings and public quote redirect with friendly stale/unavailable errors |
| `frontend/lib/data/phone-codes.json` | Created: shared calling-code catalog extracted from existing COUNTRY_DIAL_CODES |
| `frontend/components/freight/WhatsAppSettings.tsx` | Created: searchable country-code selector, number, persistence and loading/error/success states |
| `frontend/app/settings/page.tsx` | Modified: render WhatsApp enquiries for authenticated operator/admin users |
| `frontend/components/freight/FreightDashboard.tsx` | Modified: remove approve/reject controls, active publication wording, markup control, Settings reminder and active revision attachments |
| `src/components/FreightRates.jsx` | Modified: rate-owner WhatsApp action, missing-number state, mobile labels and explicit table semantics |
| `src/components/FreightRates.css` | Modified: compact mobile cards, vertical list, touch targets, 16px inputs and full-width equipment/date fields below 381px |
| `src/seo/metadata.mjs` | Modified: only freight page description says current instead of approved |
| `backend/test/freight-domain.test.js` | Modified: active status, automatic publication and weekly selection expectations |
| `backend/test/freight-integration.test.js` | Modified: immediate publication, fallback, concurrency, markup, private settings, owner routing, stale quote prevention and idempotent policy upgrade |
| `backend/test/freight-whatsapp.test.js` | Created: international number validation and exact encoded public message |
| `backend/test/freight-browser-fixture.js` | Modified: active submissions and isolated utf8mb4 v2 QA database with reserved fictional WhatsApp number; no messages sent |
| `docs/WEEKLY_FREIGHT_RATE_SYSTEM.md` | Modified: current lifecycle, contact privacy, new APIs, migration/rollback, mobile layout and test results |
| `docs/WEEKLY_FREIGHT_RATE_CHANGELOG.md` | Modified: this exact follow-up inventory |
| `docs/qa/freight-whatsapp-settings.jpg` | Created: country-code selection and number field in Settings |
| `docs/qa/freight-mobile-cards.jpg` | Created: current mobile cards in the local preview |

Validation: 41 automated tests passed with no skips using real MariaDB. Both production builds passed (47 public pages, 28 portal routes), as did existing public metadata/H1/canonical regression checks, public component lint and portal type checking. Desktop QA retained a 484px viewport, approximately 98.7px rows and all 20 persisted fixture offers. At 390px the mobile list was 341px wide with equal scrollWidth and 5,777px of vertically accessible content; keyboard End reached scrollTop 5,186. At 320px there was no horizontal overflow and the date input had 249px usable width. Country-code typing and keyboard selection were verified in Settings. Integration tests validate saved contacts and redirects without contacting WhatsApp.

Local preview migrated successfully and backend restarted. No real operator WhatsApp number was invented or saved; each operator must enter their own business number in Settings. Existing user-created rates were retained. No live deployment or production data change occurred. Generated build artifacts were restored after verification; rebuild for deployment.


## Release cleanup and one row per route — 10 October 2026

This entry supersedes the earlier local demo/fixture state. No demo credentials or account setup scripts remain in the deliverable.

| File/path | Final change |
| --- | --- |
| `src/components/freightRoutes.mjs` | Created: group display rows by stable origin/destination IDs and merge additional options across loaded pages |
| `src/components/FreightRates.jsx` | Modified: one row per port pair; accessible option selector updates price, dates, terms and enquiry destination together |
| `src/components/FreightRates.css` | Modified: responsive option selector with mobile touch target |
| `backend/src/freight/service.js` | Modified: expose nonprivate stable facility IDs for exact route grouping |
| `backend/src/freight/whatsapp.js` | Modified: requested wording is now “I am interested in the given Quote in the Website” |
| `backend/test/freight-public-routes.test.js` | Created: duplicate lanes, pagination merging and preservation of incompatible options |
| `backend/test/freight-integration.test.js` | Modified: persisted winners produce one route row while retaining equivalent-basis options |
| `backend/test/freight-whatsapp.test.js` | Modified: exact corrected message regression |
| `backend/scripts/setup-freight-preview.js` | Removed: demo-account provisioner |
| `backend/test/freight-browser-fixture.js` | Removed: persistent sample-rate seeder |
| `backend/src/server.js` | Modified: remove automatic default-password admin/operator creation; existing accounts unaffected |
| `backend/scripts/reset-admin.js` | Modified: explicit ADMIN_RESET_PASSWORD required; no hardcoded password, fail on error and close DB pool |
| `backend/.env.example` | Modified: correct MySQL port/user template, no real credentials |
| `deploy.sh` | Modified: preserve server configuration and run additive freight migration before publishing |
| `.gitignore` | Modified: secrets, preview output directories, exported frontend, build cache and QA screenshots ignored |
| `backend/.env.cpanel` | Removed from Git index only; existing local configuration retained; historical credentials require rotation |
| `.preview-build/`, `.login-check/`, `.slider-check/`, `.seo-audit-build/`, `.seo-audit-sandbox/`, `frontend/out/`, `frontend/tsconfig.tsbuildinfo` | Removed generated copies from Git index only; original source/assets retained. Including the secret file above, 1,566 previously tracked generated/configuration files are excluded from future commits. |
| `docs/qa/*.jpg` | Removed all ten temporary browser screenshots listed in earlier entries |
| `docs/WEEKLY_FREIGHT_RATE_SYSTEM.md` | Modified: route presentation, cleaned first-use/deployment instructions, corrected wording and 42-test results |
| `docs/WEEKLY_FREIGHT_RATE_CHANGELOG.md` | Modified: final cleanup inventory |

Database cleanup was executed only against the task-created loopback preview server: three demo freight records and their revision/audit/attachment/contact data, the two demo accounts and two persistent browser-test databases were removed. Before cleanup, all non-freight business tables were confirmed empty and all users matched the two known demo identities. The catalog and application schema remain. Production was not contacted or modified. The cleanup operation is not shipped as a reusable destructive deployment script.

Verification: 42 automated checks passed without skips using real MariaDB; landing build and metadata/H1/canonical regression checks passed. Portal code is unchanged since its passing 28-route production build. Browser verification confirmed one Shanghai–Hamad row with two distinct terms options and synchronized enquiry references; the final public page is empty after sample removal. No Git commit, push or production deployment was performed. Previously committed secrets remain in Git history and require rotation before release.


## Deployment repair — 11 October 2026

Supersedes only the earlier decision to untrack `frontend/out/`. The host serves that generated directory directly and the deployed build was missing `index.html`.

- `.gitignore`: remove the `frontend/out/` ignore rule, retaining secret and preview exclusions.
- `frontend/out/`: recreate the complete portal and marketing export from current source, including index.html, freight page, login, staff dashboards and all referenced assets. No sample database data or accounts are included.
- `scripts/check-deployment.cjs`: new validation of core HTML and referenced local script/style files; rejects an incomplete release.
- `scripts/merge-build.cjs`: validate the combined export before reporting success.
- `docs/WEEKLY_FREIGHT_RATE_SYSTEM.md`: corrected artifact policy, failure cause and immediate host recovery commands.
- `docs/WEEKLY_FREIGHT_RATE_CHANGELOG.md`: this repair record.

The previously requested reversal in `backend/.env.example` is preserved. No actual environment file or database connection value was edited in this repair. No production deployment was performed.


## Freight catalogue/API readiness repair — 11 October 2026

- `backend/src/freight/initialize.js`: new shared, retryable additive schema initialization with bounded backoff and safe 503 errors.
- `backend/src/server.js`: sequence freight setup after core schema initialization, expose safe readiness status, and pass the readiness gate to the feature router.
- `backend/src/routes/freightRates.js`: gate requests before database throttling; return Retry-After when setup is unavailable.
- `frontend/components/freight/FreightDashboard.tsx`: explicit catalogue loading/retry UI, disabled Add/Edit while unavailable, no misleading missing-WhatsApp notice on a fetch error.
- `backend/test/freight-initialize.test.js`: new concurrency, schema ordering, retry recovery and HTTP readiness/limiter regression checks.
- `backend/test/freight-integration.test.js`: first requests against a database with no freight tables initialize and return real persistent reference catalogs and an empty rates list.
- `frontend/out/`: regenerated portal export and merged marketing assets for the Git-based deployment workflow.
- `docs/WEEKLY_FREIGHT_RATE_SYSTEM.md`, `docs/WEEKLY_FREIGHT_RATE_CHANGELOG.md`: diagnosis, deployment/recovery and verification.

46 automated checks passed using isolated MariaDB databases. Live read-only checks confirm feature endpoints return 500 and required client assets return 200; production schema/migration errors were not available for direct inspection. No changes to production DB credentials or existing RFQ forms. Deploy/restart is required before the live result can be confirmed.


## One lowest public rate per POL/POD/container — 11 October 2026

The user clarified that different container sizes must retain separate cheapest rates. The public SQL query now selects one lowest eligible customer total per exact origin, destination and container, before pagination. USD is the default display currency, with QAR and EUR available through a labeled currency filter. Currency amounts are never ranked against each other. The existing internal equivalent-service comparison is preserved; the public listing retains the selected offer's service, basis, inclusions and exclusions and explicitly tells visitors to check conditions. No claim is made that different service scopes are equivalent.

The public rate-options dropdown and client-side grouping helper are removed. The WhatsApp redirect revalidates the same public winner and selected currency. Loading additional pages merges by facility/equipment identity. The currency/date filters retain the mobile layout.

Verification: 47 automated checks passed without skips using disposable local MariaDB databases. Tests cover container separation, lower later submissions, confirmed surcharge totals, ties, currency isolation, unknown charges, expiry, withdrawal, 105 routes across pages, stale WhatsApp links and selected-currency enquiries. The Vite production build passed and its 47 prerendered pages were merged into the existing complete portal export. Deployment artifact checks and unchanged-title/description/H1/canonical checks passed. This change needs no new migration. Deploy the backend and generated frontend/out together and restart Node.js. No production deployment, sample data creation in the application database, or database credential changes were performed.

Exact file inventory for this change (generated HTML changes reference the new shared asset hashes):

| File | Change |
| --- | --- |
| `backend/src/freight/service.js` | Modified |
| `backend/test/freight-integration.test.js` | Modified |
| `backend/test/freight-public-routes.test.js` | Deleted |
| `dist/about.html` | Modified |
| `dist/assets/index-BLVJmJIZ.js` | Deleted |
| `dist/assets/index-Br0vu_Bt.css` | Deleted |
| `dist/assets/index-C_GLD6Uf.js` | Created |
| `dist/assets/index-CvzJCYiV.css` | Created |
| `dist/case-studies/fmcg-distribution-india/index.html` | Modified |
| `dist/case-studies/heavy-lift-qatar/index.html` | Modified |
| `dist/case-studies/pharma-cold-chain-uae/index.html` | Modified |
| `dist/chairman-message.html` | Modified |
| `dist/contact.html` | Modified |
| `dist/freight-rates.html` | Modified |
| `dist/index.html` | Modified |
| `dist/industries/automotive-logistics/index.html` | Modified |
| `dist/industries/construction-logistics/index.html` | Modified |
| `dist/industries/healthcare-logistics/index.html` | Modified |
| `dist/industries/industrial-logistics/index.html` | Modified |
| `dist/industries/oil-gas-logistics/index.html` | Modified |
| `dist/industries/retail-logistics/index.html` | Modified |
| `dist/insights/gcc-freight-report/index.html` | Modified |
| `dist/locations/bahrain/index.html` | Modified |
| `dist/locations/china/index.html` | Modified |
| `dist/locations/index.html` | Modified |
| `dist/locations/india/index.html` | Modified |
| `dist/locations/qatar/index.html` | Modified |
| `dist/locations/turkey/index.html` | Modified |
| `dist/locations/uae/index.html` | Modified |
| `dist/resources/cbm-calculator/index.html` | Modified |
| `dist/resources/chargeable-weight-calculator/index.html` | Modified |
| `dist/resources/container-size-guide/index.html` | Modified |
| `dist/resources/incoterms-guide/index.html` | Modified |
| `dist/services.html` | Modified |
| `dist/services/3pl-logistics/index.html` | Modified |
| `dist/services/air-freight/index.html` | Modified |
| `dist/services/customs-clearance/index.html` | Modified |
| `dist/services/dangerous-goods/index.html` | Modified |
| `dist/services/door-to-door-cargo/index.html` | Modified |
| `dist/services/project-cargo/index.html` | Modified |
| `dist/services/road-freight/index.html` | Modified |
| `dist/services/sea-freight/index.html` | Modified |
| `dist/services/vehicle-logistics/index.html` | Modified |
| `dist/services/warehousing/index.html` | Modified |
| `dist/team.html` | Modified |
| `dist/tracking.html` | Modified |
| `dist/trade-lanes/bahrain-to-qatar/index.html` | Modified |
| `dist/trade-lanes/china-to-qatar/index.html` | Modified |
| `dist/trade-lanes/china-to-uae/index.html` | Modified |
| `dist/trade-lanes/index.html` | Modified |
| `dist/trade-lanes/india-to-qatar/index.html` | Modified |
| `dist/trade-lanes/turkey-to-qatar/index.html` | Modified |
| `dist/trade-lanes/uae-to-qatar/index.html` | Modified |
| `dist/why-us.html` | Modified |
| `docs/WEEKLY_FREIGHT_RATE_CHANGELOG.md` | Modified |
| `docs/WEEKLY_FREIGHT_RATE_SYSTEM.md` | Modified |
| `frontend/out/about.html` | Modified |
| `frontend/out/assets/index-C_GLD6Uf.js` | Created |
| `frontend/out/assets/index-CvzJCYiV.css` | Created |
| `frontend/out/case-studies/fmcg-distribution-india/index.html` | Modified |
| `frontend/out/case-studies/heavy-lift-qatar/index.html` | Modified |
| `frontend/out/case-studies/pharma-cold-chain-uae/index.html` | Modified |
| `frontend/out/chairman-message.html` | Modified |
| `frontend/out/contact.html` | Modified |
| `frontend/out/freight-rates.html` | Modified |
| `frontend/out/index.html` | Modified |
| `frontend/out/industries/automotive-logistics/index.html` | Modified |
| `frontend/out/industries/construction-logistics/index.html` | Modified |
| `frontend/out/industries/healthcare-logistics/index.html` | Modified |
| `frontend/out/industries/industrial-logistics/index.html` | Modified |
| `frontend/out/industries/oil-gas-logistics/index.html` | Modified |
| `frontend/out/industries/retail-logistics/index.html` | Modified |
| `frontend/out/insights/gcc-freight-report/index.html` | Modified |
| `frontend/out/locations/bahrain/index.html` | Modified |
| `frontend/out/locations/china/index.html` | Modified |
| `frontend/out/locations/index.html` | Modified |
| `frontend/out/locations/india/index.html` | Modified |
| `frontend/out/locations/qatar/index.html` | Modified |
| `frontend/out/locations/turkey/index.html` | Modified |
| `frontend/out/locations/uae/index.html` | Modified |
| `frontend/out/resources/cbm-calculator/index.html` | Modified |
| `frontend/out/resources/chargeable-weight-calculator/index.html` | Modified |
| `frontend/out/resources/container-size-guide/index.html` | Modified |
| `frontend/out/resources/incoterms-guide/index.html` | Modified |
| `frontend/out/services.html` | Modified |
| `frontend/out/services/3pl-logistics/index.html` | Modified |
| `frontend/out/services/air-freight/index.html` | Modified |
| `frontend/out/services/customs-clearance/index.html` | Modified |
| `frontend/out/services/dangerous-goods/index.html` | Modified |
| `frontend/out/services/door-to-door-cargo/index.html` | Modified |
| `frontend/out/services/project-cargo/index.html` | Modified |
| `frontend/out/services/road-freight/index.html` | Modified |
| `frontend/out/services/sea-freight/index.html` | Modified |
| `frontend/out/services/vehicle-logistics/index.html` | Modified |
| `frontend/out/services/warehousing/index.html` | Modified |
| `frontend/out/team.html` | Modified |
| `frontend/out/tracking.html` | Modified |
| `frontend/out/trade-lanes/bahrain-to-qatar/index.html` | Modified |
| `frontend/out/trade-lanes/china-to-qatar/index.html` | Modified |
| `frontend/out/trade-lanes/china-to-uae/index.html` | Modified |
| `frontend/out/trade-lanes/index.html` | Modified |
| `frontend/out/trade-lanes/india-to-qatar/index.html` | Modified |
| `frontend/out/trade-lanes/turkey-to-qatar/index.html` | Modified |
| `frontend/out/trade-lanes/uae-to-qatar/index.html` | Modified |
| `frontend/out/why-us.html` | Modified |
| `src/components/FreightRates.css` | Modified |
| `src/components/FreightRates.jsx` | Modified |
| `src/components/freightRoutes.mjs` | Deleted |


## USD-only weekly prices and simplified rate form — 11 October 2026

- `backend/src/freight/currency.js` (created): fixed user-configured QAR / 3.65 conversion, USD/QAR allowlist, exact SQL conversion expression, revision policy metadata.
- `backend/src/freight/domain.js` (modified): mandatory Carrier, fixed AT Actuals exclusions, quoted-freight pricing mode, removed fields ignored, original amount and conversion metadata retained, USD-normalized comparison.
- `backend/src/freight/service.js` (modified): SQL comparison and savings in USD, one converted winner per lane/container, USD-only public amounts and enquiry validation, uniform public exclusions, historical unsupported currency suppression.
- `backend/test/freight-domain.test.js`, `backend/test/freight-integration.test.js` (modified): new policy, rounding, carrier/exclusion enforcement, legacy preservation and USD WhatsApp regression coverage.
- `frontend/components/freight/FreightDashboard.tsx` (modified): QAR default, USD preview, mandatory Carrier, readonly AT Actuals, removed mandatory surcharges/details/confirmation, transit time, quotation reference, private remarks and PDF upload controls; original historical attachments remain downloadable. Admin savings/public price previews use USD.
- `src/components/FreightRates.jsx`, `src/components/FreightRates.css` (modified): public currency selector removed, four-filter layout restored, USD conversion/actual-charges disclosure.
- `docs/WEEKLY_FREIGHT_RATE_SYSTEM.md`, `docs/WEEKLY_FREIGHT_RATE_CHANGELOG.md` (modified): current policy, verification, compatibility and deployment instructions.
- `dist/`, `frontend/out/` (regenerated): current marketing and portal production exports; exact generated file inventory is recorded below.

Verification: 51 automated tests passed without skips with MariaDB. Headless browser checks passed against the built portal/public pages and a real isolated freight database. Next exported 28 routes; Vite prerendered 47 public pages; deployment assets and existing SEO invariants passed. No application sample data was retained, no existing revisions/attachments were deleted, and no environment/database credentials were edited. No production deployment performed. Deploy backend plus frontend/out and restart Node; no new schema migration required.

Generated release inventory relative to current HEAD (includes the preceding uncommitted route-deduplication release):

| File | Change |
| --- | --- |
| `dist/about.html` | Modified |
| `dist/assets/index-BLVJmJIZ.js` | Deleted |
| `dist/assets/index-BT7XPAq1.js` | Created |
| `dist/assets/index-Br0vu_Bt.css` | Deleted |
| `dist/assets/index-vxjnaPXe.css` | Created |
| `dist/case-studies/fmcg-distribution-india/index.html` | Modified |
| `dist/case-studies/heavy-lift-qatar/index.html` | Modified |
| `dist/case-studies/pharma-cold-chain-uae/index.html` | Modified |
| `dist/chairman-message.html` | Modified |
| `dist/contact.html` | Modified |
| `dist/freight-rates.html` | Modified |
| `dist/index.html` | Modified |
| `dist/industries/automotive-logistics/index.html` | Modified |
| `dist/industries/construction-logistics/index.html` | Modified |
| `dist/industries/healthcare-logistics/index.html` | Modified |
| `dist/industries/industrial-logistics/index.html` | Modified |
| `dist/industries/oil-gas-logistics/index.html` | Modified |
| `dist/industries/retail-logistics/index.html` | Modified |
| `dist/insights/gcc-freight-report/index.html` | Modified |
| `dist/locations/bahrain/index.html` | Modified |
| `dist/locations/china/index.html` | Modified |
| `dist/locations/index.html` | Modified |
| `dist/locations/india/index.html` | Modified |
| `dist/locations/qatar/index.html` | Modified |
| `dist/locations/turkey/index.html` | Modified |
| `dist/locations/uae/index.html` | Modified |
| `dist/resources/cbm-calculator/index.html` | Modified |
| `dist/resources/chargeable-weight-calculator/index.html` | Modified |
| `dist/resources/container-size-guide/index.html` | Modified |
| `dist/resources/incoterms-guide/index.html` | Modified |
| `dist/services.html` | Modified |
| `dist/services/3pl-logistics/index.html` | Modified |
| `dist/services/air-freight/index.html` | Modified |
| `dist/services/customs-clearance/index.html` | Modified |
| `dist/services/dangerous-goods/index.html` | Modified |
| `dist/services/door-to-door-cargo/index.html` | Modified |
| `dist/services/project-cargo/index.html` | Modified |
| `dist/services/road-freight/index.html` | Modified |
| `dist/services/sea-freight/index.html` | Modified |
| `dist/services/vehicle-logistics/index.html` | Modified |
| `dist/services/warehousing/index.html` | Modified |
| `dist/team.html` | Modified |
| `dist/tracking.html` | Modified |
| `dist/trade-lanes/bahrain-to-qatar/index.html` | Modified |
| `dist/trade-lanes/china-to-qatar/index.html` | Modified |
| `dist/trade-lanes/china-to-uae/index.html` | Modified |
| `dist/trade-lanes/index.html` | Modified |
| `dist/trade-lanes/india-to-qatar/index.html` | Modified |
| `dist/trade-lanes/turkey-to-qatar/index.html` | Modified |
| `dist/trade-lanes/uae-to-qatar/index.html` | Modified |
| `dist/why-us.html` | Modified |
| `frontend/out/404.html` | Modified |
| `frontend/out/_next/static/chunks/5068-6d6e4a80aeb6f82c.js` | Created |
| `frontend/out/_next/static/pbCAU_QhRvDZgDXx1rJA0/_buildManifest.js` | Created |
| `frontend/out/_next/static/pbCAU_QhRvDZgDXx1rJA0/_ssgManifest.js` | Created |
| `frontend/out/about.html` | Modified |
| `frontend/out/admin/call-enquiries.html` | Modified |
| `frontend/out/admin/call-enquiries.txt` | Modified |
| `frontend/out/admin/freight-rates.html` | Modified |
| `frontend/out/admin/freight-rates.txt` | Modified |
| `frontend/out/admin/quotations.html` | Modified |
| `frontend/out/admin/quotations.txt` | Modified |
| `frontend/out/admin/register.html` | Modified |
| `frontend/out/admin/register.txt` | Modified |
| `frontend/out/assets/index-BT7XPAq1.js` | Created |
| `frontend/out/assets/index-C_GLD6Uf.js` | Created |
| `frontend/out/assets/index-CvzJCYiV.css` | Created |
| `frontend/out/assets/index-vxjnaPXe.css` | Created |
| `frontend/out/calculator.html` | Modified |
| `frontend/out/calculator.txt` | Modified |
| `frontend/out/calling-agent/enquiries.html` | Modified |
| `frontend/out/calling-agent/enquiries.txt` | Modified |
| `frontend/out/calling-agent/new.html` | Modified |
| `frontend/out/calling-agent/new.txt` | Modified |
| `frontend/out/calling-agent/phone.html` | Modified |
| `frontend/out/calling-agent/phone.txt` | Modified |
| `frontend/out/case-studies/fmcg-distribution-india/index.html` | Modified |
| `frontend/out/case-studies/heavy-lift-qatar/index.html` | Modified |
| `frontend/out/case-studies/pharma-cold-chain-uae/index.html` | Modified |
| `frontend/out/chairman-message.html` | Modified |
| `frontend/out/confirmed.html` | Modified |
| `frontend/out/confirmed.txt` | Modified |
| `frontend/out/contact.html` | Modified |
| `frontend/out/contacts.html` | Modified |
| `frontend/out/contacts.txt` | Modified |
| `frontend/out/customer/rfq.html` | Modified |
| `frontend/out/customer/rfq.txt` | Modified |
| `frontend/out/customer/rfq/new.html` | Modified |
| `frontend/out/customer/rfq/new.txt` | Modified |
| `frontend/out/customers.html` | Modified |
| `frontend/out/customers.txt` | Modified |
| `frontend/out/dashboard.html` | Modified |
| `frontend/out/dashboard.txt` | Modified |
| `frontend/out/freight-rates.html` | Modified |
| `frontend/out/index.html` | Modified |
| `frontend/out/industries/automotive-logistics/index.html` | Modified |
| `frontend/out/industries/construction-logistics/index.html` | Modified |
| `frontend/out/industries/healthcare-logistics/index.html` | Modified |
| `frontend/out/industries/industrial-logistics/index.html` | Modified |
| `frontend/out/industries/oil-gas-logistics/index.html` | Modified |
| `frontend/out/industries/retail-logistics/index.html` | Modified |
| `frontend/out/insights/gcc-freight-report/index.html` | Modified |
| `frontend/out/locations/bahrain/index.html` | Modified |
| `frontend/out/locations/china/index.html` | Modified |
| `frontend/out/locations/index.html` | Modified |
| `frontend/out/locations/india/index.html` | Modified |
| `frontend/out/locations/qatar/index.html` | Modified |
| `frontend/out/locations/turkey/index.html` | Modified |
| `frontend/out/locations/uae/index.html` | Modified |
| `frontend/out/login.html` | Modified |
| `frontend/out/login.txt` | Modified |
| `frontend/out/operator/approvals.html` | Modified |
| `frontend/out/operator/approvals.txt` | Modified |
| `frontend/out/operator/freight-rates.html` | Modified |
| `frontend/out/operator/freight-rates.txt` | Modified |
| `frontend/out/quotation.html` | Modified |
| `frontend/out/quotation.txt` | Modified |
| `frontend/out/register.html` | Modified |
| `frontend/out/register.txt` | Modified |
| `frontend/out/reset-password.html` | Modified |
| `frontend/out/reset-password.txt` | Modified |
| `frontend/out/resources/cbm-calculator/index.html` | Modified |
| `frontend/out/resources/chargeable-weight-calculator/index.html` | Modified |
| `frontend/out/resources/container-size-guide/index.html` | Modified |
| `frontend/out/resources/incoterms-guide/index.html` | Modified |
| `frontend/out/rfq.html` | Modified |
| `frontend/out/rfq.txt` | Modified |
| `frontend/out/rfq/new.html` | Modified |
| `frontend/out/rfq/new.txt` | Modified |
| `frontend/out/sales/call-enquiries.html` | Modified |
| `frontend/out/sales/call-enquiries.txt` | Modified |
| `frontend/out/services.html` | Modified |
| `frontend/out/services/3pl-logistics/index.html` | Modified |
| `frontend/out/services/air-freight/index.html` | Modified |
| `frontend/out/services/customs-clearance/index.html` | Modified |
| `frontend/out/services/dangerous-goods/index.html` | Modified |
| `frontend/out/services/door-to-door-cargo/index.html` | Modified |
| `frontend/out/services/project-cargo/index.html` | Modified |
| `frontend/out/services/road-freight/index.html` | Modified |
| `frontend/out/services/sea-freight/index.html` | Modified |
| `frontend/out/services/vehicle-logistics/index.html` | Modified |
| `frontend/out/services/warehousing/index.html` | Modified |
| `frontend/out/settings.html` | Modified |
| `frontend/out/settings.txt` | Modified |
| `frontend/out/summary.html` | Modified |
| `frontend/out/summary.txt` | Modified |
| `frontend/out/team.html` | Modified |
| `frontend/out/tracking.html` | Modified |
| `frontend/out/trade-lanes/bahrain-to-qatar/index.html` | Modified |
| `frontend/out/trade-lanes/china-to-qatar/index.html` | Modified |
| `frontend/out/trade-lanes/china-to-uae/index.html` | Modified |
| `frontend/out/trade-lanes/index.html` | Modified |
| `frontend/out/trade-lanes/india-to-qatar/index.html` | Modified |
| `frontend/out/trade-lanes/turkey-to-qatar/index.html` | Modified |
| `frontend/out/trade-lanes/uae-to-qatar/index.html` | Modified |
| `frontend/out/why-us.html` | Modified |
