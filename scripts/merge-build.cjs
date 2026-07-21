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

// 1. Copy dist/index.html to frontend/out/index.html (overwriting Next.js blank index)
fs.copyFileSync(
  path.join(distDir, 'index.html'),
  path.join(outDir, 'index.html')
);
console.log('✓ Overwrote frontend/out/index.html with landing page index.html');

// 2. Create static copies of index.html for other landing routes
const landingRoutes = ['about', 'services', 'why-us', 'team', 'contact', 'chairman-message'];
landingRoutes.forEach(route => {
  fs.copyFileSync(
    path.join(distDir, 'index.html'),
    path.join(outDir, `${route}.html`)
  );
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

console.log('🎉 Landing page successfully merged into frontend/out!');
