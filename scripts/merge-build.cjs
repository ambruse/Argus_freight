const fs = require('fs');
const path = require('path');

// Preserve each page's prerendered content and schema when merging with Next.
const dist = path.join(__dirname, '../dist');
const out = path.join(__dirname, '../frontend/out');
if (!fs.existsSync(path.join(dist, 'trade-lanes/index.html')) || !fs.existsSync(out)) {
  throw new Error('Build the landing site (including prerendering) and Next frontend before merging.');
}
fs.cpSync(dist, out, { recursive: true });
const quotation = path.join(out, 'quotation.html');
if (fs.existsSync(quotation)) fs.copyFileSync(quotation, path.join(out, 'Quotation.html'));
console.log('Merged all prerendered pages, images, videos, assets, robots and sitemap into frontend/out.');
