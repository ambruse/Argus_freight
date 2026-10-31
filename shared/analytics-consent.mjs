import { rememberLanding, locationPageView } from './analytics.mjs';

export function installAnalyticsConsent() {
  if (typeof window === 'undefined' || window.setArgusAnalyticsConsent) return;
  const measurementId = 'G-TCQ42VNDBF'; // Existing property; ownership/data access not verified.
  let loaded = false;
  window.setArgusAnalyticsConsent = granted => {
    const allowed = granted === true;
    window[`ga-disable-${measurementId}`] = !allowed;
    window.dataLayer ||= [];
    function gtag() { window.dataLayer.push(arguments); }
    if (!allowed) {
      window.argusAnalytics = { consent: false };
      if (loaded) gtag('consent', 'update', { analytics_storage: 'denied', ad_storage: 'denied', ad_user_data: 'denied', ad_personalization: 'denied' });
      rememberLanding();
      return;
    }
    // The CMP must call this only after explicit analytics consent. No pre-consent requests.
    if (!loaded) {
      gtag('consent', 'default', { analytics_storage: 'denied', ad_storage: 'denied', ad_user_data: 'denied', ad_personalization: 'denied' });
      gtag('js', new Date());
      gtag('config', measurementId, { send_page_view: false, allow_google_signals: false, allow_ad_personalization_signals: false, page_location: 'https://www.argusshipping.co/', page_referrer: '', page_title: 'Argus Shipping' });
      const script = document.createElement('script');
      script.async = true;
      script.src = `https://www.googletagmanager.com/gtag/js?id=${measurementId}`;
      document.head.appendChild(script);
      loaded = true;
    }
    gtag('consent', 'update', { analytics_storage: 'granted', ad_storage: 'denied', ad_user_data: 'denied', ad_personalization: 'denied' });
    window.argusAnalytics = { consent: true, sink: ({ event, ...fields }) => {
      // No automatic URL/referrer or form details; all fields already allowlisted.
      gtag('event', event, { ...fields, send_to: measurementId, page_location: `https://www.argusshipping.co${fields.page_path === 'unknown' ? '/' : fields.page_path}`, page_referrer: '', page_title: 'Argus Shipping' });
    } };
    rememberLanding();
    locationPageView();
  };
  window.setArgusAnalyticsConsent(false);
}
