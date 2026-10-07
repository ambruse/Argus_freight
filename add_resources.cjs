const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src', 'seo', 'commercial-pages.mjs');
let content = fs.readFileSync(filePath, 'utf8');

const resourcePagesStr = `
const resource = (slug, label, h1, keyword, intro, sections, keywords) => ({
  path: \`/resources/\${slug}/\`, group: 'resources', label, h1, keyword, intro, sections,
  title: \`\${h1} | Argus Shipping\`, description: \`\${intro.split('. ')[0]}. Access logistics tools and guides from Argus Shipping.\`,
  keywords: keywords.split('; '), related: ['air-freight', 'sea-freight', 'road-freight', 'customs-clearance'], priority: 'P5',
});
export const resourcePages = [
  resource('cbm-calculator', 'CBM Calculator', 'CBM Calculator & Freight Volume Tool', 'cbm calculator',
    'Calculate your cargo volume in Cubic Meters (CBM) for ocean and air freight shipments. Accurate CBM calculations are essential for receiving precise freight forwarding quotes and planning container space.', [
      s('How to calculate CBM', 'CBM is calculated by multiplying the length, width, and height of your cargo in meters (L x W x H = CBM). For multiple packages of the same size, multiply the single item CBM by the total carton count.'),
      s('CBM in Ocean Freight (LCL & FCL)', 'In Less than Container Load (LCL) shipping, freight rates are often based directly on the CBM of your cargo. For Full Container Load (FCL), knowing your total CBM dictates whether you need a 20ft, 40ft, or 40ft High Cube container.'),
      s('CBM to kg (Volumetric Weight)', 'Freight forwarders charge based on whichever is greater: the actual weight or the volumetric weight. Standard ocean freight typically equates 1 CBM to 1,000 kg, though this can vary by trade lane and carrier.'),
      s('Plan your shipment', 'Use your calculated CBM to request a tailored freight quote from Argus Shipping. Our team will help you determine the most cost-effective routing and consolidation strategy for your cargo volume.')
    ], 'cbm calculator; cubic meter calculator; freight volume calculator; lcl volume calculator; cargo cbm calculator'),
  resource('chargeable-weight-calculator', 'Chargeable Weight', 'Chargeable Weight Calculator Guide', 'chargeable weight calculator',
    'Understand how airlines and shipping lines determine the chargeable weight of your cargo. Transport costs are billed on the actual gross weight or the volumetric (dimensional) weight, whichever is higher.', [
      s('Actual Weight vs Volumetric Weight', 'Actual weight is the physical weight of your cargo on a scale. Volumetric weight is a calculation based on the dimensions of the cargo, reflecting the space it occupies in an aircraft or shipping container.'),
      s('Air Freight Volumetric Calculation', 'For international air freight, the standard dimensional factor is 167 kg per CBM (or length x width x height in cm / 6000). If your cargo is light but bulky, you will be billed on this volumetric weight.'),
      s('Road Freight Volumetric Calculation', 'Cross-border GCC road freight dimensional factors can vary depending on the carrier and truck type, but often range between 333 kg per CBM. Always verify the divisor with your logistics provider before booking.'),
      s('Optimize your cargo packing', 'To minimize chargeable weight, ensure your cargo is packed as densely and efficiently as possible. Avoid excessive empty space in cartons and optimize pallet stacking to reduce your final freight bill.')
    ], 'chargeable weight calculator; dimensional weight calculator; air freight volumetric weight; freight weight calculation'),
  resource('incoterms-guide', 'Incoterms Guide', 'International Incoterms 2020 Guide', 'incoterms guide',
    'Navigate global trade with our comprehensive guide to ICC Incoterms 2020. Understanding Incoterms is critical for defining the responsibilities, risks, and costs between buyers and sellers in international transactions.', [
      s('EXW (Ex Works)', 'The seller makes the goods available at their premises. The buyer assumes all risks and costs from the seller’s door to the final destination, including export clearance.'),
      s('FOB (Free on Board)', 'The seller is responsible for delivering the goods loaded on board the vessel at the named port of shipment. Risk transfers to the buyer once the goods are safely loaded on the ship.'),
      s('CIF (Cost, Insurance, and Freight)', 'The seller covers the costs, insurance, and freight to bring the goods to the named port of destination. However, risk transfers to the buyer as soon as the goods are loaded on the vessel at origin.'),
      s('DDP (Delivered Duty Paid)', 'The seller bears all costs and risks involved in bringing the goods to the destination, including paying duties, taxes, and customs clearance fees. It represents the maximum obligation for the seller.')
    ], 'incoterms 2020 guide; incoterms explained; EXW vs FOB; CIF vs DDP; international trade terms; shipping incoterms'),
  resource('container-size-guide', 'Container Sizes', 'Shipping Container Dimensions & Size Guide', 'shipping container sizes',
    'Choose the right equipment for your ocean freight with our comprehensive shipping container size guide. Review internal dimensions, payload capacities, and door sizes for standard and specialized equipment.', [
      s('20ft Standard Container', 'Ideal for dense, heavy cargo like machinery, tiles, or raw materials. Typically holds around 33 CBM and supports a maximum payload of approximately 28,000 kg depending on shipping line limits.'),
      s('40ft Standard Container', 'Designed for larger volume cargo that is relatively light, such as furniture, clothing, or electronics. Provides around 67 CBM of space with a similar maximum payload weight to a 20ft container.'),
      s('40ft High Cube (HC) Container', 'A foot taller than a standard 40ft container, offering extra volume (approx 76 CBM) without increasing the floor footprint. Excellent for bulky, lightweight goods and tall items.'),
      s('Specialized Equipment (Open Top & Flat Rack)', 'For Out of Gauge (OOG) project cargo that cannot fit through standard container doors, Open Top containers allow crane loading, while Flat Racks are used for oversized heavy-lift machinery.')
    ], 'shipping container sizes; 20ft container dimensions; 40ft container dimensions; high cube container volume; flat rack dimensions; freight container capacity')
];
`;

// Insert the new resourcePages block right before commercialPages
content = content.replace('export const commercialPages = [', resourcePagesStr + '\nexport const commercialPages = [...resourcePages, ');

fs.writeFileSync(filePath, content, 'utf8');
console.log('Successfully injected resourcePages into commercial-pages.mjs');
