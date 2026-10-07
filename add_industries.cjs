const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src', 'seo', 'commercial-pages.mjs');
let content = fs.readFileSync(filePath, 'utf8');

const industryPagesStr = `
const industry = (slug, label, h1, keyword, intro, sections, keywords) => ({
  path: \`/industries/\${slug}-logistics/\`, group: 'industries', label, h1, keyword, intro, sections,
  title: \`\${h1} | Argus Shipping\`, description: \`\${intro.split('. ')[0]}. Discuss your industry-specific supply chain with Argus Shipping.\`,
  keywords: keywords.split('; '), related: ['project-cargo', 'warehousing', 'door-to-door-cargo', 'customs-clearance'], priority: 'P4',
});
export const industryPages = [
  industry('construction', 'Construction Logistics', 'Construction Logistics Solutions', 'construction logistics',
    'Argus Shipping provides specialized logistics for the construction and infrastructure sector. We coordinate heavy-lift equipment, raw materials, and out-of-gauge project cargo.', [
      s('Project cargo and heavy-lift transport', 'Moving construction machinery and oversized building materials requires precise engineering and specialized equipment. We handle OOG (Out of Gauge) shipments via flat racks, open-top containers, and dedicated heavy-lift vessels.'),
      s('Site delivery scheduling', 'Construction sites operate on strict timelines. We manage multi-modal deliveries, synchronizing ocean freight arrivals with road transport to ensure materials arrive exactly when required by the project managers.'),
      s('Customs and regulatory compliance', 'Importing industrial machinery involves complex tariff classifications. Our clearance team ensures documentation is processed rapidly to prevent costly site delays.'),
      s('Temporary warehousing', 'When cargo arrives before the site is ready, we offer secure staging and warehousing solutions, deploying inventory incrementally to match the construction phase.')
    ], 'construction logistics; construction supply chain; building materials transport; heavy equipment shipping; infrastructure logistics'),
  industry('oil-gas', 'Oil & Gas Logistics', 'Oil & Gas Logistics Solutions', 'oil and gas logistics',
    'Argus Shipping delivers mission-critical logistics for the energy sector. We support exploration, drilling, and production sites with rapid and secure supply chain solutions.', [
      s('Time-critical equipment transport', 'Downtime in the energy sector is expensive. We coordinate urgent air freight and dedicated charter services to deliver replacement parts and drilling equipment rapidly to operational sites.'),
      s('Hazardous materials (DG) handling', 'Moving chemicals and specialized equipment requires strict compliance with Dangerous Goods regulations. Our team is trained to manage the documentation and handling of sensitive energy cargo.'),
      s('Remote site delivery', 'Oil and gas operations are often located in challenging environments. We plan end-to-end multi-modal routes, including specialized off-road freight transport, to reach remote facilities.'),
      s('Offshore and marine logistics', 'We coordinate supply vessels and offshore support, managing the flow of materials from the port directly to platforms and marine operations.')
    ], 'oil and gas logistics; energy supply chain; rig moving logistics; dangerous goods transport; offshore logistics'),
  industry('automotive', 'Automotive Logistics', 'Automotive Logistics Solutions', 'automotive logistics',
    'Argus Shipping coordinates supply chains for the automotive industry. We manage finished vehicle logistics alongside aftermarket parts distribution.', [
      s('Finished vehicle logistics (FVL)', 'We arrange secure transport for private and commercial vehicles using specialized Ro-Ro (Roll-on/Roll-off) vessels, car carriers, and containerized transport for high-value automobiles.'),
      s('Spare parts and aftermarket distribution', 'Automotive dealers require reliable parts availability. We manage the import and warehousing of aftermarket components, ensuring rapid distribution to service centers.'),
      s('Production supply chains', 'For automotive manufacturing and assembly, we coordinate just-in-time (JIT) deliveries of raw materials and components to keep production lines moving without interruption.'),
      s('Customs for vehicles and components', 'Importing vehicles involves strict local regulations. We handle homologation documentation and customs clearance for both finished cars and replacement parts.')
    ], 'automotive logistics; car shipping; finished vehicle logistics; auto parts supply chain; Ro-Ro shipping'),
  industry('healthcare', 'Healthcare & Medical Logistics', 'Healthcare & Medical Logistics Solutions', 'healthcare logistics',
    'Argus Shipping handles temperature-controlled and time-sensitive logistics for the healthcare and pharmaceutical sectors, ensuring absolute product integrity.', [
      s('Temperature-controlled supply chains', 'Pharmaceuticals and biologics require strict temperature adherence. We coordinate active and passive cold-chain solutions, utilizing refrigerated (reefer) containers and specialized air freight packaging.'),
      s('Medical equipment transport', 'MRI machines, scanners, and sensitive laboratory equipment require specialized, shock-proof handling. We manage the secure door-to-door transport of high-value medical assets.'),
      s('Regulatory compliance and clearance', 'Medical imports face stringent regulatory scrutiny. Our team coordinates with ministries of health and local customs to expedite the clearance of life-saving supplies.'),
      s('Urgent medical air freight', 'When time is of the essence, we arrange priority air cargo for urgent medical supplies, ensuring rapid delivery from manufacturers to hospitals and distributors.')
    ], 'healthcare logistics; pharmaceutical logistics; medical equipment transport; cold chain logistics; temperature controlled shipping'),
  industry('retail', 'Retail & Distribution Logistics', 'Retail & Distribution Logistics Solutions', 'retail logistics',
    'Argus Shipping optimizes supply chains for the retail and FMCG sectors. We manage the flow of consumer goods from global manufacturing hubs to local distribution centers.', [
      s('FMCG and consumer goods distribution', 'Fast-moving consumer goods require high-volume, cost-effective transport. We coordinate full container loads (FCL) from major sourcing markets directly to regional retail warehouses.'),
      s('Omnichannel fulfillment and 3PL', 'Beyond freight, we support retailers with outsourced 3PL services. We manage inventory, pick-and-pack operations, and distribution to brick-and-mortar stores or direct to consumers.'),
      s('Seasonal peak management', 'Retail volumes fluctuate heavily during holidays and sales events. We offer scalable warehousing and flexible shipping schedules to manage inventory spikes effectively.'),
      s('Garments and electronics', 'We provide specialized handling for high-value electronics and Garments on Hangers (GOH) shipments, ensuring retail products arrive shelf-ready and secure.')
    ], 'retail logistics; FMCG supply chain; omnichannel fulfillment; retail distribution; consumer goods transport'),
  industry('industrial', 'Industrial & Project Logistics', 'Industrial & Project Logistics Solutions', 'industrial logistics',
    'Argus Shipping designs bespoke logistics for industrial manufacturing and complex engineering projects, managing oversized cargo and massive supply networks.', [
      s('Manufacturing supply chains', 'We keep factories running by coordinating the import of raw materials and the export of finished industrial products, balancing cost and speed across sea and air freight.'),
      s('Plant relocation and engineering logistics', 'Moving entire production lines or factories requires meticulous planning. We manage the sequential transport of heavy machinery, ensuring parts arrive in the correct order for reassembly.'),
      s('Oversized and heavy-lift handling', 'Industrial projects often involve components too large for standard containers. We charter breakbulk vessels and coordinate specialized road transport for colossal cargo.'),
      s('End-to-end project management', 'Our project team serves as a single point of contact, orchestrating multiple suppliers, carriers, and customs authorities to execute massive industrial movements flawlessly.')
    ], 'industrial logistics; project logistics; plant relocation transport; manufacturing supply chain; heavy lift engineering')
];
`;

// Insert the new industryPages block right before commercialPages
content = content.replace('export const commercialPages = [', industryPagesStr + '\nexport const commercialPages = [...industryPages, ');

fs.writeFileSync(filePath, content, 'utf8');
console.log('Successfully injected industryPages into commercial-pages.mjs');
