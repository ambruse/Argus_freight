import { SITE, commercialPages, byPath } from './commercial-pages.mjs';
export const metadata = {
  '/': { title: 'International Freight Forwarding & Logistics | Argus Shipping', description: 'Global air, sea and road freight, warehousing and international logistics. Argus Shipping operates an international freight network. Request a freight quote.' },
  '/services': { title: 'International Freight & Logistics Services | Argus Shipping', description: 'Explore Argus Shipping air and sea freight, GCC road transport, warehousing, consolidation and specialized logistics services for businesses.' },
  '/about': { title: 'About Argus Shipping | Qatar Logistics Expertise', description: 'Learn about Argus Shipping, its logistics network, experience and freight forwarding services supporting businesses in Qatar.' },
  '/why-us': { title: 'Why Choose Argus Shipping | Freight Forwarding Qatar', description: 'Discover Argus Shipping’s logistics network, cargo capabilities and customer support for freight movements in Qatar and across the GCC.' },
  '/team': { title: 'Our Team | Argus Shipping Qatar', description: 'Meet the people supporting Argus Shipping freight forwarding and logistics operations in Qatar.' },
  '/contact': { title: 'Contact Argus Shipping | Qatar Freight Quotes', description: 'Contact Argus Shipping in Doha about air freight, sea freight, road transport, warehousing or a tailored cargo quote.' },
  '/tracking': { title: 'Track a Shipment | Argus Shipping', description: 'Use Argus Shipping shipment tracking to check cargo progress and contact the logistics team about your consignment.' },
  '/chairman-message': { title: 'Chairman’s Message | Argus Shipping', description: 'Read the chairman’s perspective on Argus Shipping, its freight forwarding operations and service to clients.' },
  '/trade-lanes/': { title: 'International Trade Lanes | Argus Shipping', description: 'Explore China, India, UAE, Turkey and Bahrain freight routes to Qatar. Discuss origin collection, consolidation and delivery with Argus Shipping.' },
  ...Object.fromEntries(commercialPages.map(page => [page.path, { title: page.title, description: page.description }])),
};
export function schemaFor(path) {
  const organization = { '@type': 'Organization', '@id': `${SITE}/#organization`, name: 'Argus Shipping', url: `${SITE}/`, logo: `${SITE}/images/logo.png`, telephone: '+974 44116544', email: 'info@argusshipping.co', address: { '@type': 'PostalAddress', postOfficeBoxNumber: '31861', addressLocality: 'Doha', addressCountry: 'QA' } };
  const graph = [organization, { '@type': 'WebSite', '@id': `${SITE}/#website`, url: `${SITE}/`, name: 'Argus Shipping', publisher: { '@id': organization['@id'] } }];
  graph.push({ '@type': 'WebPage', '@id': `${SITE}${path}#webpage`, url: `${SITE}${path}`, name: metadata[path].title, description: metadata[path].description, isPartOf: { '@id': `${SITE}/#website` } });
  const page = byPath[path];
  if (page || path === '/trade-lanes/') {
    const crumbs = [{ name: 'Home', item: `${SITE}/` }];
    if (page) {
      const groupName = page.group === 'trade-lanes' ? 'Trade Lanes' : page.group === 'locations' ? 'Locations' : page.group === 'industries' ? 'Industries' : page.group === 'resources' ? 'Resources' : 'Services';
      const groupPath = page.group === 'trade-lanes' ? '/trade-lanes/' : page.group === 'locations' ? '/locations/' : page.group === 'industries' ? '/industries/' : page.group === 'resources' ? '/resources/' : '/services';
      crumbs.push({ name: groupName, item: `${SITE}${groupPath}` });
    }
    crumbs.push({ name: page?.label || 'Trade Lanes', item: `${SITE}${path}` });
    graph.push({ '@type': 'BreadcrumbList', '@id': `${SITE}${path}#breadcrumb`, itemListElement: crumbs.map((crumb, index) => ({ '@type': 'ListItem', position: index + 1, ...crumb })) });
    if (page) {
      if (page.group === 'locations') {
        graph.push({ '@type': 'LocalBusiness', '@id': `${SITE}${path}#localbusiness`, name: `Argus Shipping ${page.label}`, url: `${SITE}${path}`, description: page.intro, parentOrganization: { '@id': organization['@id'] } });
      } else if (page.group === 'resources') {
        graph.push({ '@type': 'Article', '@id': `${SITE}${path}#article`, headline: page.h1, description: page.intro, author: { '@id': organization['@id'] }, publisher: { '@id': organization['@id'] }, mainEntityOfPage: { '@id': `${SITE}${path}#webpage` } });
      } else {
        graph.push({ '@type': 'Service', '@id': `${SITE}${path}#service`, name: page.h1, url: `${SITE}${path}`, description: page.intro, provider: { '@id': organization['@id'] } });
      }
    }
  }
  return { '@context': 'https://schema.org', '@graph': graph };
}
