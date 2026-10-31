// Existing office numbers from the site's Global Offices directory.
export const locationContacts = {
  // Business names/addresses below match the visible footer directory (App.jsx).
  qatar: [{ office: 'Doha', phone: '+974 44116544', businessName: 'Argus Shipping', address: { postOfficeBoxNumber: '31861', addressLocality: 'Doha', addressCountry: 'QA' } }],
  uae: [{ office: 'Dubai', phone: '+971 564337699', businessName: 'ARGUS SHIPPING LLC', address: { streetAddress: 'Al Qusais industrial area 4, Warehouse no4', addressLocality: 'Dubai', addressCountry: 'AE' } }],
  china: [
    { office: 'Guangzhou', phone: '+86 13719125564' },
    { office: 'Yiwu', phone: '+86 579 85299672' },
  ],
  india: [
    { office: 'Tuticorin', phone: '+91 9095054575' },
    { office: 'Nilambur', phone: '+91 9207062636' },
  ],
  bahrain: [{ office: 'Busaiteen', phone: '+973 13641234', businessName: 'Argus shipping Bahrain', address: { streetAddress: 'Office 21, Building 2464, Road 2663, Block 226', addressLocality: 'Busaiteen', addressCountry: 'BH' } }],
  // No local Turkey phone number is listed in the office directory yet.
  turkey: [],
};

export const phoneHref = phone => `tel:${phone.replace(/\s/g, '')}`;
