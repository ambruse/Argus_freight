'use strict';
const fs = require('node:fs');
const path = require('node:path');

// A missing exported portal page is a deployment error, never a marketing route.
function requiredPortalPage(directory, filename, { state = () => ({}) } = {}) {
  const target = path.join(directory, filename);
  return (_req, res) => {
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('X-Robots-Tag', 'noindex, nofollow');
    if (fs.existsSync(target) && fs.statSync(target).isFile()) return res.sendFile(target);
    res.setHeader('Retry-After', '60');
    if (state().phase === 'building') {
      return res.status(503).type('html').send(`<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<meta http-equiv="refresh" content="20"><title>Preparing Shipment Tracking | Argus Freight</title></head>
<body><main><h1>Preparing Shipment Tracking Management</h1>
<p>The dashboard is being prepared. This page will refresh automatically.</p></main></body></html>`);
    }
    return res.status(503).type('text/plain').send(
      'Shipment Tracking Management is temporarily unavailable. Its dashboard build is not ready. Please try again shortly or contact Argus support.'
    );
  };
}
module.exports = { requiredPortalPage };
