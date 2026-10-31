// Response metadata only. This does not authorize access or change routing.
const privatePath = /^\/(?:api|admin|operator|customer|customers|rfq|dashboard|confirmed|contacts|quotation|calling-agent|sales|settings|summary|calculator|login|register|reset-password|landing)(?:\/|\.html$|$)/i;
function shouldNoindex(rawUrl) {
  const url = new URL(rawUrl, 'https://www.argusshipping.co');
  if (privatePath.test(url.pathname)) return true;
  // Campaign-only URLs retain the clean page canonical; arbitrary result/filter
  // parameters are never promoted into public indexable landing pages.
  return [...url.searchParams.keys()].some(key => !/^(?:utm_[a-z_]+|gclid|dclid|fbclid|msclkid)$/i.test(key));
}
function seoHeaders(req, res, next) {
  if (shouldNoindex(req.originalUrl || req.url)) res.setHeader('X-Robots-Tag', 'noindex, nofollow');
  next();
}
module.exports = { shouldNoindex, seoHeaders };
