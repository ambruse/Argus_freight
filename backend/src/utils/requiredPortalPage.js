'use strict';
const fs = require('node:fs');
const path = require('node:path');

// A missing exported portal page is a deployment error, never a marketing route.
function requiredPortalPage(directory, filename) {
  const target = path.join(directory, filename);
  return (_req, res) => {
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('X-Robots-Tag', 'noindex, nofollow');
    if (fs.existsSync(target) && fs.statSync(target).isFile()) return res.sendFile(target);
    res.setHeader('Retry-After', '60');
    return res.status(503).type('text/plain').send(
      'Shipment Tracking Management is temporarily unavailable while its dashboard build is deployed. Please try again shortly.'
    );
  };
}
module.exports = { requiredPortalPage };
