import fs from 'node:fs';
import { metadata } from '../src/seo/metadata.mjs';
import { byPath } from '../src/seo/commercial-pages.mjs';
import { pageRegistry, alternatesFor, validateInternational } from '../src/seo/international.mjs';
const errors=validateInternational(); if(errors.length) throw Error(errors.join('\n'));
const dir='docs/seo'; fs.mkdirSync(dir,{recursive:true});
const rows=Object.entries(pageRegistry).map(([route,page])=>({route,group:byPath[route]?.group||'base',...page,alternates:alternatesFor(route),gaps:{ar:'No approved complete translation supplied','zh-Hans':'No approved complete translation supplied',tr:'No approved complete translation supplied'}}));
fs.writeFileSync(`${dir}/translation-registry.json`,JSON.stringify(rows,null,2)+'\n');
const table=rows.map(page=>`| ${page.canonical} | ${page.group} | ${page.locale} | Exact self | None | Not available | Not available | Not available |`).join('\n');
fs.writeFileSync(`${dir}/international-url-matrix.md`,`# International URL and parity matrix

Generated from the current route/translation registry by \`npm run docs:international\`. Audit: 2026-10-31. Source of truth: \`src/seo/international.mjs\`; machine export: [translation-registry.json](translation-registry.json).

${rows.length} published English source pages, ${rows.filter(p=>p.alternates.length).length} active equivalent sets, zero approved translated counterparts. Every URL below was fetched as a direct 200 in [live-http.json](evidence/live-http.json). Local build checks verify canonical/indexability/head markup separately. No translated route, language switcher or x-default is currently published. This absence is a coverage gap, not an annotation error.

Each row is its own content entity. Qatar, UAE, China, India, Turkey and Bahrain pages have different market details and offers; they are not alternate versions of one page. Do not cluster them or cluster them with the global homepage. Generic English remains \`en\`, not an inferred country locale.

| Source URL (also canonical) | Page group | Current language | Canonical | Active alternates | Arabic counterpart | Simplified Chinese counterpart | Turkish counterpart |
| --- | --- | --- | --- | --- | --- | --- | --- |
${table}

## Activation and parity gate

Future URLs are additive proposals, not known pages: prefix the corresponding existing route with \`/ar\`, \`/zh-hans\` or \`/tr\` after approving the audience and complete copy. Preserve the source's current slash convention. Do not add \`/en/\` aliases or migrate current English URLs. For example, a future Arabic version of the Qatar market page could use \`/ar/locations/qatar/\`; it is not published or annotated now.

For each proposed counterpart record source URL/content entity, locale, actual rendered path, translator, reviewer, reviewed date, and approval of body, metadata, navigation, forms, contacts, terminology and layout. \`approved-translation\` requires all seven parity flags plus reviewer/date/source. Existing English records use \`published-source\`; that is not independent verification of every commercial claim. New route content and rendering must be implemented and reviewed before its registry entry can be enabled.

Arabic must render a fully Arabic task (including errors, help, legal text and CTAs), \`lang=ar\`, \`dir=rtl\`, and appropriate LTR isolation for phone/reference values. No untranslated English main body. Chinese script selection and Turkish terminology need native freight-editor review. Market contact details must remain factually supported. The locale vocabulary includes generic language/script codes and approved Arabic region codes; expand only after ISO and editorial review.

Hreflang uses HTML head only, shared by prerender and client navigation. Both pages get identical complete sets, including exact self references. Self-canonicals stay on each equivalent page. A fallback can only reference an existing equivalent member with an explicitly recorded fallback purpose; no blanket homepage x-default on every page. Crawlable language navigation renders only for active sets. No IP/Accept-Language redirect logic is introduced.

## Private and duplicate URL exclusions

Operational/login/RFQ/rate results and tracking API records never become locale counterparts or sitemap entries. The public tracking tool itself remains indexable at \`/tracking\`; query variants receive response noindex. Campaign-only variants retain the clean canonical. \`/services/\` keeps its pre-existing redirect to \`/services\`; no URL migration is introduced.
`);
console.log(`Generated ${rows.length} URL/parity rows; no placeholder language URLs activated.`);
