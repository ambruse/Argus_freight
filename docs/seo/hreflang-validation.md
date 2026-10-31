# Hreflang validation

Audit date: 2026-10-31. Method: HTML head only. Source: `src/seo/international.mjs`; consumers: `scripts/prerender.mjs` and `src/App.jsx`.

## Current result

- 46 English source entities, zero genuine translated pairs, zero emitted hreflang annotations. Six markets remain separate entities. There is no legitimate reciprocal multilingual graph to validate live yet.
- Baseline live crawl found zero alternate annotations, all English `lang` attributes, direct 200 responses and self-canonicals for all source routes. No country-equivalence error was observed.
- The build validates registry membership, metadata presence, approved locale vocabulary, canonical self-reference, indexable/nonredirect status, uniqueness of locale per entity, complete translation parity, and fallback purpose. The HTML audit compares actual generated tags to the exact expected set, checks every alternate file and user-facing language link, then verifies canonical and noindex state on every page.
- Positive and negative fixture tests exercise bilingual reciprocity/self-reference, unknown codes (`zz`, country-only `QA`, `en-UK`), missing route, unapproved translation, incomplete body parity, cross-canonical, noindex, redirects and fallback purpose. Fixtures never publish language pages.
- Runtime noindex headers and real deployed status cannot be established solely from a registry boolean. Run a release crawl after activation and block release if any alternate redirects, is missing, is robots-blocked or carries noindex. Keep the manifest and runtime observations separate.

## Locale and annotation policy

Language codes follow ISO 639-1; regions use ISO 3166-1 alpha-2; script variants use appropriate ISO 15924 values. `ar`, `zh-Hans`, and `tr` are proposed language families, not new routes. Arabic region variants need evidence of materially equivalent content serving those audiences. Do not use `UK`, `EU`, country-only tags or arbitrary numeric region codes. No forced geographic redirects.

HTML links must be inside the head, use full HTTPS URLs, reference the source exactly and have complete reciprocals. Existing genuinely different market offers must never be combined to make a larger cluster. `x-default` is optional here; no actual multilingual selector/fallback set currently exists.

## Reproduction

```powershell
npm run test:seo
npm run build:landing
node scripts/check-seo.mjs dist
npm run docs:international
# After the complete portal build and merge:
npm run check:seo
```

For a translated release, add an observed annotations file with `source_url`, `language`, `target_url` rows from the actual HTML. Resolve the installed skill's `../../scripts/validate_hreflang.py` from its SKILL.md location and run it on that explicit file. Its scope is observed-pair syntax and reciprocity, not registered-code validation, full-cluster equality, translation quality or live indexability. Current site has zero annotations, so there is no nonempty observed annotation dataset to pass through that optional helper; the repository validator is the executable regression gate.

Current Google guidance was opened before implementation: [localized versions](https://developers.google.com/search/docs/specialty/international/localized-versions) and [multilingual/multiregional sites](https://developers.google.com/search/docs/specialty/international/managing-multi-regional-sites). No Search Console validation, indexing success or ranking improvement is claimed.
