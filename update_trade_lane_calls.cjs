const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src', 'seo', 'commercial-pages.mjs');
let content = fs.readFileSync(filePath, 'utf8');

const replacements = [
  ["lane('china',", "lane('china-to-qatar',"],
  ["lane('india',", "lane('india-to-qatar',"],
  ["lane('uae',", "lane('uae-to-qatar',"],
  ["lane('turkey',", "lane('turkey-to-qatar',"],
  ["lane('bahrain',", "lane('bahrain-to-qatar',"]
];

for (const [oldStr, newStr] of replacements) {
  content = content.replace(oldStr, newStr);
}

fs.writeFileSync(filePath, content, 'utf8');
console.log('Successfully updated trade lane calls in commercial-pages.mjs');
