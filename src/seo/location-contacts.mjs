// Existing office numbers from the site's Global Offices directory.
export const locationContacts = {
  qatar: [{ office: 'Doha', phone: '+974 44116544' }],
  uae: [{ office: 'Dubai', phone: '+971 564337699' }],
  china: [
    { office: 'Guangzhou', phone: '+86 13719125564' },
    { office: 'Yiwu', phone: '+86 579 85299672' },
  ],
  india: [
    { office: 'Tuticorin', phone: '+91 9095054575' },
    { office: 'Nilambur', phone: '+91 9207062636' },
  ],
  bahrain: [{ office: 'Busaiteen', phone: '+973 13641234' }],
  // No local Turkey phone number is listed in the office directory yet.
  turkey: [],
};

export const phoneHref = phone => `tel:${phone.replace(/\s/g, '')}`;
