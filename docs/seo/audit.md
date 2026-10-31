# International SEO audit — Argus Shipping

Audit date: 2026-10-31 (Asia/Riyadh). Baseline recorded before implementation. This report supersedes earlier repository SEO scores for this task; no ranking, traffic or lead uplift is asserted.

## Coverage and evidence

- Read the installed seo-hreflang skill, operating-contract.md, runtime-and-data.md, current-search-facts.md, international-ecommerce.md and dataset-contracts.md using filesystem access resolved from the skill location. All six reads succeeded; no resource was missing. No quantitative score requested or computed.
- Repository: React 19/Vite 8 public site, build-time React server rendering in scripts/prerender.mjs; Next.js 14.2 static export for the operational portal; Express plus Apache deployment paths. Public SEO belongs to the Vite pipeline, not Next metadata routes. Next's existing robots metadata protects portal HTML.
- Source inventory: 46 public URLs, including six market pages, ten service pages, six lanes, six industry pages, four resources, three case studies and one insight, plus ten base pages. The services hub's established canonical is `/services`; `/services/` already redirects there. Preserve both access paths and the existing redirect.
- Public GET crawl: 61 requested URLs, 60 final HTTP 200 responses, one deliberate missing URL returning 404, zero fetch errors. Includes every public source route, host variants, representative legacy/slash aliases, robots, sitemap, synthetic query variants, login and operator HTML. [Machine evidence](evidence/live-http.json) records timestamps, every hop, source tags, H1/H2 counts, links, images and schema syntax. This is source/HTTP evidence, not Google indexing evidence.
- No private shipment identifiers were queried; no live enquiry was submitted. Existing unrelated workspace changes were present before this task and are preserved.

## Claim ledger and priorities

Each action references its finding ID. Confidence is high for source/HTTP facts; external business truth remains unverified.

| ID / priority | Classification | Observation and evidence locator | Action / dependency / verification |
| --- | --- | --- | --- |
| A01 / P0 | Verified problem | `src/pages/Contact.jsx:handleSubmit` and `src/components/QuoteModal.jsx:handleSubmit` show success after a timer, with no network dispatch. | Business owner must approve the destination and workflow, then engineering must implement delivery and failure handling in a separate business-logic change. Never count simulated success as a lead. No form logic changed by this SEO task. |
| A02 / P1 | Verified problem | China-to-UAE exists and returns 200, but is stored in `industryPages`, outside `tradePages`. The live `/trade-lanes/` directory lists five lanes. | Move the existing record into the lane collection without changing URL/copy; assert all six appear in directory HTML. |
| A03 / P1 | Verified problem | Four nonexistent group parents are referenced in 14 JSON-LD breadcrumbs: `/industries/`, `/resources/`, `/case-studies/`, `/insights/`. Visible template instead labels them Services. | Use only actual ancestors and align visible/schema breadcrumbs; preserve leaf URLs. Test every schema breadcrumb target. |
| A04 / P1 | Verified problem | `scripts/check-seo.mjs` assumes every commercial page has Service schema and the old Qatar homepage H1. Browser check hardcodes retired service/shipping paths and 23 pages. | Replace obsolete assertions with current inventory checks and negative fixtures. |
| A05 / P1 | Improvement opportunity | `schemaFor` emits a country-level LocalBusiness even for Turkey with no local address or phone; China/India each combine multiple contacts. | Keep Organization. Emit individual locations only from the site's existing office facts, omit Turkey's unsupported physical-business claim. Site-listed identity is verified; independent office ownership is not. |
| A06 / P1 | Improvement opportunity | Portal HTML already has noindex; robots disallows API/admin/operator. Query variants of public HTML are canonicalized but have no response noindex. API private-result protection has no shared X-Robots-Tag policy in source. | Add response-only noindex for operational/API paths and non-campaign query variants in Express/Apache, leaving authentication and routing logic untouched. Robots is not authentication. Test synthetic requests. |
| A07 / P1 | Unverified, requiring access or data | Public tracking endpoint accepts a reference; field-level authorization, anti-enumeration and production disclosure policy have not been security-audited. | Security owner must review with approved synthetic records. Do not infer confidentiality from robots/noindex. No production shipment data accessed. |
| A08 / P1 | Unverified, requiring access or data | Existing case studies claim precise savings and shipments; insight claims 10,000 shipments and survey statistics. Existing homepage also claims accreditation, 100% delivery and facilities. No substantiation supplied. | Content owner must supply records, consent and methodologies or approve corrections. Do not amplify these pages or treat claims as proven; preserve existing copy pending review. |
| A09 / P2 | Improvement opportunity | Fifteen URLs have no incoming HTML anchor in the 46-page source graph (see content roadmap), including 14 industry/resource/case/insight pages and chairman message. | Link chairman from its existing about context; gate promotion of the other pages on A08 and content usefulness review. Sitemap inclusion alone is not internal navigation. |
| A10 / P2 | Verified working implementation | All 46 source pages return direct 200, have one H1, nonempty unique metadata, absolute self-canonicals and parseable JSON-LD. H2 content is prerendered, not dependent on JS fetching. | Preserve and regression-check built HTML. Schema syntax does not verify factual truth or rich-result eligibility. |
| A11 / P2 | Verified working implementation | HTTPS www homepage receives single-hop redirects from tested HTTP/non-www variants; `/locations` normalizes to slash, `/services/` to no slash; tested legacy service/shipping paths redirect to current URLs. Deliberate missing path returns 404. | Keep established URLs/redirects. Hosting handles preferred host; do not duplicate its redirect rules. Sample does not prove every combined alias or hostname path. |
| A12 / P2 | Verified working implementation | Generated robots advertises sitemap; sitemap contains public routes, excludes operations. Rates run by POST and tracking by API, without standalone public result pages or public pagination. | Preserve build-generated sitemap for static deployment, test exact URL membership, robots discovery and operator exclusions. |
| A13 / P2 | Verified working implementation | All inspected public pages use English HTML language, no hreflang links and no actual translated routes. Country copy differs materially. | No incorrect country-equivalence tags to remove. Introduce central parity/equivalence registry with no active translated clusters. |
| A14 / P2 | Proposed future feature | Professional Arabic, Chinese and Turkish equivalents are not available. | Publish only after complete content, RTL/navigation/form/metadata parity and business/editorial approval. See URL matrix and hreflang validation. |
| A15 / P1 | Verified problem; account data unverified | `index.html` loads existing GA4 `G-TCQ42VNDBF` unconditionally. No custom conversion events found. No Search Console/GA4 property export or authenticated account connector available. | Preserve ID, gate loading on explicit consent, disable automatic pageviews and send only allowlisted event fields. Connect CMP and review enhanced measurement before collection. No GSC validation, lead counts or demand volumes claimed. |
| A16 / P2 | Improvement opportunity | All source images inspected have alt attributes; slider has fixed dimensions and delays loading inactive slides. Other large raster images merit measurement/optimization. | Preserve appearance, optimize supported assets and validate render. File size is not LCP. |
| A17 / P2 | Unverified, requiring access or data | Mobile/desktop CrUX and production CWV are not yet established. | Record field-source attempts and controlled browser observations separately; use 75th-percentile LCP/INP/CLS by device before declaring CWV pass/fail. |

## Requested technical coverage

| Area | Audited result / limit |
| --- | --- |
| Indexability/status | Direct HTTP and source checks for all 46 public routes; Google indexing unknown (A10/A11). |
| Canonicals/preferred host | Self-canonicals and tested HTTPS/www host normalization work; no new host rules (A10/A11). |
| Redirects/slashes | Representative existing legacy/slash redirects checked; mixed established slash policy retained. Combined alias permutations not exhaustively crawled (A11). |
| robots.txt | Retrieved public rules and sitemap declaration; API/operator/admin disallows present (A12). |
| XML sitemap/discovery | Generated inventory matches public routes, excludes portal; source and parsed-XML checks in validation (A12). |
| Titles/descriptions | Unique nonempty metadata in tested inventory, preserved (A10). Length is not used as a ranking score. |
| H1/H2 | One H1 and prerendered section headings on every public page; final browser checks verify visible H1 (A10). |
| Images | Alt attributes present in source crawl; lossless logo optimization and globe lazy loading; remaining frame/bundle cost documented (A16/A17). |
| Internal linking/orphans | Source anchor graph captured; missing China-to-UAE directory link and non-anchor chairman navigation corrected; 14 content-review orphans remain (A02/A09). |
| Duplicate content | Tested `/services.html` and query variants resolve to the clean canonical. Country pages have different body content; duplicate titles/descriptions rejected. Full near-duplicate similarity analysis and Google's selected canonical are not established. No forced consolidation of country content. |
| Structured data | JSON syntax checked across inventory; broken parent URLs fixed; local facts limited to visible evidence. Factual substantiation and rich-result testing remain separate (A03/A05/A08). |
| Mobile/desktop CWV | Both PageSpeed API requests returned 429; no field/lab metrics obtained. Responsive rendering tested separately (A17). |
| JS/server HTML | React build-time server rendering provides complete public HTML; portal uses Next static export. No-JS representative rendering passed (A10). |
| Locales/hreflang | English-only source inventory, no translated equivalents; central registry and future parity gate implemented (A13/A14). |
| Freight-search indexing | Existing POST search does not create public result pages; arbitrary public query variants and API responses now receive noindex headers (A06). |
| Pagination/parameters/dynamic routes | No public paginated listing or arbitrary freight-result route in registered public inventory. Private application/API dynamics excluded from sitemap; known public aliases preserved. Header rules tested with synthetic queries. |
| Missing/broken routes | Deliberate public missing URL returns 404. Four schema-only parent URLs also returned 404. Full public internal-anchor inventory passes locally; external outbound links were not exhaustively checked. |
| GSC/analytics | Existing GA4 ID found; consent-gated hooks implemented. Account access, DebugView, GSC indexing and qualified leads unavailable (A15). |

## International decisions

Keep global homepage, `/services` (with existing `/services/` access), `/locations/`, `/trade-lanes/` and all current leaf URLs. Market pages are separate content entities, not English region variants of the homepage. No forced geo/language redirects. No placeholder translations, language switcher to absent pages, or x-default without a genuine equivalent fallback. Implement HTML-head annotations only, using a central registry shared by prerender and client navigation.

No major URL migration is necessary. A future additive translation rollout must retain the source URL, introduce only approved complete locale-prefixed counterparts, use self-canonicals, add reciprocal head links and crawlable language links, include actual pages in the sitemap, and verify direct 200/indexability in staging and production before announcing it. Rollback removes the faulty annotation set first; do not redirect established source pages to unapproved translations.

## Guidance verified before implementation

Opened 2026-10-31: [Google localized versions](https://developers.google.com/search/docs/specialty/international/localized-versions), [multiregional sites](https://developers.google.com/search/docs/specialty/international/managing-multi-regional-sites), [canonical consolidation](https://developers.google.com/search/docs/crawling-indexing/consolidate-duplicate-urls), [noindex](https://developers.google.com/search/docs/crawling-indexing/block-indexing), [sitemaps](https://developers.google.com/search/docs/crawling-indexing/sitemaps/build-sitemap), [structured-data guidelines](https://developers.google.com/search/docs/appearance/structured-data/sd-policies), [Web Vitals](https://web.dev/articles/vitals), [Next.js 14 metadata](https://nextjs.org/docs/14/app/api-reference/functions/generate-metadata).

Applied: absolute alternate URLs, source membership and reciprocal sets; ISO language and optional script/region codes; separate translated URLs; user-controlled navigation; canonicals aligned with equivalents; truthful schema; crawl access needed to observe noindex. Service schema does not imply a supported Google Service rich result. No removed Search Console country-targeting setting is recommended.

## Validation after implementation

Final test outcomes, rendered coverage, field-data attempts and remaining release limits are recorded in [technical-change-log.md](technical-change-log.md) and [hreflang-validation.md](hreflang-validation.md). Local implementation does not establish production deployment or indexing.
