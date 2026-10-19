const fs = require('node:fs');
const path = require('node:path');

function checkDeployment(directory = path.resolve(__dirname, '../frontend/out')) {
  for (const file of ['index.html', 'login.html', 'settings.html', 'rfq/new.html',
    'customer/rfq/new.html', 'operator/live-rates.html']) {
    const filename = path.join(directory, file);
    if (!fs.existsSync(filename) || !fs.statSync(filename).isFile()) {
      throw new Error(`Incomplete website export: ${file} is missing. Run the full build from the repository root before deploying.`);
    }
  }
  const visit = folder => {
    for (const entry of fs.readdirSync(folder, { withFileTypes: true })) {
      const filename = path.join(folder, entry.name);
      if (entry.isDirectory()) visit(filename);
      else if (entry.name.endsWith('.html')) {
        const html = fs.readFileSync(filename, 'utf8');
        for (const [, asset] of html.matchAll(/(?:src|href)="(\/(?:_next|assets)\/[^"?#]+)(?:[^" ]*)"/g)) {
          if (!fs.existsSync(path.join(directory, decodeURIComponent(asset)))) {
            throw new Error(`Incomplete website export: ${path.relative(directory, filename)} references missing ${asset}`);
          }
        }
      }
    }
  };
  visit(directory);
  console.log('Deployment export verified: homepage and portal pages and referenced scripts/styles exist.');
}

if (require.main === module) {
  try { checkDeployment(process.argv[2] && path.resolve(process.argv[2])); }
  catch (error) { console.error(error.message); process.exitCode = 1; }
}
module.exports = { checkDeployment };
