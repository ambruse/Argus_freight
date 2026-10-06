# Argus Shipping SEO audit

Audit date: 2026-10-06. Scope: source repository review plus live HTTP/HTML checks of `https://argusshipping.co` and a small sampled URL set. The apex redirects to `https://www.argusshipping.co/` (200 after redirect). `/`, `/services`, and `/services.html` returned HTTP 200 in the sampled checks. Search Console, GA4, Google Business Profile, Bing Webmaster Tools, authenticated crawl data, and paid keyword-planner data were not available; rankings, impressions, volumes, backlinks, index coverage, field performance, and lead attribution therefore remain unverified.

## Diagnosis

The public site is a Vite/React single-page application. A live fetch of each sitemap URL found the same HTML shell and two title tags; each page's canonical pointed to the homepage on the apex host. The homepage request redirects to `www`, creating a host/canonical mismatch. `/tracking` returned 404 from the live site while still appearing in the sitemap. Page content is rendered after JavaScript runs. These routes exist in `src/App.jsx`, but before this change the site had no route-specific title, description, canonical, or Open Graph metadata. Next.js also shares generic application metadata and the Render hostname in `frontend/app/layout.tsx`; this is a separate, primarily authenticated application surface.

The live homepage HTML snapshot had two `<title>` elements. The earlier title described freight forwarding in Qatar, while the later title said “The Legend in Logistics”; duplicate titles leave the intended result ambiguous. The live LocalBusiness JSON-LD named a separate Render host as its URL and ID, used phone `+974 30512233`, claimed 24/7 hours and supplied exact coordinates. The visible contact page instead lists `+974 44116544`, Sunday–Thursday 08:00–17:00 AST, and P.O. Box 31861, Doha; the physical street address and coordinates were not verified. The home page schema had a different service catalog and was also not entity-linked to the live site's host. The organization details must be reconciled before adding LocalBusiness hours or location coordinates.

The live `robots.txt` and live sitemap both use the apex host, while the homepage redirects to www. The sitemap lists eight routes; seven sampled landing routes returned 200, but `/tracking` returned 404. All returned pages contained two title tags and the homepage canonical. The checked-in `frontend/public/robots.txt` referenced `argus-freight.onrender.com/sitemap.xml`, so local builds could publish a stale sitemap reference. The checked-in sitemap had no `lastmod`; `changefreq` and `priority` are present locally but Google ignores them. Source sitemap and robots are now aligned to the observed www redirect destination, and the landing build script now emits the tracking shell; production must be rechecked after deployment.

The service page contains an overview and detailed blocks for sea, air, road and door-to-door service; other listed capabilities include finished vehicle logistics, courier, warehousing, transportation, supply chain, and relocation. The homepage explicitly claims sea, air, door-to-door and 3PL warehousing. Verify every service claim, accreditation, trade lane, facility, metric, and company credential with the business owner before expanding copy or schema. No industry vertical pages or trade-lane pages were found in the source route set.

## Findings and priorities

| Issue | URL / file | Severity | Impact | Recommended fix | Difficulty | Priority | Expected business impact |
|---|---|---:|---|---|---:|---:|---|
| Competing title tags in the served homepage head | `/`, `index.html` | HIGH | Search snippet relevance and CTR signals are unclear | Keep one accurate title; add unique page metadata after route rendering strategy is selected | Low | P0 | Better consistent search presentation |
| Sitemap contains a live 404 and canonical host conflicts with homepage redirect | `/tracking`, `/sitemap.xml`, all sampled page heads | HIGH | Wastes crawl attention and creates ambiguity over preferred host | Ensure tracking resolves 200, align sitemap/canonical/schema/OG to one host, then resubmit sitemap | Low | P0 | Prevent a listed URL from resolving to a 404 and consolidate signals |
| Homepage has no text H1 | `/`, `src/pages/Home.jsx` | MEDIUM | The page lacks a concise primary text heading describing its core commercial topic | Add a visible H1 within the existing hero hierarchy | Low | P1 | Clearer page topic for visitors and crawlers |
| Organization schema points to Render and contradicts visible contact details | `/`, `index.html`, `src/pages/Home.jsx` | HIGH | Entity confusion and inaccurate local business information | Use one canonical www entity ID; retain only corroborated fields; verify legal name, address, hours, phone and coordinates | Low | P0 | Reduce false entity associations and local data mismatch |
| Public routes share one client-rendered HTML shell and metadata | all public route URLs, `src/App.jsx` | HIGH | Crawlers must render JS to see page content; all routes start with homepage metadata | Add static/prerendered route HTML or migrate public pages to server/static rendering; unique title/description/canonical per route | High | P0 | Better crawl understanding and page-specific rankings |
| Checked-in robots sitemap URL names an unrelated host | `frontend/public/robots.txt` | HIGH | Crawlers may be sent to a sitemap on a different origin | Point to canonical `https://www.argusshipping.co/sitemap.xml` | Low | P0 | Reliable discovery and host consistency |
| Global metadata in the Next application describes internal RFQ tooling | `frontend/app/layout.tsx` | MEDIUM | If application routes are indexable, snippets can appear to be public service pages | Mark private application routes noindex; align social/canonical hosts with the public company site | Medium | P0 | Keep internal UI out of search and prevent brand confusion |
| Search volume/ranking and competitor gap cannot be quantified without property data | Search Console / GA4 unavailable | HIGH | No evidence-based baseline or opportunity sizing | Connect GSC, GA4, Keyword Planner or a licensed dataset and export queries/pages/countries/devices | Low (access required) | P0 | Establish qualified-lead baseline and opportunity ranking |
| Homepage schema differs from visible contact page and uses questionable entity detail | `/`, `src/pages/Home.jsx` | HIGH | Structured data may be inaccurate or ineligible | Consolidate graph after verifying address, service claims and business type; use Organization + WebSite as baseline | Medium | P1 | Stronger, consistent entity graph |
| Service list and detailed service sections may use several H1s on one route | `/services`, `src/pages/Services.jsx` | MEDIUM | Heading hierarchy is difficult for users and crawlers to parse | Use one H1 for the page; detail section titles should be H2/H3 without changing copy intent | Low | P1 | Clearer page topic and accessibility |
| Homepage service claims contain a typo/quote artifact and unsupported “accredited” phrasing requires proof | `/`, `src/pages/Home.jsx` | MEDIUM | Trust and content quality risk | Proofread and substantiate credentials; do not publish claims without evidence | Low | P1 | More credible commercial messaging |
| Contact form is simulated in frontend source | `/contact`, `src/pages/Contact.jsx` | HIGH | A conversion path may acknowledge a lead without sending it | Connect and verify actual submission endpoint, error handling, spam protection and event tracking | Medium | P1 | Protect quote and contact lead capture |
| Sitemap uses `changefreq` / `priority` but no verified lastmod | `/sitemap.xml` | LOW | Unhelpful crawl hints, no reliable modification timestamps | Keep only canonical indexable URLs; add lastmod only from real content modification data | Low | P1 | Cleaner crawling signals |
| Crawl coverage and mobile rendering were not fully measurable from repository alone | public site | MEDIUM | Potential route, device, and status issues remain unknown | Run authenticated crawl and device audit; verify soft 404s and rendered content | Medium | P1 | Close blind spots before broad expansion |
| No evidence of Search Console, analytics events, GBP consistency, backlinks or CrUX | external properties | HIGH | Leads and actual visibility cannot be tied to SEO | Connect relevant properties and perform access-backed baseline review | Medium | P1 | Quantifiable SEO-to-lead reporting |

## Sampled technical checks

| URL | Observed result | Notes |
|---|---|---|
| `https://argusshipping.co/` | redirects to `https://www.argusshipping.co/`, then 200 | Served shell had two titles and canonical pointed at apex |
| `https://www.argusshipping.co/robots.txt` | 200 text/plain | Live sitemap reference uses apex host |
| `https://www.argusshipping.co/sitemap.xml` | 200 XML | Eight apex URLs; `changefreq`/`priority` present live |
| `/services`, `/about`, `/why-us`, `/contact`, `/team`, `/chairman-message` | 200 | All sampled shells had two title tags and homepage canonical |
| `/tracking` | 404 | Listed in live sitemap; now emitted by the source merge-build step |
| `/services.html` | 200 | Same shell; source normalizes to `/services` after hydration |

## Pre-code diagnosis and source changes

Before changing code, the highest-confidence problems were the duplicate title, inconsistent entity identifiers/contact facts, and stale checked-in robots/sitemap host. Source corrections now cover `index.html`, `src/App.jsx`, `src/pages/Home.jsx`, `src/pages/Services.jsx`, `src/index.css`, `scripts/merge-build.cjs`, `frontend/app/layout.tsx`, `frontend/public/robots.txt`, and `frontend/public/sitemap.xml`. The homepage now has one title, canonical www identity, aligned organization and website IDs, and removal of unsupported LocalBusiness hours/coordinates. Existing Vite routes receive route-specific metadata after React renders, and production static route copies now receive unique head metadata at build time. The services page now has one H1. The Next application defaults to noindex and its private route paths are no longer blocked in robots, allowing crawlers to see the noindex directive.

These repository changes have not been deployed, rebuilt, or re-crawled in this audit turn. They do not prerender route body copy; a static/server rendering migration remains a high priority. No public URL paths or visible page copy were changed.

## Evidence and limitations

- Live HTML, `robots.txt`, sitemap, and redirect behavior were fetched directly on 2026-10-06.
- Local facts were compared with `src/pages/Contact.jsx`, `src/pages/Home.jsx`, and `src/pages/Services.jsx`.
- Search competitors observed in general web results include GAC Qatar, HSM Shipping, Aramex Qatar, DSV Qatar, QTRANS, Ottis Logistics, Cargo World Qatar, and Delma Freight Services. This is a qualitative SERP sample, not a comprehensive ranking or backlink audit.
- Google Search Central documents that Google runs JavaScript but recommends crawlable links and distinct URLs for SPA content. Sitemap `priority` and `changefreq` are ignored; accurate `lastmod` may be used. Core Web Vitals require field data for a proper 75th-percentile assessment.
- No access to Search Console, GA4, GBP, Bing Webmaster Tools, keyword planner, backlink index, or PageSpeed Insights API was provided. No volume, ranking, traffic, indexation, or Core Web Vitals values are invented.

## Architecture decisions from this audit

- Keep existing public routes: `/`, `/services`, `/about`, `/why-us`, `/contact`, `/tracking`, `/team`, and `/chairman-message`.
- Normalize `/services.html` to `/services`; the route remains supported but should consolidate to one canonical URL.
- Do not consolidate existing content pages yet. The leadership message and About page have distinct purposes; check GSC and compare the rendered copy before considering a merge.
- Candidate pages to create after operational review: `/services/air-freight`, `/services/sea-freight`, `/services/road-freight`, `/services/customs-clearance`, `/services/warehousing`, `/services/door-to-door`, and possibly `/services/project-cargo`; then one or two validated origin-to-Qatar lanes and a small expert-reviewed resources hub.
- Do not create unverified industry pages. Keep login, registration, dashboard, quote/RFQ and internal operator routes out of the public sitemap and search results; Next application metadata now applies noindex globally.
- Keep backend APIs, authentication flows, quote business logic, form handling, existing videos, page URLs, and branding untouched in this SEO pass. Contact form reliability is documented as a conversion issue for a separate implementation task.
- Remaining technical risk: source route metadata helps, but public route copy is still client-rendered. Search rendering and direct static route behavior must be confirmed against the deployed merged build.

Recommended priority order is P0: canonical/host and live 404 repair, metadata and schema consistency, property access/baseline; P1: public route prerendering, service pages, local data verification and lead form; P2: useful guides and validated trade lanes; P3: case studies and relevant digital PR; P4: CTR experiments based on measured impressions.

References: [Google SEO guide for developers](https://developers.google.com/search/docs/fundamentals/get-started-developers), [Google sitemap guidance](https://developers.google.com/search/docs/crawling-indexing/sitemaps/build-sitemap), [Google LocalBusiness structured data](https://developers.google.com/search/docs/appearance/structured-data/local-business), [Core Web Vitals](https://web.dev/articles/vitals?hl=en).
