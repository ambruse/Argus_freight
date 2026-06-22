const fs = require('fs');
const path = require('path');

const srcDir = path.join(__dirname, '../dist');
const destLandingDir = path.join(__dirname, '../frontend/public/landing');
const destAssetsDir = path.join(__dirname, '../frontend/public/assets');

// Clean and create target directories
if (fs.existsSync(destLandingDir)) {
  fs.rmSync(destLandingDir, { recursive: true, force: true });
}
fs.mkdirSync(destLandingDir, { recursive: true });

// Copy index.html to frontend/public/landing
if (fs.existsSync(path.join(srcDir, 'index.html'))) {
  fs.copyFileSync(
    path.join(srcDir, 'index.html'),
    path.join(destLandingDir, 'index.html')
  );
  console.log('✓ Copied index.html to frontend/public/landing');
}

// Copy assets folder to frontend/public/assets
if (fs.existsSync(path.join(srcDir, 'assets'))) {
  if (fs.existsSync(destAssetsDir)) {
    fs.rmSync(destAssetsDir, { recursive: true, force: true });
  }
  fs.cpSync(path.join(srcDir, 'assets'), destAssetsDir, { recursive: true });
  console.log('✓ Copied assets to frontend/public/assets');
}

// Copy Videos folder to frontend/public/Videos for local media play
const srcVideos = path.join(__dirname, '../public/Videos');
const destVideos = path.join(__dirname, '../frontend/public/Videos');
if (fs.existsSync(srcVideos)) {
  if (fs.existsSync(destVideos)) {
    fs.rmSync(destVideos, { recursive: true, force: true });
  }
  fs.cpSync(srcVideos, destVideos, { recursive: true });
  console.log('✓ Copied Videos to frontend/public/Videos');
}

// Copy images folder to frontend/public/images
const srcImages = path.join(__dirname, '../public/images');
const destImages = path.join(__dirname, '../frontend/public/images');
if (fs.existsSync(srcImages)) {
  if (fs.existsSync(destImages)) {
    fs.rmSync(destImages, { recursive: true, force: true });
  }
  fs.cpSync(srcImages, destImages, { recursive: true });
  console.log('✓ Copied images to frontend/public/images');
}

// Copy root-level icons.svg, logo.png, light-logo.png to frontend/public
const rootFiles = ['favicon.svg', 'icons.svg', 'logo.png', 'light-logo.png'];
rootFiles.forEach(file => {
  const src = path.join(__dirname, '../public', file);
  const dest = path.join(__dirname, '../frontend/public', file);
  if (fs.existsSync(src)) {
    fs.copyFileSync(src, dest);
    console.log(`✓ Copied ${file} to frontend/public`);
  }
});

console.log('🎉 Landing page assets copied to frontend public directory successfully!');
