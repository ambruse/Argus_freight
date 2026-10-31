import publicPaths from './public-page-paths.json' with { type: 'json' };
const publicPages = new Set(publicPaths);

const events = new Set(['quote_start', 'quote_submit', 'quote_success', 'call_click', 'whatsapp_click', 'email_click', 'rate_search', 'location_page_view', 'trade_lane_cta_click']);
const countries = new Set(['QA', 'AE', 'CN', 'IN', 'BH', 'TR']);
const countryBySlug = { qatar: 'QA', uae: 'AE', china: 'CN', india: 'IN', bahrain: 'BH', turkey: 'TR' };
const services = new Set(['air-freight', 'sea-freight', 'road-freight', 'warehousing', 'customs-clearance', 'door-to-door-cargo', '3pl-logistics', 'project-cargo', 'dangerous-goods', 'vehicle-logistics']);
const storageKey = 'argus_seo_context_v1';
let lastLocationView = '';
const cleanPath = path => publicPages.has(path) ? path : path === '/customer/rfq/new' ? path : 'unknown';
const inferred = path => ({
  country: countryBySlug[path.split('/')[1] === 'locations' ? path.split('/')[2] : path.split('/')[1] === 'trade-lanes' ? path.split('/')[2]?.split('-to-')[1] : ''] || 'unknown',
  service: services.has(path.split('/')[2]) && path.startsWith('/services/') ? path.split('/')[2] : 'unknown',
});

// Host integration contract: a CMP supplies explicit consent and a reviewed sink.
// No provider, cookie, identifier, referrer, form value, URL query or auto pageview.
export function trackEvent(name, context = {}) {
  try {
    if (typeof window === 'undefined' || !events.has(name)) return false;
    const integration = window.argusAnalytics;
    if (integration?.consent !== true || typeof integration.sink !== 'function') {
      window.sessionStorage.removeItem(storageKey);
      return false;
    }
    const path = cleanPath(window.location.pathname);
    const derived = inferred(path);
    let landing = {};
    try { landing = JSON.parse(window.sessionStorage.getItem(storageKey) || '{}'); } catch { /* Ignore invalid storage. */ }
    if (!publicPages.has(landing.landing_page) && publicPages.has(path)) {
      landing = { landing_page: path, ...derived };
      window.sessionStorage.setItem(storageKey, JSON.stringify(landing));
    }
    const country = context.country || (derived.country !== 'unknown' ? derived.country : landing.country);
    const service = context.service || (derived.service !== 'unknown' ? derived.service : landing.service);
    const payload = {
      event: name,
      page_path: path,
      landing_page: publicPages.has(landing.landing_page) ? landing.landing_page : 'unknown',
      country: countries.has(country) ? country : 'unknown',
      service: services.has(service) ? service : 'unknown',
      ...(['live-rate-enquiry', 'customer-rfq'].includes(context.form_type) ? { form_type: context.form_type } : {}),
    };
    integration.sink(payload);
    return true;
  } catch { return false; } // Measurement must never interrupt a shipment task.
}

export function rememberLanding() {
  try {
    if (typeof window === 'undefined') return;
    if (window.argusAnalytics?.consent !== true) { window.sessionStorage.removeItem(storageKey); return; }
    const path = window.location.pathname;
    if (publicPages.has(path) && !window.sessionStorage.getItem(storageKey)) window.sessionStorage.setItem(storageKey, JSON.stringify({ landing_page: path, ...inferred(path) }));
  } catch { /* Storage can be blocked. */ }
}

export function locationPageView() {
  if (typeof window === 'undefined') return;
  const path = window.location.pathname;
  if (!/^\/locations\/[^/]+\/$/.test(path)) { lastLocationView = ''; return; }
  if (lastLocationView !== path && trackEvent('location_page_view')) lastLocationView = path;
}

export function observePublicClicks(event) {
  const anchor = event.target?.closest?.('a[href]');
  if (!anchor) return;
  const href = anchor.getAttribute('href');
  if (/^tel:/i.test(href)) trackEvent('call_click');
  else if (/^mailto:/i.test(href)) trackEvent('email_click');
  else if (/^https:\/\/(?:wa\.me\/|api\.whatsapp\.com\/)/i.test(href)) trackEvent('whatsapp_click');
  if (window.location.pathname.startsWith('/trade-lanes/') && href === '/contact') trackEvent('trade_lane_cta_click');
}
