# SEO scorecard (provisional)

This is a source/live-checklist assessment, not a Google ranking metric. The 0–100 points are a transparent readiness rubric: whether the audit found core implementation signals to be correct, complete and verified. “After” means source changes in this repository; they have not yet been deployed or re-crawled. External metrics are not available, so authority, performance, analytics and local listing scores remain unscored.

| SEO area | Before | After source changes | Evidence / remaining work |
|---|---:|---:|---|
| Technical SEO | 35/100 | 55/100 | Host consistency, robots sitemap and route metadata sources improved; still requires production crawl, server-rendering decision, status/redirect checks and GSC validation |
| On-page SEO | 35/100 | 60/100 | One homepage title, visible homepage H1 and route-specific metadata added to SPA/build copies; server HTML has no prerendered page body and full heading audit remains |
| Content | 40/100 | 40/100 | Existing service scope is broad, but depth/proof and accuracy require subject-matter review; no content expansion shipped |
| Internal linking | 40/100 | 40/100 | Main routes are navigable; service card links, orphan coverage and crawlable link paths need full crawl |
| Local SEO | 25/100 | 40/100 | Source contact facts aligned in schema to visible Contact page; true street address, hours, listings and GBP remain unverified |
| Structured data | 20/100 | 55/100 | Removed Render-host business identity and unverified hours/coordinates; unified Organization/WebSite IDs and linked Service data; validate markup and business facts after deployment |
| Performance | Not scored | Not scored | No PageSpeed/CrUX/Search Console field data or device lab run was available |
| Authority | Not scored | Not scored | No backlink index, link export, or verified editorial coverage data |
| Conversion SEO | 25/100 | 25/100 | Contact page has direct phone/email; source form simulates submission and must be connected/verified; no lead attribution access |
| Analytics | Not scored | Not scored | GA4/GSC access and consent configuration unavailable |

These checklist numbers should be superseded by a complete crawl and connected-property baseline before they are used for management reporting.
