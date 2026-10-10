# Weekly Freight Rate System

Implementation and local verification: 10 October 2026. This feature is implemented in the existing repository; it has **not been deployed to argusshipping.co**. The production database was not reachable from this environment. Database tests used an isolated local MariaDB 11.4.5 server with real InnoDB persistence.

## Architecture and integration

The actual repository stack is React 19/Vite for the public site, Next.js 14/React 18 for the staff/customer portal, Express 4, mysql2 and MySQL-compatible SQL. The older root README's PostgreSQL description is outdated. Existing JWT login, existing `users` records and the `operator`/`admin` roles are reused. No parallel login system was introduced.

Public routes:

- `/`: the weekly preview follows the existing global network section.
- `/freight-rates`: searchable rates, current Qatar week and selected shipment date.

Staff routes:

- `/operator/freight-rates`: submission, own rates, revisions and attachments.
- `/admin/freight-rates`: all operator offers, best-cost badges, differences, withdrawal/archive, explicit markup and equipment/location configuration.

The existing desktop sidebar and mobile Other menu link to the staff feature. The public navigation links to `/freight-rates`. New staff HTML contains `noindex, nofollow`; robots excludes `/admin/`, `/operator/` and `/api/`. Static staff shells contain no private rates; every data request requires server authorization.

The public section reuses repository design tokens: light `--bg-primary: #FAF8F4`, `--accent: #B48214`, existing typography, surfaces, borders and explicit dark-theme preference. Live-site fetching was unavailable, so repository tokens were the verified design source. Existing public H1s, canonical URLs, metadata and page content were preserved.

## Database model and migration

Run `npm run migrate:freight --prefix backend` before deploying the new API. The existing cPanel `deploy.sh` now runs it and fails deployment if it fails. This reads `database/migrations/20261010_weekly_freight.sql` through the existing database pool, then runs `backend/scripts/import-freight-locations.js` and `backend/scripts/migrate-freight-publication.js`. It creates feature tables and adds nullable location metadata columns to existing freight installations. It does not alter users, customer records, shipments or quotations, and seeds no prices.

| Table | Purpose |
| --- | --- |
| `freight_locations` | Stable facility IDs, ISO country code, country name, port name, AIR/SEA mode, explicit aliases and active flag |
| `freight_container_types` | Exact equipment codes; initial 20GP, 40GP, 40HQ; administrator additions |
| `freight_rates` | Stable UUID, existing owner ID, current revision pointer, state, explicit markup and timestamps |
| `freight_rate_revisions` | Immutable price, validity, location, equipment, service and term snapshots |
| `freight_rate_approvals` | Retained historical administrator decisions; no new approval is required or written |
| `freight_operator_contacts` | Each operator/admin’s own business WhatsApp country, calling code and national/international digits |
| `freight_schema_migrations` | One-time automatic-publication policy upgrade marker |
| `freight_rate_audit_logs` | Append-only submit/revise/decision/configuration/attachment activity |
| `freight_rate_attachments` | Private PDFs associated with a precise revision; stored in the database |
| `freight_write_lock` | InnoDB transaction serialization for all feature mutations |
| `freight_request_limits` | Database-backed throttling shared across API processes |

The relational identity/validity/price fields are typed and indexed. Optional carrier, transit time, private notes, quotation reference and charge lists are stored as JSON within each immutable revision. Foreign keys retain ownership and history. CHECK constraints enforce distinct ports, positive price, nonnegative surcharges, date ordering and consistent confirmed totals.

Money uses integer minor units (cents), not floating-point input arithmetic. USD, QAR and EUR are the configured two-decimal currencies. Each base/surcharge input must be below 100,000,000. Timestamps are explicitly written using `UTC_TIMESTAMP(3)` and presented in Asia/Qatar. Validity dates are DATE values, never interpreted as midnight in the viewer's timezone.

Migration prerequisites: utf8mb4 database/table encoding for international facility names, InnoDB, CTEs and window functions, JSON, enforced CHECK constraints; use MySQL 8.0.16+ or compatible MariaDB (11.4.5 tested). Existing application initialization must already have created `users`, including `is_deleted` and `is_stalled`, which existing authentication also requires. Migration uses a named advisory lock. MySQL DDL auto-commits; each statement is idempotent so a failed additive migration can be inspected and rerun. Test/staging validation on the production engine/version is required before release.

## Country and port dropdown update — 10 October 2026

Source: user-supplied `Worldwide_Airports_Seaports.xlsx`, worksheet `GLOBAL_PORTS`, columns Country / Port / Mode. SHA-256: `1900bc9e437d8b42afef9bec4c8b034e426491a954f141126c9c521175f4543c`. The workbook was read as data and was not modified. All 1,938 distinct rows are retained: 1,060 airports and 878 seaports. Country choices include 249 ISO countries/territories plus Kosovo, including countries with no facilities in the workbook. Workbook names and common country aliases are retained; ISO country codes connect the UI to database locations.

- Both operator/customer RFQ forms use the same searchable port component. Partial, case-insensitive, accent-insensitive name searches show Airport/Seaport badges. Air/Sea filters restrict the suggestions; changing transport mode clears the previous POL/POD. Existing RFQ free-text handling and submission APIs remain available for road or unlisted locations.
- My Freight Rates and the shared administrator form have required Origin Country and Destination Country selectors, with dependent POL/POD selectors. Changing country clears the port. Ports save stable IDs rather than typed text. Container freight only offers seaports; the server also rejects known airport IDs for these container services. Countries are derived from the selected facilities, not trusted from arbitrary request labels.
- The weekly table, staff route labels and public suggestions display `Country, Port name`. Request Quote includes these country/port labels in the winning operator’s WhatsApp enquiry (updated policy below).
- The combobox supports mouse/touch, arrow keys, Enter, Escape, focus handling, ARIA listbox/combobox semantics and required-selection validation. Country choices remain scrollable; port suggestions show up to 80 matching results at a time with an explicit narrowing hint. This limit affects suggestions only, not stored ports or public rates.
- Four existing facility IDs (`CNSHA`, `QAHMD`, `AEJEA`, `SGSIN`) are retained through explicit mappings. The workbook has no facility codes; other IDs are deterministic internal AIR_/SEA_ identifiers and are **not asserted to be UN/LOCODE or IATA codes**. Same-name ports in different countries remain distinct (for example, Doha Port in Kuwait and Qatar). Airport and seaport identities are never merged.
- Import runs under the existing migration advisory lock and freight write lock. Missing columns are added individually; catalog writes are transactional. Re-import is idempotent, preserves custom locations and disabled flags, retains all revisions/approvals, and stops on conflicting existing identities. It never inserts prices or enables disabled facilities.

For an intentional future catalog refresh, review the supplied file first, run `python scripts/extract-port-workbook.py <workbook.xlsx>` in a maintenance environment with openpyxl, then `node scripts/build-port-catalog.mjs`. Review generated source/catalog changes, identities and tests before running the database migration and rebuilding the portal. Normal deployment needs only the checked-in JSON and Node scripts, not Python or the original workbook. Source name changes require identity review before import; do not regenerate and merge distinct facilities automatically.

Verification: 37 automated checks passed with real MariaDB persistence, including every workbook row, catalog counts/countries, distinct facility identities, airport rejection, country searches/public formatting and preservation of revisions/approvals/disabled flags on re-import. Browser checks verified both RFQ modes, keyboard selection, country-dependent clearing, editing existing rates, public country-first labels and quote prefill. At 390px viewport width the page and dropdown stayed within 390px. Temporary verification screenshots were removed during release cleanup.

## Roles and security

| Role | Permissions |
| --- | --- |
| Anonymous/customer/sales/calling agent | Public catalog and active eligible public prices only |
| Operator | Create a submission, list own submissions, revise/withdraw own records, own history/PDFs and own WhatsApp settings |
| Administrator | All submissions/history/PDFs, explicit markup, archive, catalog configuration and own WhatsApp settings |

Every protected request requires `Authorization: Bearer <existing JWT>`. Query-string tokens are explicitly disallowed for freight endpoints, including downloads. After existing JWT verification, the feature reads the current database user, role and deleted/stalled flags rather than trusting stale role claims. Ownership is checked before edits, withdrawal, history or attachments. Ordinary operator responses never include another operator's rates, group minima or savings.

SQL is parameterized, dynamic sorting is allowlisted, string lengths and monetary/date inputs are validated, JSON input is capped at 32 KB, and actions are role-allowlisted. The feature accepts no ambient cookie authentication; custom bearer authorization plus the existing CORS policy protects mutations from cross-site form CSRF. Cross-site Fetch Metadata mutations are also rejected. Retain correct origin/proxy configuration at deployment.

Limits are 180 requests per IP per minute and 30 writes per authenticated user per minute, stored in MySQL and shared by processes. Expired buckets are pruned in bounded batches. Behind a proxy, set trust-proxy to the verified deployment topology; do not trust arbitrary forwarded client addresses. Existing server proxy settings were not changed.

PDFs are limited to 5 MB and five attachments per revision. Uploads require an active current revision, declared multipart input and a PDF signature. There is no public uploads path. Downloads require the same owner/admin authorization, use a sanitized attachment filename and restrictive sandbox/nosniff handling. These checks are not a malware scanner; add scanning before accepting attachments from untrusted external suppliers at scale.

The public response is a strict allowlist: public rate reference, stable facility IDs, ports, equipment, service/basis, validity, customer price/currency and public inclusions/exclusions. It includes only a `whatsapp_available` flag, not raw contact digits. The quote redirect deliberately exposes the rate owner’s configured business WhatsApp destination to the requesting customer. It never includes owner/supplier/carrier identity, procurement breakdown, markup, private quotation references, remarks, PDFs or history. Staff should enter only customer-facing charge descriptions into the inclusions/exclusions fields.

## Comparison rules

The trusted SQL engine partitions by a SHA-256 key of exact origin facility ID, destination facility ID, equipment, service, shipment basis and canonicalized inclusion/exclusion lists; currency is a separate partition key. Charge lists are trimmed, case-normalized, whitespace-normalized, de-duplicated and sorted. Different port identifiers remain separate even if their aliases overlap. Location identity/name/country cannot silently be reassigned after creation; create a separate facility when needed.

An eligible quotation must:

1. Have active status (the same eligibility rule internally and publicly).
2. Belong to an active, non-deleted owner and use active locations/equipment.
3. Include the queried date in its inclusive validity interval.
4. Explicitly confirm all mandatory charges for its service scope.
5. Supply mandatory surcharge total explicitly, including `0` when none applies.

The internal comparison uses `base_minor + surcharge_minor`. Unknown surcharges remain NULL and cannot win or publish. A low base rate with high mandatory charges cannot beat a lower equivalent total. Differing charge inclusions/exclusions create separate groups. The confirmation means exclusions are outside the stated service scope; operators must not declare required charges outside the total. Operators are responsible for accurate totals and customer-facing conditions; administrators can inspect or archive inaccurate records.

**No exchange-rate source was configured.** Cross-currency conversion is intentionally disabled. USD, QAR and EUR remain independently labeled groups; no implied conversion or cross-currency cheapest claim is made. A future verified FX implementation must store source, timestamp, effective date and applied conversion with the decision before currencies can be ranked together.

Internal ties resolve by earliest original submission timestamp, then lexicographically smallest UUID. All tied records remain visible internally. An administrator's operator/search filters apply after ranking, so hiding a competitor does not make a higher offer the best. Pagination similarly does not change the global comparison result.

Public ranking considers active eligible customer totals within each equivalent group. If explicitly configured margins differ, the lowest customer price wins; the administrator badge remains the procurement-cost winner. This keeps procurement cost and sale price separate without claiming a higher customer price is cheapest.

## Automatic publication and lifecycle

The user explicitly removed freight approval on 10 October 2026. This supersedes the original approval requirement, and does not change the unrelated shipment/RFQ Approvals module.

- Saving a valid submission or revision immediately sets it active. The server recalculates the cheapest eligible price on every read; the public UI refreshes within one minute or when the tab becomes visible.
- Current valid active rates with confirmed mandatory charges can publish automatically. Unknown-charge, future-dated and expired rates cannot appear as current prices.
- The migration activates existing pending and approved submissions once, records previous status in audit logs, and preserves revisions and historical approvals. Rejected, withdrawn and archived records stay inactive. Subsequent migration runs do not reactivate them.
- Operators can edit/withdraw their own rates. Editing creates an immutable revision and activates it. Archived records cannot be edited. Records are never permanently deleted by this feature.
- Admins retain comparison, archive, withdrawal and explicit markup controls. Approval/rejection actions are rejected by the API. Legacy rejected status is retained only for history/filtering.
- Markup defaults to zero. An administrator may explicitly set 0–100%, stored in basis points. It is retained across edits; customer cents round upward only when the configured markup yields fractional cents. Markup changes are audited separately from submission history.
- Withdrawal, expiry, archiving or disabled ownership/catalog immediately removes eligibility on the next query. The next cheapest active eligible offer publishes automatically. With no candidate, the unavailable state replaces the amount.

All mutations acquire the feature lock row in an InnoDB transaction. Saves require the current revision version; audit and state changes commit together. Concurrent edits cannot both replace the same revision. The coarse feature lock favors straightforward correctness at present volume; per-group locking is a future scaling option.

## Dates, expiry and weekly discovery

“This Week” is Monday–Sunday in **Asia/Qatar**, calculated by the API. The public default is today's Qatar business date, with an optional date within the current week. Different dates can select different active winners. Choose another day to discover offers whose intervals overlap only part of the week; each row includes its exact valid-until date and the full interval in Price conditions.

Expiry does not require a cron job or mutable winner cache: every API query filters validity and ranks current eligible rows. Future prices are never represented as valid today. A deliberately chosen historical day within the current week shows that day's applicable offers, clearly labeled. The public client refetches every minute and on tab visibility; an open default-today view advances across Qatar midnight. APIs use `Cache-Control: no-store`. On load failure, amounts are cleared and an error/retry state replaces them; no stale fallback amount is invented.

## Public interface and quotation integration

The public table renders exactly one row per origin/destination facility-ID pair. Multiple equipment, currencies or incompatible price conditions appear as selectable options inside that row. Every option remains a server-selected cheapest offer within its equivalent comparison group. The first option follows the stable server order; it is not a claim that one currency/equipment/basis is cheaper than another. Changing the option updates price, terms, expiry and WhatsApp reference together. Loading more results merges options into existing route rows without duplicating those rows.

Desktop uses a 484px maximum scroll viewport with sticky headers and approximately 4–5 regular rows visible. All results remain accessible, with up to 100 winners per API page and Load more. At widths of 760px or less, each table row becomes a compact two-column card with labeled origin/destination, price, container, validity and Request Quote. The mobile list scrolls vertically within 70vh; there is no sideways table scrolling. Semantic table roles and an accessible hidden header are retained. Inputs are 16px on mobile, actions have 44px touch targets, and the scroll region is keyboard-focusable.

Origin and destination filters are independent case-insensitive partial searches across names, facility IDs and aliases. Queries debounce for 250ms; equipment/date filters also apply. Unknown search text returns no invented locations or prices.

### WhatsApp Settings and Request Quote

Operators and administrators have **Settings → WhatsApp enquiries**. Select a country/calling code using the searchable dropdown, enter the remaining national number, and save. The API validates the country/code against the shared checked-in catalog and stores international digits with the authenticated user's ID. It ignores client-supplied owner IDs. Existing personal-profile contact fields are not reused. Use a business number; the screen explains that it becomes available through public enquiries. Syntax validation does not verify WhatsApp registration or number ownership.

Request Quote now opens a server-validated WhatsApp draft addressed to the **owner of that particular winning rate**, rather than the general company number or an administrator. It includes the exact requested wording:

```text
I am interested in the given Quote in the Website
POL: <Country, Port name>
POD: <Country, Port name>
Container: <equipment>
Rate: <currency and displayed customer price>
```

The customer still presses Send in WhatsApp. The redirect endpoint checks the current week's selected date, current winning ID/revision and exact displayed customer price before generating the URL. Stale/nonwinning/withdrawn prices return a friendly refresh message, never an outdated quote. It uses the current saved contact, so updating Settings applies to existing rates. No operator name, procurement price or internal history is included. Public lists expose only a contact-availability flag; requesting the redirect necessarily reveals the configured business destination. If no number is saved, the public amount remains ranked normally but Request Quote is disabled with a clear explanation; the staff dashboard links to Settings.

The existing RFQ forms and their earlier quote-prefill support remain available; their persistence and submission APIs are unchanged. The weekly rate button now uses WhatsApp as explicitly requested. No outbound WhatsApp message is sent automatically or during tests.

## API reference

Base path: `/api/freight-rates`. Mutation bodies are JSON except PDF uploads.

| Method/path | Access | Purpose |
| --- | --- | --- |
| `GET /catalog` | Public | Location/equipment catalogs and allowed currencies/services/bases |
| `GET /public` | Public | Active eligible winners; `origin`, `destination`, `container`, `date`, `offset` |
| `GET /quote/:id` | Public | Recheck `version`, selected `date`, exact `price`; 303 to the winning owner’s WhatsApp draft, or friendly stale/unavailable response |
| `GET /contact-settings` | Operator/admin | Own WhatsApp setting only |
| `PUT /contact-settings` | Operator/admin | Save own `country`, `calling_code`, `national_number` |
| `GET /` | Operator/admin | Own/all submissions; above filters plus `operator` (admin), `status`, `from`, `until`, `sort` (`newest`, `route`, `price`), `offset` |
| `POST /` | Operator/admin | Validate and create active revision 1 |
| `PUT /:id` | Owner/admin | Validate and create new active revision; requires current `version` |
| `POST /:id/decision` | Owner/admin | `action`, `version`, `date`, `reason`, optional explicit `markup_bps`; admin markup/withdraw/archive; only withdraw for ordinary operators |
| `GET /:id/history` | Owner/admin | Snapshots, audit events, approvals, attachment metadata |
| `POST /:id/attachments` | Owner/admin | Multipart `file` and current `version`; PDF only |
| `GET /attachments/:id` | Owner/admin | Authenticated PDF download |
| `POST /config/containers` | Admin | `code`, `label`, boolean `active` |
| `POST /config/locations` | Admin | Stable `id`, `name`, ISO country, aliases array, boolean `active` |

Create/update requires `origin_id`, `destination_id`, `container_type`, `service`, `basis`, `currency`, ISO `valid_from` and `valid_until`, decimal `price`, explicit surcharge/charge confirmation, `inclusions` and `exclusions` arrays. Optional `carrier`, `transit_time`, `remarks`, `quotation_reference`, `surcharge_details` are revisioned. Unsupported/missing catalog identifiers are rejected. An unconfirmed-charge submission may be stored but cannot be ranked or published.

Internal lists return 50 records per page. Both list endpoints return `nextOffset` or null. Public results also return the authoritative query date, Qatar today and week bounds. Typical errors: 400 validation, 401 missing/expired login, 403 role/CSRF, 404 inaccessible record, 409 stale revision/nonwinner/state conflict, 413 body too large, 429 throttled. Database failures return a generic 500 without sensitive SQL/data.

## Verification results

Automated verification uses Node 24.16, real MariaDB 11.4.5, isolated newly created databases and the production feature router/service. It does not substitute arrays or localStorage for database storage.

```powershell
$env:FREIGHT_TEST_DB_URL = 'mysql://TEST_USER:TEST_PASSWORD@127.0.0.1:3308'
npm run test:freight --prefix backend
node frontend/node_modules/typescript/bin/tsc --noEmit -p frontend/tsconfig.json
npm run build:landing
npm run build --prefix frontend
node scripts/merge-build.cjs
node scripts/check-freight-build.mjs dist frontend/out
```

The integration harness rejects non-localhost database hosts, creates a unique `argus_freight_test_<pid>_<timestamp>` database, runs the migration twice, and drops only that database afterward. It requires create/drop test-database privileges. Without `FREIGHT_TEST_DB_URL`, integration is explicitly skipped; a unit-only pass is not a release signoff.

| Required case | Verified result |
| --- | --- |
| 1. Same lane, 1250 vs 1100 | Operator 2 selected and published automatically |
| 2. 20GP vs 40HQ | Separate winners/groups |
| 3. Expired cheapest | Expired/future cheap offers excluded |
| 4. Later 950 offer | Both internal and public winner change to 950 without approval |
| 5. Unauthorized operator | Edit, history, withdraw, attachments denied; HTTP ownership tested |
| 6. Search | Partial/case-insensitive combined search and alias matches; unrelated routes excluded |
| 7. Twenty records | Database returns all 20; browser shows 484px viewport, ~98.7px rows, 2019px scroll content, sticky headers; End key reaches scrollTop 1535 |
| 8. Incompatible basis | Service/equipment/ports/terms separated; unknown surcharges unranked; confirmed total beats misleading low base |
| 9. Weekly validity | Different Monday/Sunday offers selected; Qatar midnight and inclusive boundary tests |
| 10. Existing functionality | Existing public metadata/H1/canonicals preserved across 46 pre-existing pages; all 28 portal routes compile/export; existing login and quote-prefill verified in browser |

Additional checks cover deterministic ties, currencies, exact markup rounding, malformed input, withdrawn/rejected/archived states, immutable revisions, stale updates, concurrent revision/submission races, stalled users and stale JWT role claims, persistent throttling, PDF ownership/signatures and safe quote return URLs. **42 automated tests passed with no skips** on the documented run. TypeScript checking and lint of the new public React component passed. Vite prerendered 47 public pages; Next production build exported 28 routes. Production builds were checked in a temporary copy to avoid interrupting the user's running preview.

Browser checks verified dropdowns, automatic publication, mobile overflow and consolidated port-pair rows. Selecting another set of terms updates the displayed price, expiry and enquiry reference while the row count stays unchanged. No WhatsApp messages were sent. All demo rates, contacts, demo accounts and persistent browser-test databases were removed from the isolated local preview after verification. The empty-state UI is intentional until real operators enter real rates. Automated tests retain disposable in-memory/test-database inputs and never seed the running application.

The existing `scripts/check-seo.mjs` fails independently of this feature: it assumes all commercial pages have a `Service` schema even though the existing metadata emits `LocalBusiness`/`Article`, and its final homepage text assertion refers to an older H1. It was left unchanged. `check-freight-build.mjs` separately verifies all existing titles/descriptions/H1s/canonicals against the committed build, plus new page metadata/assets and private-route noindex.

Live shipment tracking providers, outbound quotation/contact email delivery and production authentication/database operations were not exercised or changed. Their existing source/API implementations remain intact. Complete staging smoke tests with actual integrations before calling the deployment production-ready. Vite retains the existing large-main-bundle warning; no new third-party runtime dependency was introduced.

## Deployment

1. Back up the existing database and current built artifacts. Confirm the actual database version, InnoDB/foreign keys, existing user-role columns, existing operator/admin accounts and HTTPS/CORS/proxy configuration. Use the established admin user-management screen to provision staff; the migration does not create them. Review and disable any pre-existing bootstrap/default credentials before exposure; automatic default-user seeding has been removed.
2. Install dependencies using the repository's lockfiles (`npm ci`, `npm ci --prefix backend`, `npm ci --prefix frontend`). Run the full integration suite against an isolated local/staging test server as above. Confirm migration compatibility on the deployment's exact MySQL/MariaDB version.
3. Deploy the migration scripts, `frontend/lib/data/port-catalog.json` and `frontend/lib/data/phone-codes.json` at their repository-relative paths. With the existing backend DB environment configured, run `npm run migrate:freight --prefix backend`. The import preserves location identities/history/disabled flags. The policy migration adds operator contacts and changes pending/approved rates to active once; deploy during a coordinated API maintenance window so old approval-based code cannot write after that marker is applied. Inspect errors and rerun only after resolving them. Keep backups; no destructive down migration is provided.
4. Build with the existing pipeline (`npm run build`) or the explicit landing/portal/merge commands above. Deploy the complete merged `frontend/out`, not just the new HTML. Deploy the new backend feature files and restart Express/cPanel Passenger through the established process. The source delivery does not retain regenerated tracked build artifacts; rebuild before publishing.
5. Verify catalog/API availability, public no-cache behavior, unauthorized API denial, staff noindex metadata, source links, desktop/mobile layout, existing login, tracking, contact and RFQ workflows in staging. New pages initially show the genuine unavailable state when there are no active eligible rates.
6. Verify facility IDs/aliases and equipment catalog with operations. Have real operators save their own business WhatsApp numbers and submit comparable offers. Confirm automatic cheapest publication, withdrawal fallback, phone layouts and the correct owner’s WhatsApp draft. Markup stays zero unless explicitly configured. Confirm unchanged tracking/contact/RFQ behavior with staging integrations.
7. Monitor feature API errors, latency, lock contention and throttling. No scheduler is required for expiry. Do not cache `/api/freight-rates/*` at a CDN or service worker.

Rollback: stop writes before reverting application assets/API deployment. Old approval-based code does not recognize active status; restoring that policy requires a reviewed status migration and explicit review of newly submitted prices, not blindly marking them approved. Retain additive tables and audit history, and remove navigation exposure through the code rollback. Do not drop freight tables or overwrite user/shipment/customer data as a rollback shortcut.

## Source cleanup and first use

No demo-account creator or persistent browser-fixture seeder ships with this feature. Backend startup no longer creates hardcoded default-password accounts. Existing production accounts/data are untouched. The local demo accounts and their freight records have been deleted and their old logins no longer work.

Use the existing admin user-management workflow for real staff. On an installation with no admin, the explicit `npm run reset-admin --prefix backend` maintenance command now requires `ADMIN_RESET_PASSWORD` (a unique secret of at least 16 characters), never prints it, and exits unsuccessfully if absent. It can reset an existing admin, so only run it intentionally. Configure the database on the server first, initialize the existing application schema, then apply the freight migration. Clear that process-scoped password after provisioning.

Server `backend/.env.cpanel` is removed from Git tracking and ignored, while the existing local file is preserved. The deployment script preserves an existing `backend/.env`; it may copy a server-provisioned `.env.cpanel` only when `.env` is absent. The previously committed DB/JWT/mail credentials must be rotated before publishing or reusing the repository; this cleanup does not rewrite Git history. Never commit replacement secrets.

Generated `.preview-build/`, `.login-check/`, `.slider-check/`, `.seo-audit-build/`, `.seo-audit-sandbox/`, `frontend/out/` and TypeScript build cache are untracked and ignored. Source assets in `public/` are retained; deployment builds and merges fresh outputs. The existing tracked `dist/` baseline is retained for the repository's regression checker. Ignore rules also keep temporary QA screenshots out of Git. Review the cleanup deletions alongside the new source files before committing; no commit or push was performed automatically.

## Future improvements

- Verified, date-specific FX ingestion with immutable conversion evidence and an explicit reporting-currency policy.
- Administrator-maintained standardized charge codes and commodity/service restrictions to reduce conservative text-term grouping.
- Indexed/paginated location search and audit history for larger catalogs; per-comparison-group locks after profiling.
- Attachment malware scanning and encrypted object storage with short-lived authorized downloads at larger volumes.
- CI browser automation against an ephemeral production-version MySQL instance, integration smoke checks with safe sandbox mail/tracking providers, and operational metrics/alerts.
- Shared client request caching and incremental/keyset pagination if published catalogs become very large; maintain publication/date correctness and private-data boundaries.
