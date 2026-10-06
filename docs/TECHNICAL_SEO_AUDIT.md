# Technical SEO audit

## Confirmed from source/live checks

- Canonical host behavior: apex `argusshipping.co` redirects to www. Use `https://www.argusshipping.co/` consistently in canonical, sitemap, Open Graph, and schema identifiers.
- Live homepage contained duplicate `<title>` elements in the response snapshot.
- Live LocalBusiness JSON-LD identified `argus-freight.onrender.com`, used a phone differing from visible Contact page, and included unverified 24/7 hours and coordinates.
- Public Vite routes use one client-side React app shell. Route-specific head updates now run after React renders, and the static merge script emits distinct head metadata for each existing public route. The route body still depends on JavaScript; static/server rendering of the public page body remains a priority.
- The Next app metadata describes “Cargo & RFQ Management”. It now points social metadata to the www company host and defaults to noindex/follow false; verify exported route HTML after deployment.
- Local `frontend/public/robots.txt` pointed at Render; updated to www canonical. Private application disallow rules were removed so crawlers can read the Next layout's noindex directive. Local sitemap is aligned to eight public route URLs on www.
- Sitemap's `changefreq`/`priority` values were removed. Add `lastmod` only from reliable page update data.
- No route-specific canonical/robots/OG metadata in Vite source; no hreflang implementation found.

## Not verified

Search Console coverage/exclusions, server response codes beyond sampled routes, redirects for all variants, complete internal link crawl, mobile screenshots, Googlebot rendered DOM, PageSpeed, CrUX Core Web Vitals, security headers on live host, and performance under representative network/device profiles.

## Required follow-up

1. Choose one public rendering strategy (static export/prerender or server rendering) and output route HTML with unique titles, descriptions, canonicals and OG data.
2. Ensure private app pages return `noindex` and do not appear in sitemap; do not rely on `robots.txt` alone to deindex.
3. Confirm the public URL inventory and directly test every canonical and alias. Decide whether `.html` variants exist; use one canonical and direct redirects for duplicates.
4. Keep robots permissive for public rendering resources; disallow sensitive app routes only after confirming authentication and noindex behavior. Never block a URL needed to process its noindex directive.
5. Generate sitemap from the route registry and include only indexable 200 canonical pages. Submit it in GSC.
6. Validate Organization/LocalBusiness markup with Rich Results Test and Schema Markup Validator after the business record is verified.
7. Run mobile and desktop CWV field analysis at the 75th percentile; use Lighthouse/WebPageTest as diagnostics, not as proof of field performance.
8. Crawl links, images, headers, status codes, canonical consistency, pagination/parameters, and internal search paths.

References: [Google JavaScript SEO guide](https://developers.google.com/search/docs/crawling-indexing/javascript/javascript-seo-basics), [SEO guide for developers](https://developers.google.com/search/docs/fundamentals/get-started-developers), [robots meta tags](https://developers.google.com/search/docs/crawling-indexing/robots-meta-tag), [sitemap guidance](https://developers.google.com/search/docs/crawling-indexing/sitemaps/build-sitemap), [Core Web Vitals](https://web.dev/articles/vitals?hl=en).
