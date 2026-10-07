const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src', 'seo', 'commercial-pages.mjs');
let content = fs.readFileSync(filePath, 'utf8');

const newTradeLaneStr = `
  lane('china-to-uae', 'China to UAE', 'Shipping from China to UAE', 'shipping from China to UAE',
    'Argus Shipping coordinates China-to-UAE freight through its Guangzhou, Yiwu, and Dubai network. Businesses sourcing from multiple Chinese suppliers can discuss collection, consolidation, and delivery directly to the UAE.', [
      s('Guangzhou and Yiwu supplier coordination', 'We manage direct cargo collection from suppliers across China. Our hubs in Guangzhou and Yiwu provide the perfect consolidation points before dispatch to Jebel Ali Port or Dubai International Airport.'),
      s('Air freight and ocean freight to the UAE', 'Compare FCL, LCL, and air cargo options. Air freight provides rapid delivery for urgent electronics or fashion, while our sea freight consolidation offers cost-effective transport for heavy manufacturing goods.'),
      s('Consolidation and Dubai warehousing', 'If you source from several suppliers, we consolidate your cargo in China and de-consolidate it at our Dubai hub, holding inventory until your local distribution network is ready.'),
      s('UAE customs clearance and delivery', 'We handle the export documentation in China and the import customs clearance in the UAE. Request a door-to-door quotation to cover origin collection, freight, and final delivery to any emirate.')
    ], 'China to UAE shipping; freight from China to UAE; China to UAE freight; China to Dubai cargo; sea freight China to UAE; air freight China to Dubai; Guangzhou to Dubai cargo', 'App.jsx: Guangzhou and Dubai addresses'),
];
`;

content = content.replace(/\];\s*export const commercialPages =/g, `, ${newTradeLaneStr.replace('];\n', '')}\n];\nexport const commercialPages =`);

fs.writeFileSync(filePath, content, 'utf8');
console.log('Successfully injected china-to-uae trade lane.');
