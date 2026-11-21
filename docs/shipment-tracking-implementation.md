# Shipment Tracking Management — implementation and release notes

Date: 21 November 2026. Source implementation is complete for the workflows below; production deployment is **not verified**. Build, live database and browser gates remain outstanding because locked dependencies could not be installed in this environment. Do not deploy the old tracked static output with the new backend.

## Delivered behavior

- `/shipment-tracking`: authenticated operations page for administrators and assigned operators, with eight database-derived counts, 17 operational columns, filtering, numeric/date sorting, server pagination, overdue ETA and missing-data indicators.
- Registration defaults to selecting an existing confirmed shipment; no second shipment is created. Direct confirmed registration uses the existing `ARG-ddmmyyn-x` convention, checks customer identity, validates cargo and route details and creates central/operator/customer copies.
- Structured origin/destination, identification, cargo, estimated/actual schedules, reported location, messages and mode-specific fields. Existing port catalog offers country-dependent suggestions and manual locations. No port codes or coordinates are inferred.
- Single and bulk status/ETA/message updates, safe CSV export, public preview and copyable tracking links.
- Real append-only tracking events, separate occurrence/entry timestamps, public/private visibility, administrator corrections with reasons and protected audit history. Corrections supersede displayed events but retain originals in storage and audits. Legacy records start with an empty event history.
- Public results use a sanitized allowlist and a real event timeline. Matching viewers receive Socket.IO invalidations and refetch. Reconnect, visibility refresh, request coalescing/cancellation, manual refresh and a 30-second disconnected fallback are implemented.
- Route visualization requires supplied verified endpoint coordinates. No verified coordinate dataset is present, so current records show an honest unavailable-map state and reported location text. There is no carrier/GPS integration or fabricated movement.
- Existing direct booking links now open the new registration form. Confirmed contact edits use tracking PATCH. Legacy confirmed PUT is blocked to prevent bypassing event history; commercial status still uses its separate endpoint.

## Persistence and identity

Additive tables:

| Table | Purpose |
|---|---|
| `tracking_profiles` | Canonical shipment key, structured JSON details, version and update timestamps |
| `shipment_tracking_events` | Recorded observations and append-only corrections; FK to profile and corrected event |
| `shipment_tracking_audits` | Field before/after values, actor and time; FK to profile |
| `tracking_schema_migrations` | Completed migration marker |

No existing shipment columns are removed or altered. Existing operational fields are mirrored to each matching physical shipment table. Additional fields live once in the canonical profile, avoiding dozens of duplicated columns in every user table. Required missing user tables are cloned from the existing shipment schema before the transaction; an empty cloned table may remain if a later business write fails.

The key normalizes `cust_req_no`, falling back to `ref_no`, including ARG child suffix and legacy reference compatibility. A window query deduplicates confirmed central/user/call-enquiry candidates, preferring the central record. All confirmed families remain discoverable without inventing historical tracking events. Conflicting customer ownership and ambiguous public partial matches are rejected.

Updates use one raw mysql2 connection, a per-shipment database lock, an InnoDB transaction, profile/event/audit writes and synchronized existing copies. Any critical write failure rolls back the transaction and prevents notification. New reference allocation uses a separate creation lock; collisions with legacy generators fail safely rather than creating duplicate references. Existing non-confirmed copies receive tracking-field synchronization without altering their commercial status. Public eligibility remains based on confirmed records.

The PostgreSQL compatibility wrapper is preserved for existing code. New SQL uses the existing pool directly because transactions must share one connection.

## Permissions and privacy

- Administrator: all confirmed shipments, registration, tracking edits, financial fields, history corrections and audit inspection.
- Operator: assigned/owned shipments and direct registrations assigned to that operator; no financial fields.
- Sales/customer/rater/calling-agent: no tracking-management API access. Existing commercial workflows remain separate; shipment financial editing is now administrator-only.
- Fresh database role/disabled-account checks override stale JWT roles. Legacy shipment JSON responses redact financial fields for non-administrators; legacy direct mutations also check staff role and ownership.
- Public HTTP responses exclude contacts, customer names, internal notes and financial values. Socket payloads contain reference identifiers only and target one resolved, hashed shipment room.
- Legacy chat/notification room joins require a token and ownership check. Updated dashboard clients send tokens and rejoin after reconnecting.
- Public reads and socket subscriptions have bounded per-process/IP limits. Partial matching is allowed only for unambiguous references of at least eight characters; short/wildcard enumeration is rejected. Full reference variations remain supported.
- `/shipment-tracking` and query-bearing public results are noindex. Private-route indexing metadata does not replace API authorization.

## API

| Method | Path | Behavior |
|---|---|---|
| GET | `/api/shipments/tracking` | Scoped counts/list, filters, sorting and pagination |
| GET | `/api/shipments/tracking/:ref` | Authorized details and effective history |
| POST | `/api/shipments/tracking` | `method: existing` or `method: new` registration |
| POST | `/api/shipments/tracking/bulk` | Up to 100 independently authorized updates with per-reference results |
| PATCH | `/api/shipments/:ref_no/tracking` | Validated partial changes and transactional history |
| GET/POST | `/api/shipments/:ref_no/tracking/events` | Read/create recorded observations |
| PATCH | `/api/shipments/:ref_no/tracking/events/:id` | Administrator append-only correction with reason |
| GET | `/api/shipments/:ref_no/tracking/audit` | Administrator audit, latest 500 entries |
| GET | `/api/track/:ref` | Compatible public summary extended with structured data and real events |

Public sockets: `tracking:subscribe({ref}, ack)`, `tracking:unsubscribe`, and reference-only `shipment_tracking_updated`. Arbitrary private `joinRoom` access is no longer accepted.

## Files

Created:

- `backend/src/tracking/{domain,service,router,realtime,schema}.js`
- `backend/scripts/migrate-tracking.js`
- `backend/test/tracking-{domain,service,realtime,schema}.test.cjs`
- `backend/test/tracking-mysql.integration.cjs`
- `frontend/app/shipment-tracking/page.tsx`
- `frontend/components/tracking/{model.ts,TrackingEditor.tsx,TrackingTimeline.tsx,TrackingStage.tsx}`
- `frontend/test/tracking-model.test.cjs`
- `src/hooks/useShipmentTracking.js`, `src/utils/trackingPublic.js`, `test/public-tracking.test.mjs`

Modified:

- `backend/src/server.js`, `backend/src/routes/{shipments,tracking}.js`, `backend/src/controllers/shipmentController.js`
- `frontend/app/confirmed/page.tsx`
- `frontend/components/layout/{AppLayout,Sidebar,NotificationListener}.tsx`
- `frontend/components/modals/{ConfirmedShipmentModal,RFQDetailModal}.tsx`
- `src/components/{ShipmentTracker.jsx,ShipmentTracker.css,Globe3D.jsx}`, `src/pages/Tracking.jsx`
- `shared/seo-policy.cjs`, `scripts/seo.test.mjs`, `vite.config.js`
- Root/backend `package.json` scripts; no dependencies added and lockfiles unchanged.

## Verification performed

- `npm run test:tracking`: 53 passing unit/behavior/helper tests; live MySQL integration is explicitly skipped unless configured. Service/schema tests use a database fake and socket tests use an injected token verifier. They establish application control flow, not SQL-engine or JWT-library correctness.
- Targeted noindex policy test: passed.
- JavaScript syntax, JSX/TSX parser checks and `git diff --check`: passed.
- Cached-tool checks: public targeted ESLint passed; two isolated frontend modules passed strict TypeScript checking; changed dashboard files passed TypeScript transpile syntax checks. These do not replace a locked full-project build.
- `npm ci` in all three packages failed with registry access/cache issues. Offline retries failed on missing locked tarballs. Existing cached tools differed from project versions and were isolated in `/tmp`; manifests/locks were not rewritten to use them.
- Root lint, landing build, dashboard lint/build and full type checking could not complete because dependencies were missing. Existing SEO tests: 8 passed; 1 could not load Express. Broad backend checks with recovered exact cached packages: 77 passed, 9 files failed to load missing dependencies, and 1 live integration test was skipped.
- `node backend/scripts/migrate-tracking.js --check` could not load `mysql2/promise`. No application database migration or data writes were executed.
- Desktop/tablet/mobile browser behavior and real MySQL/HTTP/Socket.IO integration remain unverified.

## Deployment and remaining gates

1. Install the committed dependencies with the normal registry access in root, backend and frontend.
2. Use MySQL 8.0+ (or compatible MariaDB with window functions, JSON and REGEXP_REPLACE). Existing shipment/call-enquiry and tracking tables must be InnoDB. The migration refuses incompatible storage engines and does not convert them.
3. Using the existing backend `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME` configuration, run:

   ```sh
   node backend/scripts/migrate-tracking.js --up
   node backend/scripts/migrate-tracking.js --check
   ```

   Apply the migration before activating the new application. Tracking APIs fail closed with 503 if the migration is missing. DDL is idempotent and not presented as transactionally reversible; no legacy history is backfilled.
4. Run `npm run test:tracking`, the existing test/lint commands, `frontend/node_modules/.bin/tsc --noEmit -p frontend/tsconfig.json`, and the full project build. Rebuild/merge the static frontend output using the normal project pipeline; this session did not regenerate deployable output.
5. On an isolated test MySQL server with CREATE/DROP DATABASE and CREATE TRIGGER privileges, export test-server DB credentials separately and run:

   ```sh
   TRACKING_TEST_MYSQL=1 TRACKING_TEST_DB=argus_tracking_test_local \
     node --test backend/test/tracking-mysql.integration.cjs
   ```

   This test generates and drops only its own randomly suffixed test database; it ignores application `DB_NAME`. It exercises real SQL, registration, deduplication, permissions, HTTP routes and trigger-induced rollback.
6. Verify browser workflows for each role at desktop/tablet/mobile widths, including a public viewer open during a staff update, reconnect/fallback behavior, date corrections and CSV downloads.
7. Proxy `/socket.io` HTTP and WebSocket traffic to the same backend as `/api`. Keep `JWT_SECRET` configured. For separate public/dashboard domains, set `NEXT_PUBLIC_SITE_URL` to the public origin before frontend build. Event times use UTC; overdue date comparison uses Asia/Qatar.
8. This implementation targets the existing single-backend deployment. Multiple backend instances require a shared Socket.IO adapter and distributed rate limits; they are not included. Test large-replica installations under realistic load before release. Financial role tightening may require staff communication.

Rollback before any tracking data exists: `node backend/scripts/migrate-tracking.js --down --allow-empty-rollback`. It refuses populated feature tables. After use, roll back application code while retaining all additive tracking/history tables; never delete tracking history to roll back a release.
