# Argus SEO architecture

Implementation date: 7 October 2026. Scope: marketing website and its static build; RFQ, authentication, CRM and database logic are unchanged.

## Current architecture

The public website is React 19 / Vite with a lightweight pathname router in `src/App.jsx`. The operational application is Next 14 with `output: export`. Express serves static exports and APIs. The root build creates Vite output, copies media for Next, builds Next, then merges marketing files into `frontend/out`. The right-side navigation and global footer are shared by marketing routes. Existing public URLs are `/`, `/about`, `/services`, `/why-us`, `/team`, `/contact`, `/tracking` and `/chairman-message`.

The service hub advertises sea, air, road, door-to-door, vehicles, courier, warehousing, distribution, 3PL and relocation. Customs support is described within transport/consolidation; About mentions heavy-lift transport. These are the evidence boundary for the new pages. Courier, distribution and relocation content remains on the hub until a distinct landing-page brief is approved.

## Problems discovered

- Multiple commercial intents share `/services`; no service-specific landing URLs existed.
- Public HTML was an empty React root. Metadata copies created by the old merger did not include each page's body content.
- Metadata existed in several separate places and could diverge between navigation and exported HTML.
- Relative asset paths would resolve incorrectly on nested service/trade URLs.
- The homepage service cards all pointed to the hub; several footer links were JavaScript-only spans.
- Some navigation callbacks changed the displayed page without updating the URL. Hash routing could send unrelated page fragments to Services.
- Adding a physical `services` directory can redirect the existing hub before `services.html` is resolved.
- The old merger copied only the Vite asset directory and homepage-derived HTML, potentially leaving images and new nested pages out of the final output.
- Legacy copy includes certification, inventory-system, facility and numerical performance claims that have no attached verification in this repository. New pages do not amplify those claims. Owner review remains necessary.
- Contact's existing form uses a simulated success timeout; the new pages therefore also expose working phone/email contact paths. No change was made to form submission or backend logic.

## Keyword cannibalization

Homepage owns the broad Qatar freight/logistics company intent. Services remains the catalogue. Each dedicated service owns its main commercial intent; country-to-Qatar pages own origin/destination intent. Storage is distinguished from ongoing 3PL order fulfilment; road freight owns GCC transport while UAE-to-Qatar owns that specific route. Industrial logistics stays with project cargo until a separate sector proposition is justified.

The keyword map assigns each implemented phrase once. That is an information-architecture check, not proof that Google will never rank two pages for the same query. Existing hub content is retained for users; use query/page reports after launch to assess any actual competition.

## Recommended service pages

Implemented nine pages: air freight, sea freight, road freight, warehousing, customs clearance support, 3PL, door-to-door cargo, project cargo and vehicle logistics. Evidence is recorded per page in `src/seo/commercial-pages.mjs`. New descriptions use the service claims already present in the repository and avoid numerical, licensing or certification promises.

Warehousing content asks customers to confirm special storage conditions; it does not target a temperature-controlled warehouse claim. Customs content describes coordination and does not claim licensed broker status. Project cargo is limited to the existing heavy-lift/transport offering, without invented equipment capacities or project histories.

## Recommended trade-lane pages

Implemented China, India, UAE, Turkey and Bahrain to Qatar, plus `/shipping/` as their parent. China has listed Guangzhou/Yiwu contacts; India has listed contacts and named Mumbai/Bangalore consolidation; UAE has the Dubai location and an explicit road route; Turkey has Istanbul consolidation and a maritime table; Bahrain has an office and consolidation reference. These establish existing advertised operational relevance, not independent verification of current schedules or market demand.

Pages differ in collection, origin-network and mode-planning content. No prices, frequencies, guaranteed transit times, fabricated ports or fake route statistics were added. Listed offices are explicitly distinguished from cargo receiving facilities where relevant.

## Recommended industry pages

Deferred construction, oil/gas, automotive-industry distribution, food/FMCG, healthcare and events. Existing sector mentions do not establish enough original expertise for separate pages. Obtain named service scope, handling procedures, approved case evidence and sector-specific responsibilities first. Do not create duplicate industrial/project pages.

## Homepage keyword strategy

H1: **Freight Forwarding & Logistics Company in Qatar**.

Title: **Freight Forwarding Company in Qatar | Argus Shipping**. The shorter company-intent title avoids crowding the snippet with all modes. The description covers air, sea, road, warehousing, Qatar and an enquiry action. Existing sections now introduce international freight services and global sourcing routes without changing the visual layout or slider.

## H1 map

See `SEO_IMPLEMENTATION_RESULTS.md` for the complete commercial H1 table. Services hub: **Freight & Logistics Services in Qatar**. Route directory: **International Shipping Routes to Qatar**. Other legacy page H1s are retained. Automated output validation requires exactly one H1 on every public page.

## Title map

`src/seo/metadata.mjs` is the shared title/description registry used by the browser and prerender step. The implementation results document lists each commercial title; the output check asserts exact matches and uniqueness across all 23 public routes.

## Internal-link structure

Homepage → service details and trade lanes. Services hub → existing service details, customs and project cargo. Footer → shipping hub. Shipping hub → five routes. Each detail page → its visible parent breadcrumbs, related services, contact, email and telephone. Sea → storage/customs; air → door-to-door/customs; road → storage/customs; 3PL → storage/road; trade lanes → air/sea/door-to-door/customs. Normal HTML anchors remain crawlable without JavaScript.

## Pages requiring new content

Industry and resource pages need expert-approved original content. Prioritise FCL vs LCL, air vs sea, chargeable weight and import-document preparation. Keep a China guide within the route page unless research establishes a distinct informational intent. Incoterms and customs guidance require current authoritative source review. Case studies need customer permission, real shipment scope and evidenced outcomes; none were invented.

## Pages that should remain unchanged

Authentication, dashboard, quote/RFQ forms, customer data, CRM screens and API business logic. Existing videos, branding, imagery and navigation appearance remain. About, Team, Why Us, Chairman and Contact retain their content; only their exported HTML/metadata delivery is improved.

## Redirect requirements

No existing indexed URL is migrated. `/services/` redirects directly to `/services` to preserve the hub. New nested pages use directory-style trailing-slash URLs and matching canonicals. Existing `.html` aliases continue to resolve with the preferred clean canonical. Keep the current www canonical host; verify host-level HTTP/non-www redirects after deployment before changing them. No new domain redirect was guessed.

## Priority order

P1: homepage and seven foundation services. P2: five operationally evidenced routes (China first). P3: project/vehicle content enrichment and evidence-led industry pages. Industry publication is conditional, not a volume target.

## Research and intent validation

Search sampling on 7 October 2026 found company/service results for Qatar freight, air/sea, road, clearance, warehousing and 3PL clusters; China-to-Qatar results mix route service offers and guides. This supports a broad homepage, service ownership and a useful route page with enquiry CTAs. It does not establish search volumes, Qatar-local personalised rankings or guaranteed commercial demand. Search Console and keyword-planner access were not provided.

Representative primary business sources reviewed for intent, not copied as Argus capabilities:

- [QTRANS service catalogue](https://www.qtls.qa/) — separate freight, clearance, storage and project service propositions.
- [GAC Qatar](https://www.gac.com/qatar/about-gac-qatar) — freight and contract-logistics business intent.
- [NBOX freight service](https://nbox.qa/services/freight-forwarding/) — 3PL and freight are related but distinct service propositions.
- [Speed Line China-to-Qatar page](https://speedlinelogistic.com/shipping-from-china-to-qatar/) — route-oriented freight enquiry intent; its claims/times are not reused.
- [Qatar Free Zones logistics overview](https://qfz.gov.qa/industries_/logistics/) — broader sector context, not evidence of Argus capabilities.
- [Google JavaScript SEO guidance](https://developers.google.com/search/docs/crawling-indexing/javascript/javascript-seo-basics) — use crawlable links and accessible rendered content.
- [Google search documentation updates](https://developers.google.com/search/updates) — FAQ rich-result documentation was removed in June 2026; no FAQ rich-result claims or FAQ schema were added.

The web reader could not retrieve the live Argus service/robots URLs during this run. Repository content and production builds were audited directly. Actual host configuration, live status codes and Google index state must be checked after deployment.

## Build and deployment

Run `npm run build` from the repository root. `build:landing` now builds Vite and prerenders all public routes; Next exports the operational pages; the merger copies the complete marketing output into `frontend/out`. Run `node scripts/check-seo.mjs frontend/out` before publishing. Deploy the complete merged output with its matching assets, images and nested directories. Rebuilding only Next or uploading source CSS does not update the marketing bundle.

Express supports extensionless `.html` routes and handles the services hub before static directory middleware. `.htaccess` supplies the equivalent hub and extension rules for Apache. If a host serves static files directly through nginx, configure equivalent extension resolution there; local validation cannot establish the Plesk server configuration.

## Validation and limitations

Static checks cover exact metadata, one H1, canonical/sitemap inclusion, schema JSON and breadcrumb URLs, asset existence, internal commercial destinations, and the current slider. Browser checks cover public routes, multiple viewport widths, SPA navigation/back, missing-route 404 and the services-hub redirect. See the final task report for the actual test outcome.

Results: Vite and Next production builds passed. The merged output passed all static checks for 23 pages and 488 internal links. Browser checks passed for all 23 public pages at 1440px and 390px; service and route templates also passed at 320, 375, 430, 768, 1024, 1366 and 1920px. No page JavaScript exceptions or horizontal document overflow were detected. Desktop and mobile screenshots were visually reviewed. The browser harness uses the installed runtime Playwright package and a temporary local static server, without adding a project dependency. It does not submit live enquiries or verify backend delivery. The deploy shell now propagates failed build commands through its logging pipelines instead of masking their exit status.

No field Core Web Vitals, ranking gains, Google indexing or production deployment are claimed. Measure LCP/INP/CLS after publishing using real traffic. No dependency or per-page tracking script was added. The existing large homepage frame sequence, image sizes and video behaviour remain possible performance work outside this content architecture change.
