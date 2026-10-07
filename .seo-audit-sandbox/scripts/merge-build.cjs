const fs = require('fs');
const path = require('path');

const distDir = path.join(__dirname, '../dist');
const outDir = path.join(__dirname, '../frontend/out');

if (!fs.existsSync(distDir)) {
  console.error('Error: ./dist directory not found. Please build landing page first.');
  process.exit(1);
}

if (!fs.existsSync(outDir)) {
  console.error('Error: ./frontend/out directory not found. Please build frontend first.');
  process.exit(1);
}

// 1. Read dist/index.html
const indexHtmlContent = fs.readFileSync(path.join(distDir, 'index.html'), 'utf-8');

// Write to frontend/out/index.html
fs.writeFileSync(path.join(outDir, 'index.html'), indexHtmlContent, 'utf-8');
console.log('✓ Overwrote frontend/out/index.html with landing page index.html');

// 2. Create static copies with route-specific metadata for public landing routes.
const landingRoutes = {
  about: {
    title: 'About Argus Shipping | Qatar Logistics Expertise',
    description: 'Learn about Argus Shipping W.L.L., its logistics network, experience and freight forwarding services supporting businesses in Qatar.',
  },
  services: {
    title: 'Freight & Logistics Services in Qatar | Argus Shipping',
    description: 'Explore Argus Shipping air and sea freight, GCC road transport, warehousing, consolidation and specialized logistics services for businesses.',
  },
  'why-us': {
    title: 'Why Choose Argus Shipping | Freight Forwarding Qatar',
    description: 'Discover Argus Shipping’s logistics network, cargo capabilities and customer support for freight movements in Qatar and across the GCC.',
  },
  team: {
    title: 'Our Team | Argus Shipping Qatar',
    description: 'Meet the people supporting Argus Shipping freight forwarding and logistics operations in Qatar.',
  },
  contact: {
    title: 'Contact Argus Shipping | Qatar Freight Quotes',
    description: 'Contact Argus Shipping in Doha about air freight, sea freight, road transport, warehousing or a tailored cargo quote.',
  },
  tracking: {
    title: 'Track a Shipment | Argus Shipping',
    description: 'Use Argus Shipping shipment tracking to check cargo progress and contact the logistics team about your consignment.',
  },
  'chairman-message': {
    title: 'Chairman’s Message | Argus Shipping',
    description: 'Read the chairman’s perspective on Argus Shipping, its freight forwarding operations and service to clients.',
  },
};

Object.entries(landingRoutes).forEach(([route, { title, description }]) => {
  const canonicalUrl = `https://www.argusshipping.co/${route}`;
  const escapeAttribute = (value) => value.replace(/&/g, '&amp;').replace(/"/g, '&quot;');
  const safeTitle = escapeAttribute(title);
  const safeDescription = escapeAttribute(description);
  const routeHtml = indexHtmlContent
    .replace(/<title>[^<]*<\/title>/i, `<title>${safeTitle}</title>`)
    .replace(/(<meta\s+name="description"\s+content=")[^"]*("\s*\/?>)/i, `$1${safeDescription}$2`)
    .replace(/(<link\s+rel="canonical"\s+href=")[^"]*("\s*\/?>)/i, `$1${canonicalUrl}$2`)
    .replace(/(<meta\s+property="og:title"\s+content=")[^"]*("\s*\/?>)/i, `$1${safeTitle}$2`)
    .replace(/(<meta\s+property="og:description"\s+content=")[^"]*("\s*\/?>)/i, `$1${safeDescription}$2`)
    .replace(/(<meta\s+property="og:url"\s+content=")[^"]*("\s*\/?>)/i, `$1${canonicalUrl}$2`)
    .replace(/(<meta\s+name="twitter:title"\s+content=")[^"]*("\s*\/?>)/i, `$1${safeTitle}$2`)
    .replace(/(<meta\s+name="twitter:description"\s+content=")[^"]*("\s*\/?>)/i, `$1${safeDescription}$2`)
    .replace(/(<meta\s+name="twitter:url"\s+content=")[^"]*("\s*\/?>)/i, `$1${canonicalUrl}$2`);

  fs.writeFileSync(path.join(outDir, `${route}.html`), routeHtml, 'utf-8');
  console.log(`✓ Created frontend/out/${route}.html with unique metadata`);
});

// 3. Copy dist/assets contents into frontend/out/assets recursively
const srcAssets = path.join(distDir, 'assets');
const destAssets = path.join(outDir, 'assets');

if (fs.existsSync(srcAssets)) {
  if (!fs.existsSync(destAssets)) {
    fs.mkdirSync(destAssets, { recursive: true });
  }
  fs.cpSync(srcAssets, destAssets, { recursive: true });
  console.log('✓ Copied landing page assets to frontend/out/assets');
}

// 4. Create Quotation.html copy so /Quotation URL works on case-sensitive web servers
const lowerQuot = path.join(outDir, 'quotation.html');
const upperQuot = path.join(outDir, 'Quotation.html');
if (fs.existsSync(lowerQuot)) {
  fs.copyFileSync(lowerQuot, upperQuot);
  console.log('✓ Created frontend/out/Quotation.html alias');
}

console.log('🎉 Landing page successfully merged into frontend/out!');
