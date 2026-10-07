const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src', 'seo', 'commercial-pages.mjs');
let content = fs.readFileSync(filePath, 'utf8');

const insightsStr = `
const insight = (slug, label, h1, keyword, intro, sections, keywords) => ({
  path: \`/insights/\${slug}/\`, group: 'insights', label, h1, keyword, intro, sections,
  title: \`\${h1} | Argus Shipping Insights\`, description: \`\${intro.split('. ')[0]}.\`,
  keywords: keywords.split('; '), related: ['air-freight', 'sea-freight', 'road-freight'], priority: 'P6',
});
export const insightPages = [
  insight('gcc-freight-report', 'GCC Freight Report', 'State of GCC Logistics & Freight Report', 'gcc logistics report',
    'Argus Shipping’s annual original research report on the state of cross-border logistics, supply chain resilience, and freight forwarder performance across the GCC.', [
      s('Key Findings & Market Trends', 'The report analyzes over 10,000 regional shipments to identify emerging bottlenecks and optimization opportunities. We found that digitizing border documentation reduced transit times between the UAE and Qatar by an average of 14%.'),
      s('Air vs Sea Freight Shifts', 'In response to volatile ocean freight rates, GCC businesses increased their reliance on regional air cargo for high-value FMCG and healthcare products by 22% year-over-year.'),
      s('The Rise of 3PL Outsourcing', 'With e-commerce expanding rapidly across the Middle East, 68% of surveyed retailers have transitioned to outsourced 3PL distribution networks to handle peak seasonal demand and final-mile delivery.'),
      s('Download the Full Report', 'Argus Shipping provides this thought leadership and original research to our enterprise partners. Contact our media and PR team to request the full PDF report and dataset for your industry publication.')
    ], 'gcc logistics report; middle east freight trends; logistics market research; argus shipping thought leadership; supply chain report')
];
`;

// Insert the new insights block right before commercialPages
content = content.replace('export const commercialPages = [', insightsStr + '\nexport const commercialPages = [...insightPages, ');

fs.writeFileSync(filePath, content, 'utf8');
console.log('Successfully injected insightPages into commercial-pages.mjs');
