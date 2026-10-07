import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createServer } from 'vite';
import { metadata, schemaFor } from '../src/seo/metadata.mjs';
import { SITE } from '../src/seo/commercial-pages.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const out = path.join(root, 'dist');
const template = fs.readFileSync(path.join(out, 'index.html'), 'utf8');
const escape = value => value.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const vite = await createServer({ root, server: { middlewareMode: true, watch: null }, appType: 'custom' });
try {
  const { render } = await vite.ssrLoadModule('/src/entry-server.jsx');
  for (const [route, page] of Object.entries(metadata)) {
    let html = template.replace(/<title>.*?<\/title>/s, `<title>${escape(page.title)}</title>`);
    for (const [key, value] of Object.entries({ description: page.description, 'og:title': page.title, 'og:description': page.description, 'og:url': SITE + route, 'twitter:title': page.title, 'twitter:description': page.description, 'twitter:url': SITE + route })) {
      const pattern = new RegExp(`(<meta\\s+(?:name|property)="${key}"\\s+content=")[^"]*(")`);
      html = html.replace(pattern, (_, before, after) => before + escape(value) + after);
    }
    html = html.replace(/(<link rel="canonical" href=")[^"]*(")/, `$1${SITE}${route}$2`)
      .replace(/<script type="application\/ld\+json">[\s\S]*?<\/script>/g, '')
      .replace('</head>', `<script type="application/ld+json">${JSON.stringify(schemaFor(route)).replace(/</g, '\\u003c')}</script></head>`)
      .replace('<body>', '<body class="light-theme">')
      .replace('<div id="root"></div>', () => `<div id="root">${render(route)}</div>`);
    const file = route === '/' ? 'index.html' : route.endsWith('/') ? `${route.slice(1)}index.html` : `${route.slice(1)}.html`;
    fs.mkdirSync(path.dirname(path.join(out, file)), { recursive: true });
    fs.writeFileSync(path.join(out, file), html);
  }
  fs.writeFileSync(path.join(out, 'sitemap.xml'), `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${Object.keys(metadata).map(route => `  <url><loc>${SITE}${route}</loc></url>`).join('\n')}\n</urlset>\n`);
  fs.writeFileSync(path.join(out, 'robots.txt'), `User-agent: *\nAllow: /\nDisallow: /api/\n\nSitemap: ${SITE}/sitemap.xml\n`);
  fs.copyFileSync(path.join(root, '.htaccess'), path.join(out, '.htaccess'));
  console.log(`Prerendered ${Object.keys(metadata).length} public pages with content, metadata, schema and sitemap.`);
} finally { await vite.close(); }
