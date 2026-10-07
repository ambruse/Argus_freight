# Structured data plan

## Current risk

Live homepage markup used a LocalBusiness node with a Render-host URL/ID, phone and hours that conflict with the visible contact page. The local homepage also emits a second `CargoShippingService` object with other entity facts. Existing values should not be treated as authoritative when the public pages disagree.

## Recommended graph

1. Site-wide public identity: one `Organization` node with stable `@id` on `https://www.argusshipping.co/#organization`, official name/logo/url, email, and confirmed phone/address only.
2. Homepage: `WebSite` node with stable `@id`, `url`, and `publisher` reference to the organization.
3. Contact page: use a specific `LocalBusiness` subtype only after company confirms the true public-facing location, street address, telephone, hours and whether the stated address is public. Never mark a PO box as a street address or infer coordinates.
4. Service detail page: `Service` markup can describe visible service content and reference the organization. Do not expect a generic Service object to produce a Google rich result.
5. Nested pages: BreadcrumbList when visible breadcrumbs exist and each URL reflects actual hierarchy.

## Verification required before LocalBusiness

- Legal entity display name and public brand name.
- Physical street address, post code, country, and whether visitors are served there.
- Primary phone (Contact page currently says +974 44116544; homepage/other sources must be reconciled).
- Real business hours (Contact page currently lists Sunday–Thursday 08:00–17:00 AST).
- Coordinates and service area.
- Actual certifications, service catalogue and social profiles.

Do not add rating/review markup for the business's own reviews, fake reviews, or unsupported service-area claims. Validate JSON-LD syntax and eligibility; accurate structured data is not a ranking guarantee.

References: [Google LocalBusiness structured data](https://developers.google.com/search/docs/appearance/structured-data/local-business), [review snippet rules](https://developers.google.com/search/docs/appearance/structured-data/review-snippet).
