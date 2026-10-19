# Live Freight Rates

Implemented 17 October 2026. This is a new calculator, separate from the removed weekly freight-rate feature. It replaces only the homepage logistics slider. Existing homepage copy, SEO, tracking and RFQ routes remain in place.

## Architecture

- Public React/Vite: `src/components/live/LiveCalculator.jsx`, `LocationSelect.jsx`, `CargoRows.jsx`, `live.css`; mounted in `src/pages/Home.jsx`.
- Existing Next portal: `/operator/live-rates`, shown to operators and admins in desktop and mobile navigation. Admins use the same page to review all operators and approve/reject publication. The page has noindex metadata.
- Express API: `/api/live-pricing`, `backend/src/live/router.js` and `store.js`. Uses the existing MySQL pool, JWT middleware and users table. No new credentials, users or authentication store.
- Shared fixed-point arithmetic: `shared/livePricing.mjs`. Public usage is limited to cargo measurements; the server independently validates and prices every quotation.
- Existing country/port directory supplies real airport/seaport reference data. No rates or demonstration accounts are seeded. Operators can add precise road locations from the complete country selector.

## Data model and consistency

`database/migrations/20261017_live_pricing.sql` creates only new `live_*` tables:

| Table | Purpose |
| --- | --- |
| live_locations | Stable IDs, location names, country, AIR/SEA/TRUCK kind and aliases |
| live_rates | Owner, current revision, status, indexed lane/mode/validity |
| live_rate_versions | Immutable validated tariff document including tiers, equipment, capacity and charges |
| live_rate_audits | Creation, revision, submission, approval/rejection, disabling, archiving, duplication and expiry events |
| live_estimates | Random quotation reference, exact selected revision, shipment and calculation snapshot, expiry |
| live_pricing_lock | Transaction serialization across application workers |
| live_request_limits | Database-backed request throttling |

Tier/charge arrays are stored atomically inside immutable revision JSON rather than independently mutable child rows. This prevents historical quotations from changing when tariffs are edited. Foreign keys protect owners, location identities and quotation revisions; constraints protect statuses, versions and distinct endpoints. No existing tables are dropped or rewritten by this feature.

An advisory migration lock serializes initialization. The idempotent schema and reference-data import run after existing core schema initialization, on first API access. Initialization failures return a retryable 503; subsequent requests retry. Transactions lock `live_pricing_lock` before mutations, expiry transitions, comparison reads and quotation snapshots. A stale revision returns 409. Concurrent approval of the same pending revision succeeds once.

## Roles and publication

Public visitors see only current published route/service options and their requested selling-price estimate. They cannot read tariffs, operator identities, revisions or internal comparisons.

Operators can list, create, edit, duplicate, submit, disable and archive their own tariffs and read their history. They cannot read another operator's prices or approve any tariff. Admins can manage all rates and approve/reject pending revisions. Database user roles and deleted/stalled flags are rechecked on every protected request, even if a JWT claims a different role.

Workflow: **draft → pending → approved**. Rejection records a reason. Approved records are published while their validity includes today in Qatar. Editing creates a new draft revision and removes the rate from new public calculations until reapproved. Disabling or archiving stops eligibility immediately. Duplication creates a new draft; edit its dates before submitting.

All entered prices are **customer selling tariffs**. Do not enter confidential procurement cost into this form. There is no automatic margin or hidden markup.

## Calculation rules

- Normalize dimensions in mm/cm/m/inches/feet to metres, and kg/tonnes/lb to kg. Dimensions multiply by package quantity. Direct CBM means the entire cargo line's volume. Weight explicitly means either the line total or each package.
- Monetary and measurement operations use BigInt fixed point with nine decimal places. Billable quantity rounds upwards to an optional configured step. Each USD money line rounds once to cents (nearest or up), then rounded lines are summed; itemization always reconciles.
- AIR: volumetric kg = CBM × 1,000,000 / configured divisor. Use max(actual, volumetric), minimum units and rounding before selecting a tier. The default divisor is 6000; the operator can change it. Higher weight-break optimization is optional and compares complete totals.
- LCL: use CBM, actual metric tonnes, or max(CBM / configured CBM-per-WM-unit, tonnes / configured tonnes-per-WM-unit). Minimum billable units and freight minimums are applied in that model's unit.
- FCL: 20, 40 or 40HQ; DRY or REEFER; price per container × count. Only published route combinations are offered for instant pricing. Cargo entry is optional. Configured capacity limits reject overloads; passing them is not a guarantee of fit or loading feasibility.
- TRUCK: fixed shipment/route, per vehicle, kg, CBM, tonne or verified kilometre model. KM requires a stored route distance and source. FTL supports multiple trucks; LTL represents one consolidated shipment. Optional capacity limits apply per truck for FTL and per shipment for LTL.
- Tiers have unique inclusive minimum thresholds, sorted on the server. Each ends immediately before the next begins. Below the first threshold, return unavailable unless a minimum-unit or explicit weight-break rule makes the shipment eligible.
- Apply the freight minimum before additional charges. Charges can be per shipment, actual kg/CBM/tonne, container/vehicle, or a percentage of base freight. Percentages do not compound. Tax descriptions are disclosures, not tax calculations: enter any applicable tax as a separate explicit charge.
- USD and QAR only. The business-configured policy is **QAR / 3.65**, retained from the user's instruction. It is not a live market FX feed. All public totals show USD to two decimals. Each snapshot records the conversion policy, source currency and quotation timestamp. Change this policy only with business authorization and update tests.

Comparison groups match exact location IDs, mode/subtype, equipment/truck configuration, service name, and inclusion/exclusion sets. Names and condition sets are case-insensitive; port IDs are never merged based on similar names. Different carriers, divisors and billing models can compete within an otherwise equivalent service because the server compares their complete payable shipment totals. Distinct services/conditions are selectable separately. No automatic equivalence is inferred from missing charges.

Winner: lowest USD total after all charges, then earliest rate creation timestamp, then lexicographically smallest UUID. All quotations remain internal. Admin preview shows comparable current drafts/pending/approved tariffs with total differences; only approved tariffs can win publicly.

## Validity, expiry and enquiry integration

Dates are inclusive in `Asia/Qatar`; there is no weekly display or weekly cutoff. Future and expired rates are excluded in every server calculation. An expired approved rate transitions to expired with one audit event on the next transaction; no scheduler is required to hide it. The next eligible published rate is selected for the next calculation.

Estimate expiry is the earlier of 24 hours or the tariff's final Qatar day. An open calculator removes the amount on expiry and checks its quotation every 30 seconds for withdrawal/revision changes. Retrieving a withdrawn/revised/expired quotation returns the shipment with no current amount, while preserving the original internal snapshot.

Request Booking and Contact Our Team open `/customer/rfq/new?live_quote=<UUID>`. The existing RFQ form fetches the server snapshot and prefills locations, mode, container, normalized cargo measurements and a detailed note with reference and conditions. The reference survives a login redirect via sessionStorage; price data does not. These actions start an enquiry, not a confirmed booking or automatic email. Existing RFQ submission and operational status handling remain authoritative. Quotation history shows the latest 100 snapshots per tariff; all snapshots remain stored.

When no rate matches, a shipment-only reference is saved and the UI displays: “Live pricing is currently unavailable for this shipment. Request a custom quotation.” No fallback prices are invented.

## API

Base: `/api/live-pricing`. JSON, same-origin, `Cache-Control: no-store`.

| Method/path | Access / purpose |
| --- | --- |
| GET /catalog | Public current route/service combinations; no tariffs or owners |
| GET /locations | Public reference location/country directory for enquiries |
| POST /quotes | Public; `{group, shipment}`; calculates and saves an estimate or unavailable snapshot |
| GET /quotes/:uuid | Public possession of unguessable reference; current usability plus shipment |
| POST /enquiries | Public contact step; validates phone/email/route, assigns one recipient, sends enquiry and returns only reference/delivery state |
| GET /enquiry-settings | Admin only; sender configuration and recipients, never the password |
| PUT /enquiry-settings | Admin only; verifies enabled SMTP configuration, saves recipients and encrypted password |
| GET /enquiries | Admin only; latest 50 contact/route snapshots, assignments and delivery outcomes |
| GET /rates?page=&status=&search= | Owner-filtered list; admin all; 30 rows/page |
| POST /rates | Operator/admin; `{config}`; creates draft |
| PUT /rates/:id | Owner/admin; `{version, config}`; creates new draft revision |
| POST /rates/:id/action | `{version, action, reason?}`; submit/approve/reject/inactive/archive/duplicate |
| GET /rates/:id/history | Owner/admin; revisions, audit, recent quotation snapshots |
| POST /preview | Operator/admin; `{config, shipment}`; no persistence or publication |
| POST /comparison | Admin only; comparable tariff totals for the preview shipment |
| POST /road-locations | Operator/admin; validated `{name, country}` |

Bearer tokens are required for protected operations; query-string tokens are rejected. No cookie-based authorization is introduced. Cross-site browser writes are rejected. SQL is parameterized. Payload limit is 256 KB, cargo limit 100 rows, total package limit one million. Throttling is 120 requests/client/minute, including at most 20 quotations/client/minute. Sensitive database errors are logged by code, never returned with SQL or credentials.

Behind a reverse proxy, only loopback peers or explicitly configured exact addresses in optional `LIVE_PRICING_PROXY_IPS` may supply the final X-Forwarded-For address. Configure the proxy to append or overwrite that header. Never trust arbitrary forwarded headers. This optional setting does not replace or alter database configuration.

## Verification results

- 25 pricing tests: tier boundaries, unit/quantity normalization, chargeable weight, rounding/minimums, weight breaks, LCL models, all six supported FCL size/type combinations, truck models, capacity, currency, eligibility and deterministic ties.
- Database/API integration passed on an isolated MariaDB 11.4 instance: persistence, real role checks despite forged token role, other-operator read/write denial, approval-only publication, better pending price isolation, QAR comparison, immutable history, stale revision conflicts, concurrent approval, unavailable estimates and expiry audit.
- 3 existing port catalog tests passed. Combined automated run: **29 tests passed, zero failures**.
- Real Chromium/Edge browser checks passed: AIR/LCL/FCL/TRUCK pricing, Add More/removal, FCL hiding cargo dimensions, 320/390px calculator overflow checks, operator submission, admin publication, mobile operator editor and server-snapshot RFQ prefilling. Browser fixtures exist only in a disposable test database.
- React/Vite production build and Next production static export passed; TypeScript passed.
- Existing title/description/keywords/H1/canonical invariants verified across 46 public pages using `scripts/check-live-seo.cjs`.
- Deployment export validator checks homepage, login, settings, both RFQ routes and `/operator/live-rates`, plus referenced assets.

These checks are local. Production credentials, SMTP delivery, live shipment providers and the remote hosting restart have not been exercised by this implementation.

### Running checks

```sh
node --test backend/test/live-pricing.test.mjs backend/test/port-catalog.test.js
node scripts/check-live-seo.cjs <pre-change-commit>
node scripts/check-deployment.cjs
```

Database tests require a disposable **loopback-only** MySQL/MariaDB server. Set `LIVE_TEST_DB_PASSWORD` and optionally `LIVE_TEST_DB_PORT` (default 3308 for integration). They create a random `argus_live_test_*` database and drop that database afterward. They never load the application's database credentials.

```sh
node --test backend/test/live-pricing.integration.cjs
```

Browser tests additionally require `LIVE_TEST_PLAYWRIGHT` (installed Playwright module path), `LIVE_TEST_EXPORT` (completed Next export directory), and optionally `LIVE_TEST_BROWSER` (Chromium executable). Browser test port defaults to 3309. Build the landing site first. Run `node backend/test/live-pricing.browser.cjs`. The test uses an isolated backend, masks unrelated APIs and performs no external message delivery.

## Deployment

1. Back up the existing database and current complete site release. Preserve existing `.env` files and all database credentials.
2. Include the new backend/shared/migration files **and** the complete rebuilt `frontend/out` export in the release. Retain `frontend/lib/data/port-catalog.json`, which the backend reuses as its reference directory. The server serves `frontend/out/index.html`; omitting this directory causes the previously reported ENOENT failure. Keep it tracked under this repository's current deployment convention.
3. Build using the existing pipeline: `npm run build:landing`, `npm run copy:landing`, `npm run build:frontend`, `npm run merge:landing`. Run the export validator. Use the supported Node version for the installed Vite toolchain (local verification: Node 24).
4. Apply `database/migrations/20261017_live_pricing.sql` to the **existing application database**, or permit the backend's idempotent first-request migration to run. Creating missing tables requires CREATE/INDEX/REFERENCES privileges. When all tables already exist, initialization skips DDL and only imports missing reference rows using normal INSERT permission. Location reference rows are imported by the backend; SQL alone does not import them. No production rate entries are seeded.
5. Restart the existing Node backend through the hosting panel/Passenger configuration. Do not create a second backend or replace authentication settings.
6. Request `/api/live-pricing/catalog`. Before publication it should return HTTP 200 with empty groups, not a database error. Verify `/api/live-pricing/locations` contains the directory. On 503, inspect backend log error codes and schema privileges; do not replace working credentials or fabricate options. `ECONNREFUSED` means the configured database host/port is not accepting connections: start the existing MySQL service or restore its network availability. A running frontend and Node API do not imply that MySQL is running. During an outage, `/locations` can return the imported workbook directory with `directory_source: "reference"`; that restores port selection only, not instant pricing or saved quotations. Custom road locations require the database. The location endpoint has bounded in-memory throttling, while pricing continues to use database-backed throttling and fails closed.
7. Sign in with an existing operator account, open **Freight Live Rates**, enter an actual customer tariff, preview, save and submit. Sign in with an existing admin account to review and approve the exact revision. No sample operator login was added.
8. Verify the real route through the homepage, test the enquiry handoff, and smoke-test existing login, RFQ, tracking and contact flows against the deployed services. Keep rates private until this business review is complete.

Rollback the code/export as a complete release. Leave the additive `live_*` tables intact to retain history; do not drop production records as part of rollback.

## Calculator search overlay

The homepage begins with POL, POD, transport mode and Search. Search validates the selected route and mode, then opens a contact step in a native modal dialog over a translucent, blurred backdrop. The visitor selects a phone country/calling code and enters a phone number and email. Continue explains that the details and selected route are emailed to an Argus operator. Shipment details appear only after the configured SMTP server accepts the enquiry. Errors leave the contact step open for a retry or contact-team link. No price request happens until Check Price is submitted with shipment details. Route, mode, contact, cargo and results remain in component state when the dialog is closed and reopened. The dialog uses native background inertness and keyboard focus containment, restores focus to Search on close, locks background scrolling, and scrolls internally on small screens. Close, Escape and backdrop click dismiss it. Database availability and publication rules still apply.

## Enquiry email setup and routing

In **Admin → Settings → Live Calculator — Enquiry Email**, configure SMTP host, port (587 STARTTLS or 465 TLS), sender email and password/app password, then enable delivery. Save verifies the connection without sending a test message. Blank password retains the existing encrypted secret; it is never returned by the API. SMTP uses certificate verification, mandatory TLS and bounded timeouts. Passwords use authenticated AES-256-GCM encryption with a key derived from the existing `ENCRYPTION_KEY`, or `JWT_SECRET` if the former is absent. Preserve that key across deployments; rotating it requires re-entering this SMTP password. No database credentials or other SMTP settings are changed.

The initial recipients are `op2@argusshipping.co`, `cs@argusshipping.co`, and `jabir@argusshipping.co`, all Global. They are initialized once; removing them does not cause them to reappear. Admins can add/remove recipient emails and choose one phone country per recipient. The customer’s **selected phone country**, not POL/POD, determines routing. Country-specific matches take priority; if none exist, Global entries form the fallback pool. One recipient is selected by persisted round-robin rotation within that pool. No eligible recipient means an explicit unavailable response, not sending to an unrelated country.

Migration `database/migrations/20261017_live_enquiries.sql` adds `live_enquiries` (contact and route snapshot, assigned recipient, request hash, delivery status, attempt count and timestamps) and `live_enquiry_rotation` (persisted per-pool cursor). Sender/recipient configuration uses the existing `app_settings` row `live_enquiry_email`. Schema initialization is idempotent and uses an advisory lock. Settings changes are recorded in existing `live_rate_audits` without SMTP secrets. The migration and `shared/phoneCountries.json` must ship with the backend; the country/calling-code directory reuses the existing portal’s data.

Assignment and cursor advance are transactional. A client UUID and normalized payload hash make repeat Continue requests idempotent; an atomic claim prevents concurrent sends. Confirmed failed attempts can retry the same assignment. SMTP timeouts with uncertain acceptance are marked `uncertain` and never automatically resent. A process interruption can leave `sending`; inspect the sender’s delivery logs before manual intervention. Stable Message-ID helps trace attempts but does not guarantee downstream inbox delivery. `sent` means SMTP acceptance, not that the recipient read or received it in the inbox.

The admin card lists recent delivery outcomes. Contact details and recipient assignments are never exposed through public read APIs. Public enquiry requests are throttled to five per client per minute and 120 globally per minute, in addition to existing API limits. Only existing, active administrator accounts can read or change settings/history; operator tokens cannot do so even if their claimed token role is forged. No SMTP credentials or recipient addresses are accepted from public requests.

Validation: 32 automated tests passed against an isolated loopback MariaDB, including pricing, country/global routing, persistent rotation, idempotency, concurrent send claims, definite failure retries, uncertain delivery, SMTP secret masking, role enforcement, cross-site rejection and throttling. Test transports intercept email locally; no messages are sent to the real operator addresses by tests. Run `node --test backend/test/live-enquiries.integration.cjs` with the same disposable test database environment used for other integration tests.

## Future improvements

For substantially higher traffic, replace global transaction serialization with lane-scoped locks and date-aware catalog caching. Add explicit business-managed exchange-rate versions if currencies beyond USD/QAR are needed. Consider notification delivery, richer location deduplication review, cursor pagination for historical quotes, and linking the existing RFQ record ID back to the estimate for unified operational reporting. None is required for the implemented calculation/publication workflow.
