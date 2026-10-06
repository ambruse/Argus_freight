# Argus Shipping enterprise SEO strategy

## North star

Generate qualified B2B freight enquiries from Qatar first. Build organic visibility around services the company currently describes: air freight, sea freight (FCL/LCL), GCC road freight, customs coordination, warehousing/consolidation, door-to-door cargo, vehicle logistics, courier, relocation and broader supply-chain support. Expand to GCC and trade lanes only where sales can confirm operational coverage and provide unique useful detail.

## Search architecture

The current route set is a compact corporate site. Keep existing URLs and strengthen them first:

| Intent cluster | Current canonical target | Recommended role |
|---|---|---|
| Qatar logistics / freight forwarder | `/` | Primary commercial hub, one clear H1 and links to verified services |
| Freight service overview | `/services` | Hub page; one H1 and crawlable links to dedicated service pages |
| Company expertise | `/about` | Experience, network model, verified credentials and real operating details |
| Reasons to select Argus | `/why-us` | Evidence-based differentiators and proof |
| Team / leadership | `/team`, `/chairman-message` | Trust and ownership; consolidate only if duplicate intent/content is confirmed |
| Enquiry | `/contact` | Conversion destination with reliable form, phone, email and NAP |
| Shipment tracking | `/tracking` | Utility page; decide indexability based on unique helpful content vs app-like form |

Next phase: create dedicated pages for air freight, sea freight, road freight, customs clearance, warehousing, door-to-door and project/heavy cargo only after capability confirmation and unique content review. Preserve public URL equity; decide whether the existing root-level slugs remain or use `/services/...` before launch. Avoid creating pages for services unsupported by evidence.

## Content and authority model

Commercial pages explain the service, fit, shipment choices, handling process, Qatar-specific steps, route variables, related services and a direct quote path. Support them with practical guides based on real customer questions and operational expertise. Publish named experts and case studies only with permission and factual source material. No keyword-stuffed copy, generic AI pages, fabricated rates, transit guarantees, certifications, locations or customer results.

## Conversion and measurement

Prioritize quote form submission, valid phone taps, WhatsApp click, email click and qualified lead outcome. The current Vite contact form is simulated in source; confirm the deployed path before spending effort on traffic growth. Instrument a consent-aware analytics plan only after property access and privacy requirements are known. Evaluate leads and conversion quality by landing page and channel, not sessions alone.

## Technical direction

Fix title/canonical/entity consistency immediately. Then provide route-specific metadata and static/server-rendered HTML for public pages, keep the authenticated app out of indexation, and retain simple crawlable anchor links. Generate sitemap from the final canonical route registry. Measure field Core Web Vitals through CrUX/Search Console and lab checks on representative mobile/desktop routes.

## Guardrails

- Use `https://www.argusshipping.co/` as the host until hosting confirms another canonical. Apex currently redirects to www.
- Preserve established route paths; do not migrate without a redirect map and production checks.
- Business facts and LocalBusiness fields must match visible pages and authoritative company records.
- Do not publish trade lanes or industry pages until operational capacity and unique evidence are verified.
- Keep quote form UX and existing brand intact while improving discoverability.

## Success measures

Use monthly baseline and cohort reporting for non-brand impressions/clicks, commercial query positions, qualified organic leads, lead conversion rate, service page engagement, and mobile/desktop field CWV at p75. Establish numeric targets after GSC/GA4 data is available.
