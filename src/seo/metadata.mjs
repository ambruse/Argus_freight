import { SITE, commercialPages, byPath } from './commercial-pages.mjs';
export const metadata = {
  '/': { title: 'Freight Forwarding Company in Qatar | Argus Shipping', description: 'Air, sea and road freight, warehousing and international logistics for businesses in Qatar. Discuss your cargo with Argus Shipping and request a freight quote.' },
  '/services': { title: 'Freight & Logistics Services in Qatar | Argus Shipping', description: 'Explore Argus Shipping air and sea freight, GCC road transport, warehousing, consolidation and specialized logistics services for businesses.' },
  '/about': { title: 'About Argus Shipping | Qatar Logistics Expertise', description: 'Learn about Argus Shipping W.L.L., its logistics network, experience and freight forwarding services supporting businesses in Qatar.' },
  '/why-us': { title: 'Why Choose Argus Shipping | Freight Forwarding Qatar', description: 'Discover Argus Shipping’s logistics network, cargo capabilities and customer support for freight movements in Qatar and across the GCC.' },
  '/team': { title: 'Our Team | Argus Shipping Qatar', description: 'Meet the people supporting Argus Shipping freight forwarding and logistics operations in Qatar.' },
  '/contact': { title: 'Contact Argus Shipping | Qatar Freight Quotes', description: 'Contact Argus Shipping in Doha about air freight, sea freight, road transport, warehousing or a tailored cargo quote.' },
  '/tracking': { title: 'Track a Shipment | Argus Shipping', description: 'Use Argus Shipping shipment tracking to check cargo progress and contact the logistics team about your consignment.' },
  '/chairman-message': { title: 'Chairman’s Message | Argus Shipping', description: 'Read the chairman’s perspective on Argus Shipping, its freight forwarding operations and service to clients.' },
  '/shipping/': { title: 'Shipping Routes to Qatar | Argus Shipping', description: 'Explore China, India, UAE, Turkey and Bahrain freight routes to Qatar. Discuss origin collection, consolidation and delivery with Argus Shipping.' },
  ...Object.fromEntries(commercialPages.map(page => [page.path, { title: page.title, description: page.description }])),
};
export function schemaFor(path) {
  const organization = { '@type': 'Organization', '@id': `${SITE}/#organization`, name: 'Argus Shipping W.L.L.', url: `${SITE}/`, logo: `${SITE}/images/logo.png`, telephone: '+974 44116544', email: 'info@argusshipping.co', address: { '@type': 'PostalAddress', postOfficeBoxNumber: '31861', addressLocality: 'Doha', addressCountry: 'QA' } };
  const graph = [organization, { '@type': 'WebSite', '@id': `${SITE}/#website`, url: `${SITE}/`, name: 'Argus Shipping', publisher: { '@id': organization['@id'] } }];
  graph.push({ '@type': 'WebPage', '@id': `${SITE}${path}#webpage`, url: `${SITE}${path}`, name: metadata[path].title, description: metadata[path].description, isPartOf: { '@id': `${SITE}/#website` } });
  const page = byPath[path];
  if (page || path === '/shipping/') {
    const crumbs = [{ name: 'Home', item: `${SITE}/` }];
    if (page) crumbs.push({ name: page.group === 'shipping' ? 'Shipping Routes' : 'Services', item: `${SITE}${page.group === 'shipping' ? '/shipping/' : '/services'}` });
    crumbs.push({ name: page?.label || 'Shipping Routes', item: `${SITE}${path}` });
    graph.push({ '@type': 'BreadcrumbList', '@id': `${SITE}${path}#breadcrumb`, itemListElement: crumbs.map((crumb, index) => ({ '@type': 'ListItem', position: index + 1, ...crumb })) });
    if (page) graph.push({ '@type': 'Service', '@id': `${SITE}${path}#service`, name: page.h1, url: `${SITE}${path}`, description: page.intro, provider: { '@id': organization['@id'] }, areaServed: { '@type': 'Country', name: 'Qatar' } });
  }
  return { '@context': 'https://schema.org', '@graph': graph };
}
