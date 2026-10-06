# Internal linking plan

## Current pattern

Public navigation exposes Home, About, Services, Tracking, Why Us, Team, Contact, and login. Homepage service cards are primarily content blocks; source uses click handlers and SPA navigation in several places. Keep meaningful navigation in normal `<a href>` links so crawlers and users can follow destinations. Preserve login as a utility destination and noindex the authenticated app.

## Recommended graph

```text
Home → Services overview → service detail pages → Contact / Request a Quote
Air freight ↔ Customs clearance ↔ Warehousing
Sea freight ↔ Road freight ↔ Door-to-door
Trade lane → relevant freight mode + customs + contact
Guide → relevant service + quote CTA
About / Team / Case study → relevant service + Contact
```

## Implementation rules

- Link from homepage service summaries to their exact detail page when it exists.
- Each service page should link to two or three genuinely related services and one quote/contact route.
- Link guides to the commercial service that answers the reader's next question.
- Use descriptive concise anchors, such as “sea freight options” or “Qatar customs clearance process”; avoid repeating exact-match anchors everywhere.
- Add visible breadcrumbs to nested service/guide/lane pages and matching `BreadcrumbList` only when actual hierarchy exists.
- Check for orphan pages after every launch with a crawl.
- Do not use JavaScript-only click targets for links that should be crawlable.
