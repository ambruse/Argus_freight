# SEO redirect map

No application-level URL migration is recommended in this audit. Existing public paths should be preserved while route rendering and metadata improve.

| Existing URL | Proposed destination | Action | Status |
|---|---|---|---|
| `https://argusshipping.co/*` | `https://www.argusshipping.co/*` | Preserve current host redirect if confirmed as direct permanent 301 for all paths | Live apex root redirects to www; per-path code/headers not fully verified |
| `/services.html` | `/services` | Canonical is `/services`; the SPA normalizes the route after hydration. Prefer a direct server 301 when hosting configuration is confirmed | Both returned 200 in sampled check; client normalization is source-only |
| `/chairman-message` | same | Preserve | Existing route/sitemap URL |
| Other current public paths | same | Preserve | No URL migration proposed |

Before any migration, check GSC indexed URLs and external links, add direct permanent redirects, update internal links/canonicals/sitemap, then test redirect status and avoid chains. Do not redirect distinct pages together merely because content is short.
