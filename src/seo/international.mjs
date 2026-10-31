import { metadata } from './metadata.mjs';
import { canonicalUrl } from './urls.mjs';

// Reviewed vocabulary, not a regex pretending to validate ISO registries.
// Extend only after verifying Google support and editorial intent.
export const locales = Object.freeze({
  en: { language: 'en', dir: 'ltr', label: 'English' },
  ar: { language: 'ar', dir: 'rtl', label: 'العربية' },
  'ar-QA': { language: 'ar-QA', dir: 'rtl', label: 'العربية — قطر' },
  'ar-AE': { language: 'ar-AE', dir: 'rtl', label: 'العربية — الإمارات' },
  'ar-BH': { language: 'ar-BH', dir: 'rtl', label: 'العربية — البحرين' },
  'zh-Hans': { language: 'zh-Hans', dir: 'ltr', label: '简体中文' },
  tr: { language: 'tr', dir: 'ltr', label: 'Türkçe' },
});
export const parityChecks = ['body', 'metadata', 'navigation', 'forms', 'contacts', 'terminology', 'layout'];

// Each route is its own content entity: countries are NOT equivalent pages.
export const pageRegistry = Object.freeze(Object.fromEntries(Object.keys(metadata).map(route => [route, {
  entity: route, locale: 'en', status: 'published-source', indexable: true,
  canonical: canonicalUrl(route), translation: null,
}])));

export function alternatesFor(route, registry = pageRegistry) {
  const page = registry[route];
  if (!page) return [];
  const variants = Object.entries(registry).filter(([, candidate]) => candidate.entity === page.entity);
  if (variants.length < 2) return [];
  const result = variants.map(([path, candidate]) => ({ locale: candidate.locale, url: canonicalUrl(path), path, label: locales[candidate.locale]?.label }));
  const fallback = variants.find(([, candidate]) => candidate.fallback === true);
  if (fallback) result.push({ locale: 'x-default', url: canonicalUrl(fallback[0]), path: fallback[0] });
  return result;
}

export function validateInternational(registry = pageRegistry, manifest = metadata) {
  const errors = [];
  const entities = new Map();
  for (const [route, page] of Object.entries(registry)) {
    let canonical;
    try { canonical = canonicalUrl(route); } catch (error) { errors.push(error.message); }
    if (!manifest[route]?.title || !manifest[route]?.description) errors.push(`${route}: missing rendered route/metadata`);
    if (!locales[page.locale]) errors.push(`${route}: locale not reviewed/supported`);
    if (page.canonical !== canonical) errors.push(`${route}: canonical is not exact self-reference`);
    if (!page.indexable || page.redirect) errors.push(`${route}: alternate must be indexable and not redirected`);
    if (!page.entity) errors.push(`${route}: missing equivalent content entity`);
    if (!['published-source', 'approved-translation'].includes(page.status)) errors.push(`${route}: unpublished counterpart`);
    if (page.status === 'published-source' && page.locale !== 'en') errors.push(`${route}: new language requires approved translation`);
    if (page.status === 'approved-translation') {
      const t = page.translation;
      if (!t?.source || !registry[t.source] || registry[t.source]?.entity !== page.entity || t.source === route || !t?.reviewer || !/^\d{4}-\d{2}-\d{2}$/.test(t?.reviewedOn || '') || parityChecks.some(key => t?.parity?.[key] !== true)) {
        errors.push(`${route}: translation needs source, reviewer, date and complete parity approval`);
      }
    }
    const group = entities.get(page.entity) || [];
    group.push([route, page]); entities.set(page.entity, group);
  }
  for (const route of Object.keys(manifest)) if (!registry[route]) errors.push(`${route}: missing registry entry`);
  for (const [entity, members] of entities) {
    const codes = members.map(([, page]) => page.locale);
    if (new Set(codes).size !== codes.length) errors.push(`${entity}: duplicate locale in equivalent set`);
    if (members.filter(([, page]) => page.fallback).length > 1) errors.push(`${entity}: multiple x-default fallbacks`);
    for (const [route, page] of members) {
      if (page.fallback && !page.fallbackPurpose) errors.push(`${route}: x-default needs an explicit fallback purpose`);
      const annotations = alternatesFor(route, registry);
      if (members.length > 1 && !annotations.some(a => a.locale === page.locale && a.url === page.canonical)) errors.push(`${route}: missing self-reference`);
      for (const alternate of annotations) {
        if (alternate.locale === 'x-default') continue;
        if (!alternatesFor(alternate.path, registry).some(a => a.locale === page.locale && a.url === page.canonical)) errors.push(`${route}: missing reciprocal`);
      }
    }
  }
  return errors;
}
