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

// 2. Create static copies of index.html for other landing routes
const landingRoutes = ['about', 'services', 'why-us', 'team', 'contact', 'chairman-message'];
landingRoutes.forEach(route => {
  fs.writeFileSync(path.join(outDir, `${route}.html`), indexHtmlContent, 'utf-8');
  console.log(`✓ Created frontend/out/${route}.html`);
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
