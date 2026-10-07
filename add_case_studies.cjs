const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src', 'seo', 'commercial-pages.mjs');
let content = fs.readFileSync(filePath, 'utf8');

const caseStudiesStr = `
const caseStudy = (slug, label, h1, keyword, intro, sections, keywords) => ({
  path: \`/case-studies/\${slug}/\`, group: 'case-studies', label, h1, keyword, intro, sections,
  title: \`\${h1} | Argus Shipping Case Studies\`, description: \`\${intro.split('. ')[0]}.\`,
  keywords: keywords.split('; '), related: ['project-cargo', 'air-freight', 'sea-freight', 'warehousing'], priority: 'P5',
});
export const caseStudies = [
  caseStudy('heavy-lift-qatar', 'Heavy-Lift Project Qatar', 'Oversized Machinery Transport from China to Qatar', 'heavy lift case study',
    'Argus Shipping successfully coordinated the end-to-end transport of out-of-gauge construction machinery from Guangzhou, China, to a major infrastructure site in Doha, Qatar.', [
      s('Client Challenge', 'The client required the delivery of three 45-ton excavators within a strict 30-day window to avoid construction delays at the Doha site. The oversized cargo exceeded standard container dimensions.'),
      s('Argus Solution', 'Our project cargo team in China arranged flat rack containers and specialized heavy-lift cranes for origin loading. We secured priority vessel space on a direct Ro-Ro routing to Hamad Port.'),
      s('Execution & Clearance', 'Upon arrival at Hamad Port, our local customs brokers expedited the clearance process using pre-filed documentation, avoiding port storage fees. We coordinated police escorts and low-bed trailers for the final road transport.'),
      s('Outcome', 'The machinery was safely delivered to the Doha site 3 days ahead of the deadline, ensuring the infrastructure project remained on schedule and under budget.')
    ], 'heavy lift case study; project cargo logistics; flat rack shipping; china to qatar logistics case study'),
  caseStudy('pharma-cold-chain-uae', 'Pharma Cold Chain UAE', 'Temperature-Controlled Pharma Delivery to Dubai', 'cold chain case study',
    'Argus Shipping executed a time-critical, temperature-controlled air freight movement of sensitive pharmaceuticals from Europe to Dubai, UAE.', [
      s('Client Challenge', 'A global pharmaceutical distributor needed to transport 50 pallets of vaccines requiring strict +2°C to +8°C temperature control. Any temperature deviation would result in total cargo loss.'),
      s('Argus Solution', 'We deployed active temperature-controlled air cargo containers (Envirotainers) and coordinated a direct priority air freight routing from Frankfurt to Dubai International Airport.'),
      s('Execution & Clearance', 'Our Dubai hub team arranged tarmac-side collection in refrigerated trucks immediately upon landing. The shipment was rapidly cleared through Dubai Customs via the Ministry of Health fast-track process.'),
      s('Outcome', '100% of the vaccines arrived at the regional distribution center with zero temperature excursions. The client secured a flawless audit report for the supply chain movement.')
    ], 'cold chain logistics case study; pharmaceutical logistics uae; temperature controlled air freight; dubai medical logistics'),
  caseStudy('fmcg-distribution-india', 'FMCG Retail Distribution India', 'FMCG Consolidation and 3PL Distribution in India', 'fmcg logistics case study',
    'Argus Shipping streamlined the supply chain for a major retail brand, transitioning them from fragmented imports to a centralized consolidation and 3PL distribution model in India.', [
      s('Client Challenge', 'The retailer was importing LCL shipments from multiple Asian suppliers directly to individual stores, resulting in high freight costs, delayed clearances, and stockouts.'),
      s('Argus Solution', 'We implemented a Buyer’s Consolidation model. Suppliers delivered goods to our consolidation hubs in China and Southeast Asia, where we loaded dedicated FCL containers bound for Mumbai port.'),
      s('Execution & Clearance', 'Upon arrival in India, we moved the containers to our bonded warehouse facility. Argus took over the 3PL operations, managing inventory, pick-and-pack, and domestic road freight distribution to the retail stores.'),
      s('Outcome', 'The client reduced their international freight spend by 22%, eliminated stockouts, and improved their store replenishment cycle time by 40%.')
    ], 'fmcg supply chain case study; buyers consolidation; 3pl distribution india; retail logistics optimization')
];
`;

// Insert the new caseStudies block right before commercialPages
content = content.replace('export const commercialPages = [', caseStudiesStr + '\nexport const commercialPages = [...caseStudies, ');

fs.writeFileSync(filePath, content, 'utf8');
console.log('Successfully injected caseStudies into commercial-pages.mjs');
