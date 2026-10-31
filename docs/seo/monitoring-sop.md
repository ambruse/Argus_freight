# SEO and enquiry monitoring SOP

Owner: assign an engineering release owner, SEO analyst, commercial content owner, native-language reviewer and analytics/privacy owner. Audit baseline: 2026-10-31, Asia/Riyadh. No recurring automation or external account changes were created by this task.

## Before release

1. Preserve the current URL inventory; verify no unapproved translation or country/service page was added. Review [audit.md](audit.md), especially the P0 simulated-form issue and evidence gaps.
2. With existing dependencies installed, run `npm run test:seo`, the live-pricing/port tests, `npm run build:landing`, `npm run copy:landing`, `npm run build:frontend`, `node scripts/merge-build.cjs`, `npm run check:seo`, and `npm run docs:international`. The root `npm run build` also installs dependencies; the equivalent staged build avoids unnecessary dependency mutation.
3. Run browser checks using installed Playwright and Chrome: set `PLAYWRIGHT_PATH` to the package path if the default isolated `.seo-audit-sandbox/node_modules/playwright` is absent; set `CHROME_PATH` for nondefault Chrome. Run `npm run check:seo:browser` and `node scripts/check-customer-seo-browser.mjs`. Tests use local synthetic APIs only and never send production enquiries.
4. Review the generated `dist/` and merged `frontend/out/` as one release. This repository tracks the static export. The complete build includes other pre-existing workspace changes, so coordinate those before deploying; do not publish only the landing build over the portal.
5. Verify Apache mod_rewrite/mod_headers and deployed Express middleware behavior in staging. Private/API/query URLs should return `X-Robots-Tag: noindex, nofollow`; clean public routes should remain indexable. Authentication/authorization tests remain separate. Robots disallows API/admin/operator crawling; it cannot prevent access or guarantee removal of an already indexed URL. Existing indexed private URLs require access-control review and appropriate removal handling; do not expose private responses merely to let crawlers read noindex.

## Analytics consent and integration

The pre-existing GA4 ID `G-TCQ42VNDBF` is preserved. Ownership, property access and configuration have not been validated. The old unconditional script was replaced by `shared/analytics-consent.mjs`; analytics remains off until explicit consent is supplied. No consent banner was invented or added to the UI.

The approved consent manager must call `window.setArgusAnalyticsConsent(true)` only after analytics consent, and `window.setArgusAnalyticsConsent(false)` on withdrawal. Wire this after the public app or customer quote form initializes the function, on every full navigation; the implementation does not invent or persist consent. Withdrawal disables collection and clears the application's attribution context. Cookie deletion/retention policy belongs to the consent manager. A custom reviewed sink may instead set `window.argusAnalytics = { consent: true, sink: approvedFunction }`; the sink must accept only the sanitized event payload.

Before enabling GA4, the property owner must disable automatic enhanced measurement that could collect raw page/history/search/form/outbound information and audit any additional tags. The code disables default page views, Google signals and ad personalization, and passes sanitized page location plus an empty referrer to explicit events. This does not remotely inspect or override every property-level integration. Analytics consent alone is not approval to collect shipment data. Do not enable Enhanced Conversions, user-provided data or automatic form capture on these flows.

Payload allowlist: `event`, `page_path`, `landing_page`, `country`, `service`, and optional `form_type`. Paths must be in the generated public route allowlist (plus the generic customer RFQ form path); queries/fragments are never sent. Country is an approved market code inferred from the landing/current market or lane destination, **not visitor nationality/location and not proof of shipment destination**. Service is an approved slug. Unknown values remain `unknown`. Optional `form_type` is only `live-rate-enquiry` or `customer-rfq`. Names, phone/email, exact addresses, ports, commodity/free text, weight, price, reference numbers, quote IDs, account IDs, file names, tokens and raw referrers are excluded.

First-public-landing context is held in sessionStorage only after consent. It survives same-tab navigation; no cross-device attribution or unique-lead identifier is introduced. Direct portal entries have unknown public landing page. Consent-denied sessions are not measured and must not be silently estimated.

| Event | Exact trigger | Interpretation / exclusions |
| --- | --- | --- |
| `quote_start` | Public Request Quote action; valid route opens live enquiry; first interaction with customer RFQ form | Intent, not a lead; source form type distinguishes actual forms where present |
| `quote_submit` | Immediately before live enquiry dispatch or customer RFQ save, after current validation | Submission attempt; no form payload copied |
| `quote_success` | Live enquiry API confirms `delivery: sent`, or customer RFQ API returns a saved reference | A confirmed dispatch/save, not a qualified lead or booking. Customer RFQ attachments/email can independently fail after save; no reference is sent to analytics |
| `call_click` | Public `tel:` anchor click | Click only, not a completed call; no phone value |
| `whatsapp_click` | Public floating button or recognized WhatsApp anchor | Click only, not a sent conversation; no selected number |
| `email_click` | Public `mailto:` anchor | Click only, not delivered mail; no address/body |
| `rate_search` | Valid live calculator submission before pricing request | Search attempt, not a result value; no rate or shipment details |
| `location_page_view` | Actual market page render with consent, or consent grant on that page | Deduplicated for repeated effect/grant on the same route; excludes directory |
| `trade_lane_cta_click` | Contact CTA anchor from a trade-lane page | Commercial route intent; no quote details |

Contact.jsx and the legacy quote-modal timers never emit `quote_success`. Internal employee RFQ/bulk-email workflows are excluded from marketing analytics. Do not interpret a generic success toast as saved data. The customer portal changes add event hooks only; business persistence, attachments and email logic remain unchanged.

Validate using synthetic fixtures and a test sink first. In an approved analytics test environment, inspect actual network payloads, DebugView and property settings with consent denied/granted/withdrawn. Check failure, retry, direct portal entry, cross-page navigation, WhatsApp and every contact link. Do not place real customer data in analytics debugging tools. Account-side DebugView and production event ingestion have not been performed.

## Qualified-lead reporting

Commercial owner must define a qualified lead (for example, valid commercial cargo enquiry in a supported lane accepted by operations) and choose the reporting timezone. Report raw enquiry events separately from deduplicated CRM-qualified leads. Never sum live-rate and later customer-RFQ successes as distinct customers without authorized backend/CRM deduplication. No backend qualification or new CRM logic is implemented here.

Monthly report dimensions: period, target market, service, canonical public landing page, GSC clicks/impressions where available, consented submission attempts, successful enquiry/save events split by form type, CRM-qualified enquiries, and explanation of unknown attribution. Import only aggregated counts into SEO reporting; keep shipment/customer identifiers inside the authorized operational system. No Search Console clicks-to-lead rate should mix unmatched scopes or claim unobserved conversions.

| Target market | Qualified leads | Evidence status |
| --- | --- | --- |
| Qatar | Unknown | No approved CRM/GSC/GA4 export provided |
| UAE | Unknown | No approved CRM/GSC/GA4 export provided |
| China | Unknown | No approved CRM/GSC/GA4 export provided |
| India | Unknown | No approved CRM/GSC/GA4 export provided |
| Bahrain | Unknown | No approved CRM/GSC/GA4 export provided |
| Turkey | Unknown | No approved CRM/GSC/GA4 export provided |

## After deployment and ongoing

- Release day: run the public HTTP audit into a new dated evidence file, compare source inventory/canonicals/headers/sitemap and rendered representatives. Validate all newly activated alternates, including response status, robots, self-canonical, reciprocal set, language content and navigation. Avoid destructive live submissions; test enquiry delivery only with a designated test account/recipient.
- Weekly: review new 404/5xx, sitemap changes, unexpected noindex and redirect changes, customer enquiry failures, broken internal links and production JS errors. Triage missing public pages as P1; protected data exposure or lost enquiries as P0.
- Monthly: with authorized GSC access, inspect Page Indexing, Sitemaps and representative URL Inspection. Compare by country/page/device over matching periods. Do not claim crawling equals indexing. No GSC country-targeting setting or general-purpose Indexing API submission is appropriate here.
- Monthly: review real-user mobile/desktop LCP, INP and CLS at the 75th percentile. PageSpeed API attempts on this audit returned HTTP 429 for both strategies; no field or lab score was obtained. Use GSC/CrUX or approved RUM once available. Investigate large public bundle and 7,808,783-byte background-frame collection with traces. Browser viewport tests are not CWV certification.
- Quarterly and on service changes: verify office roles, contact details, service availability, credentials, legal/customs references and translation parity. Do not roll up different country offers into hreflang sets.

Primary guidance: [Google consent setup](https://developers.google.com/tag-platform/security/guides/consent), [manual pageview control](https://developers.google.com/analytics/devguides/collection/ga4/views), [GA4 configuration](https://developers.google.com/analytics/devguides/collection/ga4/reference/config), [Google noindex](https://developers.google.com/search/docs/crawling-indexing/block-indexing), [Web Vitals](https://web.dev/articles/vitals). Opened 2026-10-31.
