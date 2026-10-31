import { SITE } from './commercial-pages.mjs';

// Preserve the established mixed slash policy; never infer locales or aliases.
export function canonicalUrl(route) {
  if (typeof route !== 'string' || !route.startsWith('/') || route.startsWith('//') || /[?#\\\s]/.test(route)) {
    throw new Error(`Canonical requires an exact public route: ${route}`);
  }
  const url = new URL(route, SITE);
  if (url.origin !== SITE || url.pathname !== route) throw new Error(`Unsafe canonical route: ${route}`);
  return url.href;
}
