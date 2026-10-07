const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src', 'seo', 'commercial-pages.mjs');
let content = fs.readFileSync(filePath, 'utf8');

const countryPagesStr = `
const country = (slug, label, h1, keyword, intro, sections, keywords, evidence) => ({
  path: \`/locations/\${slug}/\`, group: 'locations', label, h1, keyword, intro, sections,
  title: \`\${h1} | Argus Shipping\`, description: \`\${intro.split('. ')[0]}. Contact the Argus Shipping team in \${label} for tailored logistics support.\`,
  keywords: keywords.split('; '), related: ['air-freight', 'sea-freight', 'road-freight', 'warehousing', 'customs-clearance'], evidence, priority: 'P2',
});
export const countryPages = [
  country('qatar', 'Qatar', 'Freight Forwarding & Logistics Company in Qatar', 'freight forwarding Qatar',
    'Argus Shipping is a leading freight forwarding and logistics company in Qatar. The Doha headquarters coordinates international air, sea and road freight alongside local customs clearance and warehousing.', [
      s('Doha headquarters and local operations', 'The Qatar team manages import and export shipments through Hamad Port and Hamad International Airport. Discuss your cargo requirements with the local team to secure a tailored transport arrangement.'),
      s('Air, sea and GCC road freight', 'Argus connects Qatar businesses to global markets. We arrange FCL and LCL ocean freight, time-sensitive air cargo, and cross-border road freight to and from the UAE, Saudi Arabia and the wider GCC.'),
      s('Warehousing and customs clearance', 'Streamline your Qatar supply chain with integrated customs brokerage and commercial storage. We coordinate documentation and border formalities to ensure smooth cargo releases.'),
      s('Comprehensive logistics solutions', 'Beyond standard freight, Argus supports project cargo, heavy-lift transport, and third-party logistics (3PL) distribution for Qatar-based enterprises.')
    ], 'freight forwarding Qatar; freight forwarding company Qatar; freight forwarder Qatar; logistics company Qatar; logistics company in Qatar; shipping company Qatar; freight company Qatar; cargo company Qatar; logistics services Qatar; freight services Qatar; freight forwarder Doha; logistics company Doha', 'App.jsx: Doha HQ'),
  country('uae', 'UAE', 'Freight Forwarding & Logistics Services in the UAE', 'freight forwarding UAE',
    'Argus Shipping provides comprehensive freight forwarding and logistics services in the UAE. The Dubai hub connects international trade lanes with regional GCC distribution networks.', [
      s('Dubai hub and regional distribution', 'Located in Al Qusais Industrial Area, the UAE facility supports cargo consolidation, warehousing, and cross-border transit. We manage shipments moving through Jebel Ali Port and Dubai airports.'),
      s('Cross-border GCC road freight', 'The UAE serves as a critical transit point for Middle East logistics. Argus coordinates reliable FTL and LTL road freight between the UAE, Qatar, Saudi Arabia and Oman.'),
      s('International air and sea cargo', 'Whether importing goods into the UAE or exporting to global markets, our team arranges competitive sea freight and urgent air cargo solutions tailored to your schedule.'),
      s('Local customs and warehousing', 'We support UAE businesses with dedicated commercial storage, order fulfillment, and customs clearance coordination for both import and transit shipments.')
    ], 'freight forwarding UAE; freight forwarding company UAE; logistics company UAE; logistics services UAE; freight forwarder UAE; shipping company UAE; cargo services UAE; international freight UAE; logistics company Dubai; freight forwarding Dubai; freight forwarder Dubai', 'App.jsx: Dubai Hub'),
  country('india', 'India', 'Freight Forwarding & Logistics Services in India', 'freight forwarding India',
    'Argus Shipping offers dedicated freight forwarding and logistics services in India. We coordinate origin handling, consolidation, and international transport for Indian exporters.', [
      s('Local consolidation and handling', 'With contacts in Tuticorin and Nilambur, alongside consolidation networks in Mumbai and Bangalore, Argus supports cargo collection across key Indian manufacturing regions.'),
      s('Sea freight and container shipping', 'We arrange FCL and LCL container shipping from major Indian ports to the GCC and global destinations. Discuss your cargo volume for optimal routing.'),
      s('Air freight and urgent shipments', 'For time-sensitive exports, our Indian logistics team coordinates direct air freight options, managing airport handling and shipment documentation.'),
      s('Door-to-door coordination', 'Combine local Indian supplier collection with international freight and final destination delivery. We manage the entire logistics chain for a seamless experience.')
    ], 'freight forwarding India; logistics services India; international freight India; cargo forwarding India', 'App.jsx: India offices'),
  country('china', 'China', 'Freight Forwarding & Logistics Services in China', 'freight forwarding China',
    'Argus Shipping provides specialized freight forwarding and logistics services in China. Our Guangzhou and Yiwu hubs support supplier coordination and international export consolidation.', [
      s('Guangzhou and Yiwu hubs', 'Our established facilities in Guangzhou and Yiwu provide direct support for Chinese exporters and international buyers sourcing products from the region.'),
      s('Cargo consolidation and warehousing', 'We combine goods from multiple Chinese suppliers into efficient LCL or FCL shipments. Our team manages the receiving, storage, and container loading process.'),
      s('Air and ocean export freight', 'Argus connects Chinese manufacturing hubs to the Middle East and beyond. We negotiate competitive ocean freight and rapid air cargo schedules.'),
      s('Export documentation and clearance', 'Navigating Chinese export regulations requires local expertise. We coordinate the necessary supplier documentation and customs formalities prior to dispatch.')
    ], 'freight forwarding China; cargo consolidation China; sourcing logistics; export freight China; warehouse consolidation; Guangzhou logistics; Yiwu logistics', 'App.jsx: China Hubs'),
  country('turkey', 'Turkey', 'Freight Forwarding & Logistics Services in Turkey', 'freight forwarding Turkey',
    'Argus Shipping coordinates freight forwarding and logistics services in Turkey. We manage European and Middle Eastern trade lanes through our Istanbul consolidation network.', [
      s('Istanbul consolidation network', 'Our Istanbul operations support cargo collection from Turkish suppliers, preparing consignments for onward international transport.'),
      s('Air and sea freight solutions', 'We arrange reliable sea freight from Turkish ports and fast air freight from Istanbul airports, connecting Turkey with the GCC and global markets.'),
      s('Cross-border and transit logistics', 'Turkey is a vital bridge between Europe and the Middle East. Argus supports complex transit shipments and cross-border freight movements.'),
      s('Integrated supply chain support', 'From factory collection in Turkey to final delivery overseas, we provide door-to-door logistics including customs support and warehousing.')
    ], 'freight forwarding Turkey; logistics services Turkey; international freight Turkey; Istanbul logistics', 'App.jsx: Istanbul network'),
  country('bahrain', 'Bahrain', 'Freight Forwarding & Logistics Services in Bahrain', 'freight forwarding Bahrain',
    'Argus Shipping offers reliable freight forwarding and logistics services in Bahrain. Our Busaiteen office supports local businesses with international cargo and GCC road freight.', [
      s('Local Bahrain operations', 'Located in Busaiteen, our Bahrain team provides dedicated support for local importers and exporters, coordinating all aspects of the supply chain.'),
      s('GCC road freight connectivity', 'We arrange seamless cross-border road transport connecting Bahrain with Saudi Arabia, the UAE, Qatar, and the wider GCC network.'),
      s('International sea and air cargo', 'Beyond regional transport, Argus manages international sea freight and air cargo shipments entering or leaving Bahrain.'),
      s('Customs clearance and delivery', 'We ensure compliance with local regulations, providing customs clearance support and coordinating final delivery to your facility.')
    ], 'freight forwarding Bahrain; logistics services Bahrain; international freight Bahrain; shipping company Bahrain', 'App.jsx: Bahrain office')
];
`;

// Insert the new countryPages block right before commercialPages
content = content.replace('export const commercialPages = [', countryPagesStr + '\nexport const commercialPages = [...countryPages, ');

fs.writeFileSync(filePath, content, 'utf8');
console.log('Successfully injected countryPages into commercial-pages.mjs');
