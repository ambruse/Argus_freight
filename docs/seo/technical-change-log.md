# Technical change log and validation

Date: 2026-10-31. Changes are local and reviewable; nothing was deployed, committed, pushed, submitted to Search Console or sent to customers. Existing unrelated workspace edits were preserved. Follow the audit finding IDs below.

## Implemented

| Change | Finding | Implementation / files |
| --- | --- | --- |
| Central URL and equivalent-page policy | A13/A14 | `src/seo/urls.mjs`, `src/seo/international.mjs`. Exact HTTPS canonical helper, reviewed locale vocabulary, source/translation parity registry, self/reciprocal sets, fallback purpose and readiness validation. Current entries are English singletons; no fake hreflang or translated URLs. |
| Prerender/client alignment | A10/A13 | `scripts/prerender.mjs`, `src/App.jsx`. Same canonical/locale/alternate source; HTML language/direction; head-only annotations and crawlable language links only for active equivalent sets. Existing title/description text preserved. Sitemap remains generated from actual public metadata on every static build. |
| All six lanes in directory | A02 | `src/seo/commercial-pages.mjs`. Move existing China-to-UAE record from industry array into tradePages without changing its URL, title or copy. Fix UAE/Bahrain related-service selector to match actual slugs, exposing road freight links. |
| Appropriate destination contact | A02 | `src/pages/CommercialPage.jsx`. China-to-UAE CTA uses the existing Dubai phone/team; Qatar-destination lanes keep Doha. No invented contact or capability. |
| Valid visible/schema breadcrumbs | A03 | `src/seo/metadata.mjs`, `src/pages/CommercialPage.jsx`. Share ancestor mapping. Preserve real services/locations/trade-lanes parents; omit four nonexistent group URLs instead of creating thin hubs. |
| Evidence-limited location schema | A05 | `src/seo/location-contacts.mjs`, `src/seo/metadata.mjs`. Organization retained; individual site-listed Doha, Dubai and Busaiteen business facts added from visible footer. Unsupported Turkey physical business and conflated China/India country businesses omitted. China/India contact links remain. No ratings, geo coordinates, business hours or unsupported accreditation added. |
| Operational/API/query indexing policy | A06 | `shared/seo-policy.cjs`, `backend/src/server.js`, `.htaccess`. Response-only noindex/nofollow for operational routes, APIs and arbitrary query parameters; campaign-only public variants retain canonical/indexable policy. No business/authentication/routing logic changed. |
| Consent-gated sanitized measurement | A15 | `shared/analytics.mjs`, `shared/analytics-consent.mjs`, `shared/public-page-paths.json`, `scripts/seo-route-paths.mjs`, `index.html`, `src/main.jsx`, `src/App.jsx`, `src/components/live/LiveCalculator.jsx`, `src/components/WhatsAppFloatingButton.jsx`, `frontend/app/customer/rfq/new/page.tsx`. Preserve existing GA ID; remove unconditional loader; allowlist all event fields; preserve unknown attribution; distinguish live enquiry from saved customer RFQ. No sensitive values sent. Actual operational request payloads unchanged. |
| Crawlable chairman link | A09 | `src/pages/About.jsx`. Preserve styling/navigation behavior while making the existing destination a real anchor. |
| Image delivery | A16 | `public/images/argus_shipping_logo_hero.webp`, `src/pages/Home.jsx`. Lossless WebP 47,112 bytes versus 95,759-byte PNG (50.8% reduction), identical decoded pixels verified. Original PNG retained as fallback. Explicit dimensions; lower-page globe uses lazy/async loading. No new imagery or layout. |
| Regression checks | A04 | `scripts/check-seo.mjs`, `scripts/validate-seo.mjs`, `scripts/seo.test.mjs`, `scripts/check-seo-browser.mjs`, `scripts/validate-seo-browser.mjs`, `scripts/check-customer-seo-browser.mjs`, package scripts. Current inventory, schema types, route links and locale policy replace obsolete URL/H1 assumptions. |
| Evidence and registry generation | All | `scripts/audit-live-seo.mjs`, `scripts/international-matrix.mjs`, `docs/seo/*`. Public HTTP snapshot and seven required reports, translation-registry JSON and machine test evidence. |
| Preserved design warning exception | Visual preservation | `.impeccable/config.json`: narrowed `gradient-text` exception to existing `src/index.css` after reviewing four pre-existing gold/heading treatments. No stylesheet redesign; no global rule/file suppression. User explicitly required current visual identity to remain. |

The build also regenerated the tracked `dist/` and `frontend/out/` public HTML, sitemap, assets and `.htaccess`, `frontend/public/sitemap.xml`, and Next's hashed portal export. Generated portal differences include the user's **pre-existing** source edits; they are not all SEO-authored changes. Coordinate the entire working tree before release. Do not attribute every generated change to this task. Build packages were used as installed (Vite runtime reported 8.0.16, Next 14.2.35, Node 24.16.0); no application dependency upgrade was made. Playwright/sharp were installed only under the ignored `.seo-audit-sandbox` for verification/asset conversion.

## Validation performed

| Check | Result and scope |
| --- | --- |
| Public live HTTP/source crawl | 61 requested URLs: 60 final 200, one deliberate 404, no fetch failures. All 46 registered public routes direct 200, self-canonical, one H1 and JSON-LD syntax valid. Host/legacy/slash samples preserve expected redirects. `evidence/live-http.json`. |
| Schema parent URLs | Four supplementary GETs returned 404 for industries/resources/case-studies/insights parent paths. `evidence/supplemental.json`. |
| Unit/regression suite | 38 passed: nine new SEO/privacy/header/locale tests plus 29 existing freight-pricing, outage and port-directory cases. The outage test intentionally reports ECONNREFUSED from its fixture. Final SEO suite rerun passed nine of nine. |
| Public production build | Vite build and React prerender succeeded for all 46 pages. Existing public JS bundle remains over 500 kB minified; warning is retained as a measured optimization backlog, not declared CWV failure. |
| Portal production build | Next 14.2.35 compiled, linted, typechecked and exported 27 generated pages successfully. Customer RFQ form remains about 198 kB first-load JS; analytics imports only a small route allowlist, not marketing copy. |
| Complete merged artifact | `scripts/merge-build.cjs` and deployment integrity check passed: marketing and portal HTML plus referenced assets exist. `npm run check:seo` passed on final `frontend/out`: 46 pages, 1,760 internal anchors checked, unique titles/descriptions, one H1, exact sitemap/canonicals, supported locales, head annotations, schema syntax/ancestors, local assets, alt attributes and private portal noindex. |
| Sitemap XML parsing | Browser DOMParser accepted final sitemap with zero parser errors, correct urlset root and 46 loc elements; exact inventory checked separately. |
| Rendered local coverage | All 46 pages at 1440px and 390px (92 route/viewport checks): correct title/canonical, visible single H1, no horizontal overflow, no placeholder alternates or browser exceptions. All six lane links present; chairman SPA navigation/back and missing-route 404 passed. `evidence/browser.json`. |
| JavaScript-disabled HTML | Homepage, air service, Qatar market and China-to-UAE lane rendered visible H1/content with JavaScript disabled. Build audit verifies content/metadata on every static page. |
| Rendered live sample | Homepage, Qatar market and China-to-UAE at both desktop/mobile: direct 200, expected title/canonical, visible H1. Read-only browser sample, not a full authenticated site test. |
| Freight-rate/enquiry fixture | Loopback synthetic catalog/locations, failed then successful contact dispatch, rate-search custom-quote result. Failure produced no quote_success; confirmed dispatch produced one. No real mail or DB writes. |
| Tracking fixture | Synthetic successful shipment and missing reference rendered through the unchanged tracker. No real shipment lookup. |
| Customer RFQ fixture | Existing quote prefill + save failure then success through local synthetic APIs. Two attempts, zero success on failure, one on saved RFQ; start/submit/success values contain no quote/reference/customer data. `evidence/customer-browser.json`. |
| Analytics privacy | Unit tests deny collection/storage without explicit consent, filter arbitrary payload properties and unknown values, sanitize private paths, survive sink failure, load GA only on opt-in and disable on withdrawal. Browser payload tests contain no form email/phone/reference. External GA ingestion/DebugView not tested. |
| Visual preservation | Local and live home screenshots inspected at desktop/mobile; layout, branding, navigation and freight tools preserved. Lossless logo decoded-pixel equality verified. Screenshots are local under `.seo-audit-sandbox/screenshots/`; not a numerical visual-diff certificate. |
| Mobile/desktop CWV | Both PageSpeed API attempts returned HTTP 429 quota errors. No field or Lighthouse metric returned. No CWV score/pass claim. |

## Preserved and remaining work

All existing public URLs, market pages, titles/descriptions, primary content and business logic remain; the pre-existing `/services/` → `/services` redirect stays. No new redirects, locale routes, location pages, rates, transit guarantees, credentials, fabricated translations or IP redirects were introduced. Existing dashboard, freight-rate, tracking and customer RFQ workflows remain; API headers are the only backend change.

Fourteen existing source-graph orphans remain explicitly listed in the content roadmap and reported in validation, pending factual/usefulness review. Their URLs and sitemap membership were not silently removed. The baseline Contact/quote-modal fake-success issue remains P0: correcting dispatch requires a separate business workflow decision, which this task's prohibition on business-logic changes prevents us from inventing.

Production deployment, Apache module behavior, actual SMTP/DB/end-to-end delivery, security authorization/anti-enumeration, Google indexing/selected canonicals, rich-result eligibility, backlinks, query volumes, rankings, field CWV and qualified-lead totals remain unverified. No GSC validation is claimed. Local schema syntax and tests do not establish those facts.

Business decisions required: translation languages/audiences and native reviewers; proof/correction of existing claims and case studies; precise service/office scope; Contact/modal dispatch ownership; consent manager/property configuration; lead qualification/deduplication policy; release coordination. See [content-roadmap.md](content-roadmap.md), [keyword-map.md](keyword-map.md) and [monitoring-sop.md](monitoring-sop.md).

Post-task design-hook review: confirmed `src/index.css` has no changes against Git. Its existing Inter import and three 3px top accents on service/chairman cards are preserved under the user's visual-preservation requirement. Added file-scoped `overused-font=inter` and `side-tab=*` exceptions through `impeccable hooks ignore-value`; no CSS changes, global ignores or new design work. No new runtime tests were needed for configuration/documentation-only changes.

## Reproduce

```powershell
node --test scripts/seo.test.mjs backend/test/live-pricing.test.mjs backend/test/live-pricing-outage.test.cjs backend/test/port-catalog.test.js
npm run build:landing
npm run copy:landing
npm run build:frontend
node scripts/merge-build.cjs
npm run check:seo
npm run docs:international
# Browser package and Chrome paths can be supplied via PLAYWRIGHT_PATH / CHROME_PATH
npm run check:seo:browser
node scripts/check-customer-seo-browser.mjs
# Optional read-only deployed snapshot, save separately to retain the baseline:
node scripts/audit-live-seo.mjs docs/seo/evidence/live-http-after-release.json
```
