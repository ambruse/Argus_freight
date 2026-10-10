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
