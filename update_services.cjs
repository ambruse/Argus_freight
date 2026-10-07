const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src', 'seo', 'commercial-pages.mjs');
let content = fs.readFileSync(filePath, 'utf8');

const replacements = [
  ["service('air-freight', 'Air Freight Services', 'Air Freight Services in Qatar', 'air freight Qatar',", "service('air-freight', 'Air Freight Services', 'International Air Freight Services', 'international air freight',"],
  ["service('sea-freight', 'Sea Freight Services', 'Sea Freight Services in Qatar', 'sea freight Qatar',", "service('sea-freight', 'Sea Freight Services', 'International Sea Freight Services', 'international sea freight',"],
  ["service('road-freight', 'Road Freight Services', 'Road Freight Services in Qatar & Across the GCC', 'road freight Qatar',", "service('road-freight', 'Road Freight Services', 'Road Freight & Cross-Border Transportation', 'road freight services',"],
  ["service('warehousing', 'Warehousing & Storage', 'Warehousing & Storage Services in Qatar', 'warehousing services Qatar',", "service('warehousing', 'Warehousing & Storage', 'Warehousing & Distribution Services', 'warehousing services',"],
  ["service('customs-clearance', 'Customs Clearance Services', 'Customs Clearance Services in Qatar', 'customs clearance Qatar',", "service('customs-clearance', 'Customs Clearance Services', 'Customs Clearance & Brokerage Support', 'customs clearance',"],
  ["service('3pl-logistics', '3PL Logistics Services', '3PL Logistics Services in Qatar', '3PL logistics Qatar',", "service('3pl-logistics', '3PL Logistics Services', '3PL & Contract Logistics Services', '3PL logistics',"],
  ["service('door-to-door-cargo', 'Door-to-Door Cargo', 'Door-to-Door Cargo Services in Qatar', 'door-to-door cargo Qatar',", "service('door-to-door-cargo', 'Door-to-Door Cargo', 'International Door-to-Door Freight Services', 'door-to-door freight',"],
  ["service('project-cargo', 'Project Cargo & Heavy Lift', 'Project Cargo & Heavy-Lift Logistics in Qatar', 'project cargo Qatar',", "service('project-cargo', 'Project Cargo & Heavy Lift', 'Project Cargo & Heavy-Lift Logistics', 'project cargo',"],
  ["service('vehicle-logistics', 'Vehicle Logistics & Car Shipping', 'Vehicle Logistics & Car Shipping Services in Qatar', 'vehicle logistics Qatar',", "service('vehicle-logistics', 'Vehicle Logistics & Car Shipping', 'Vehicle Logistics & Car Shipping Services', 'vehicle logistics',"]
];

for (const [oldStr, newStr] of replacements) {
  content = content.replace(oldStr, newStr);
}

fs.writeFileSync(filePath, content, 'utf8');
console.log('Successfully updated H1s and keywords in commercial-pages.mjs');
