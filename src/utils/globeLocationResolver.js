// src/utils/globeLocationResolver.js

const COUNTRY_PORT_DB = {
  // Middle East / GCC
  QATAR: { name: "Qatar", iso3: "QAT", capital: "Doha", lat: 25.2854, lng: 51.5310, flag: "🇶🇦" },
  DOHA: { name: "Qatar", iso3: "QAT", capital: "Doha", lat: 25.2854, lng: 51.5310, flag: "🇶🇦" },
  "HAMAD PORT": { name: "Qatar", iso3: "QAT", capital: "Doha", lat: 25.0139, lng: 51.6111, flag: "🇶🇦" },
  
  UAE: { name: "United Arab Emirates", iso3: "ARE", capital: "Abu Dhabi", lat: 25.2048, lng: 55.2708, flag: "🇦🇪" },
  "UNITED ARAB EMIRATES": { name: "United Arab Emirates", iso3: "ARE", capital: "Abu Dhabi", lat: 25.2048, lng: 55.2708, flag: "🇦🇪" },
  DUBAI: { name: "United Arab Emirates", iso3: "ARE", capital: "Abu Dhabi", lat: 25.2048, lng: 55.2708, flag: "🇦🇪" },
  "JEBEL ALI": { name: "United Arab Emirates", iso3: "ARE", capital: "Abu Dhabi", lat: 25.0113, lng: 55.0617, flag: "🇦🇪" },
  "ABU DHABI": { name: "United Arab Emirates", iso3: "ARE", capital: "Abu Dhabi", lat: 24.4539, lng: 54.3773, flag: "🇦🇪" },
  SHARJAH: { name: "United Arab Emirates", iso3: "ARE", capital: "Abu Dhabi", lat: 25.3573, lng: 55.4033, flag: "🇦🇪" },

  BAHRAIN: { name: "Bahrain", iso3: "BHR", capital: "Manama", lat: 26.0667, lng: 50.5577, flag: "🇧🇭" },
  MANAMA: { name: "Bahrain", iso3: "BHR", capital: "Manama", lat: 26.2285, lng: 50.5860, flag: "🇧🇭" },
  "KHALIFA BIN SALMAN": { name: "Bahrain", iso3: "BHR", capital: "Manama", lat: 26.1732, lng: 50.6974, flag: "🇧🇭" },

  "SAUDI ARABIA": { name: "Saudi Arabia", iso3: "SAU", capital: "Riyadh", lat: 24.7136, lng: 46.6753, flag: "🇸🇦" },
  KSA: { name: "Saudi Arabia", iso3: "SAU", capital: "Riyadh", lat: 24.7136, lng: 46.6753, flag: "🇸🇦" },
  RIYADH: { name: "Saudi Arabia", iso3: "SAU", capital: "Riyadh", lat: 24.7136, lng: 46.6753, flag: "🇸🇦" },
  JEDDAH: { name: "Saudi Arabia", iso3: "SAU", capital: "Riyadh", lat: 21.4858, lng: 39.1925, flag: "🇸🇦" },
  DAMMAM: { name: "Saudi Arabia", iso3: "SAU", capital: "Riyadh", lat: 26.4207, lng: 50.0888, flag: "🇸🇦" },

  OMAN: { name: "Oman", iso3: "OMN", capital: "Muscat", lat: 23.5880, lng: 58.3829, flag: "🇴🇲" },
  MUSCAT: { name: "Oman", iso3: "OMN", capital: "Muscat", lat: 23.5880, lng: 58.3829, flag: "🇴🇲" },
  SOHAR: { name: "Oman", iso3: "OMN", capital: "Muscat", lat: 24.3461, lng: 56.7075, flag: "🇴🇲" },
  SALALAH: { name: "Oman", iso3: "OMN", capital: "Muscat", lat: 17.0151, lng: 54.0924, flag: "🇴🇲" },

  KUWAIT: { name: "Kuwait", iso3: "KWT", capital: "Kuwait City", lat: 29.3759, lng: 47.9774, flag: "🇰🇼" },
  "KUWAIT CITY": { name: "Kuwait", iso3: "KWT", capital: "Kuwait City", lat: 29.3759, lng: 47.9774, flag: "🇰🇼" },
  SHUWAIKH: { name: "Kuwait", iso3: "KWT", capital: "Kuwait City", lat: 29.3519, lng: 47.9268, flag: "🇰🇼" },

  TURKEY: { name: "Turkey", iso3: "TUR", capital: "Ankara", lat: 41.0082, lng: 28.9784, flag: "🇹🇷" },
  TURKIYE: { name: "Turkey", iso3: "TUR", capital: "Ankara", lat: 41.0082, lng: 28.9784, flag: "🇹🇷" },
  ISTANBUL: { name: "Turkey", iso3: "TUR", capital: "Ankara", lat: 41.0082, lng: 28.9784, flag: "🇹🇷" },
  MERSIN: { name: "Turkey", iso3: "TUR", capital: "Ankara", lat: 36.8121, lng: 34.6415, flag: "🇹🇷" },
  IZMIR: { name: "Turkey", iso3: "TUR", capital: "Ankara", lat: 38.4237, lng: 27.1428, flag: "🇹🇷" },

  // Asia
  CHINA: { name: "China", iso3: "CHN", capital: "Beijing", lat: 31.2304, lng: 121.4737, flag: "🇨🇳" },
  SHANGHAI: { name: "China", iso3: "CHN", capital: "Beijing", lat: 31.2304, lng: 121.4737, flag: "🇨🇳" },
  GUANGZHOU: { name: "China", iso3: "CHN", capital: "Beijing", lat: 23.1291, lng: 113.2644, flag: "🇨🇳" },
  SHENZHEN: { name: "China", iso3: "CHN", capital: "Beijing", lat: 22.5431, lng: 114.0579, flag: "🇨🇳" },
  NINGBO: { name: "China", iso3: "CHN", capital: "Beijing", lat: 29.8683, lng: 121.5440, flag: "🇨🇳" },
  QINGDAO: { name: "China", iso3: "CHN", capital: "Beijing", lat: 36.0671, lng: 120.3826, flag: "🇨🇳" },
  TIANJIN: { name: "China", iso3: "CHN", capital: "Beijing", lat: 39.0842, lng: 117.2009, flag: "🇨🇳" },
  XIAMEN: { name: "China", iso3: "CHN", capital: "Beijing", lat: 24.4798, lng: 118.0894, flag: "🇨🇳" },
  YANTIAN: { name: "China", iso3: "CHN", capital: "Beijing", lat: 22.5750, lng: 114.2750, flag: "🇨🇳" },

  "HONG KONG": { name: "Hong Kong", iso3: "HKG", capital: "Hong Kong", lat: 22.3193, lng: 114.1694, flag: "🇭🇰" },

  INDIA: { name: "India", iso3: "IND", capital: "New Delhi", lat: 19.0760, lng: 72.8777, flag: "🇮🇳" },
  MUMBAI: { name: "India", iso3: "IND", capital: "New Delhi", lat: 19.0760, lng: 72.8777, flag: "🇮🇳" },
  "NHAVA SHEVA": { name: "India", iso3: "IND", capital: "New Delhi", lat: 18.9499, lng: 72.9510, flag: "🇮🇳" },
  JNPT: { name: "India", iso3: "IND", capital: "New Delhi", lat: 18.9499, lng: 72.9510, flag: "🇮🇳" },
  DELHI: { name: "India", iso3: "IND", capital: "New Delhi", lat: 28.6139, lng: 77.2090, flag: "🇮🇳" },
  "NEW DELHI": { name: "India", iso3: "IND", capital: "New Delhi", lat: 28.6139, lng: 77.2090, flag: "🇮🇳" },
  CHENNAI: { name: "India", iso3: "IND", capital: "New Delhi", lat: 13.0827, lng: 80.2707, flag: "🇮🇳" },
  KOLKATA: { name: "India", iso3: "IND", capital: "New Delhi", lat: 22.5726, lng: 88.3639, flag: "🇮🇳" },
  MUNDRA: { name: "India", iso3: "IND", capital: "New Delhi", lat: 22.8395, lng: 69.7042, flag: "🇮🇳" },
  COCHIN: { name: "India", iso3: "IND", capital: "New Delhi", lat: 9.9312, lng: 76.2673, flag: "🇮🇳" },
  KOCHI: { name: "India", iso3: "IND", capital: "New Delhi", lat: 9.9312, lng: 76.2673, flag: "🇮🇳" },
  BANGALORE: { name: "India", iso3: "IND", capital: "New Delhi", lat: 12.9716, lng: 77.5946, flag: "🇮🇳" },

  SINGAPORE: { name: "Singapore", iso3: "SGP", capital: "Singapore", lat: 1.3521, lng: 103.8198, flag: "🇸🇬" },

  MALAYSIA: { name: "Malaysia", iso3: "MYS", capital: "Kuala Lumpur", lat: 3.1390, lng: 101.6869, flag: "🇲🇾" },
  "PORT KLANG": { name: "Malaysia", iso3: "MYS", capital: "Kuala Lumpur", lat: 3.0033, lng: 101.3934, flag: "🇲🇾" },
  "KUALA LUMPUR": { name: "Malaysia", iso3: "MYS", capital: "Kuala Lumpur", lat: 3.1390, lng: 101.6869, flag: "🇲🇾" },
  PENANG: { name: "Malaysia", iso3: "MYS", capital: "Kuala Lumpur", lat: 5.4164, lng: 100.3327, flag: "🇲🇾" },

  JAPAN: { name: "Japan", iso3: "JPN", capital: "Tokyo", lat: 35.6762, lng: 139.6503, flag: "🇯🇵" },
  TOKYO: { name: "Japan", iso3: "JPN", capital: "Tokyo", lat: 35.6762, lng: 139.6503, flag: "🇯🇵" },
  YOKOHAMA: { name: "Japan", iso3: "JPN", capital: "Tokyo", lat: 35.4437, lng: 139.6380, flag: "🇯🇵" },
  KOBE: { name: "Japan", iso3: "JPN", capital: "Tokyo", lat: 34.6901, lng: 135.1955, flag: "🇯🇵" },

  "SOUTH KOREA": { name: "South Korea", iso3: "KOR", capital: "Seoul", lat: 37.5665, lng: 126.9780, flag: "🇰🇷" },
  KOREA: { name: "South Korea", iso3: "KOR", capital: "Seoul", lat: 37.5665, lng: 126.9780, flag: "🇰🇷" },
  BUSAN: { name: "South Korea", iso3: "KOR", capital: "Seoul", lat: 35.1796, lng: 129.0756, flag: "🇰🇷" },
  SEOUL: { name: "South Korea", iso3: "KOR", capital: "Seoul", lat: 37.5665, lng: 126.9780, flag: "🇰🇷" },
  INCHEON: { name: "South Korea", iso3: "KOR", capital: "Seoul", lat: 37.4563, lng: 126.7052, flag: "🇰🇷" },

  THAILAND: { name: "Thailand", iso3: "THA", capital: "Bangkok", lat: 13.7563, lng: 100.5018, flag: "🇹🇭" },
  BANGKOK: { name: "Thailand", iso3: "THA", capital: "Bangkok", lat: 13.7563, lng: 100.5018, flag: "🇹🇭" },
  "LAEM CHABANG": { name: "Thailand", iso3: "THA", capital: "Bangkok", lat: 13.0847, lng: 100.8841, flag: "🇹🇭" },

  VIETNAM: { name: "Vietnam", iso3: "VNM", capital: "Hanoi", lat: 10.8231, lng: 106.6297, flag: "🇻🇳" },
  "HO CHI MINH": { name: "Vietnam", iso3: "VNM", capital: "Hanoi", lat: 10.8231, lng: 106.6297, flag: "🇻🇳" },
  "HAI PHONG": { name: "Vietnam", iso3: "VNM", capital: "Hanoi", lat: 20.8449, lng: 106.6881, flag: "🇻🇳" },

  INDONESIA: { name: "Indonesia", iso3: "IDN", capital: "Jakarta", lat: -6.2088, lng: 106.8456, flag: "🇮🇩" },
  JAKARTA: { name: "Indonesia", iso3: "IDN", capital: "Jakarta", lat: -6.2088, lng: 106.8456, flag: "🇮🇩" },

  PAKISTAN: { name: "Pakistan", iso3: "PAK", capital: "Islamabad", lat: 24.8607, lng: 67.0011, flag: "🇵🇰" },
  KARACHI: { name: "Pakistan", iso3: "PAK", capital: "Islamabad", lat: 24.8607, lng: 67.0011, flag: "🇵🇰" },

  BANGLADESH: { name: "Bangladesh", iso3: "BGD", capital: "Dhaka", lat: 22.3569, lng: 91.7832, flag: "🇧🇩" },
  CHITTAGONG: { name: "Bangladesh", iso3: "BGD", capital: "Dhaka", lat: 22.3569, lng: 91.7832, flag: "🇧🇩" },

  "SRI LANKA": { name: "Sri Lanka", iso3: "LKA", capital: "Colombo", lat: 6.9271, lng: 79.8612, flag: "🇱🇰" },
  COLOMBO: { name: "Sri Lanka", iso3: "LKA", capital: "Colombo", lat: 6.9271, lng: 79.8612, flag: "🇱🇰" },

  // Europe
  "UNITED KINGDOM": { name: "United Kingdom", iso3: "GBR", capital: "London", lat: 51.5074, lng: -0.1278, flag: "🇬🇧" },
  UK: { name: "United Kingdom", iso3: "GBR", capital: "London", lat: 51.5074, lng: -0.1278, flag: "🇬🇧" },
  LONDON: { name: "United Kingdom", iso3: "GBR", capital: "London", lat: 51.5074, lng: -0.1278, flag: "🇬🇧" },
  FELIXSTOWE: { name: "United Kingdom", iso3: "GBR", capital: "London", lat: 51.9639, lng: 1.3511, flag: "🇬🇧" },
  SOUTHAMPTON: { name: "United Kingdom", iso3: "GBR", capital: "London", lat: 50.9097, lng: -1.4044, flag: "🇬🇧" },

  GERMANY: { name: "Germany", iso3: "DEU", capital: "Berlin", lat: 53.5511, lng: 9.9937, flag: "🇩🇪" },
  HAMBURG: { name: "Germany", iso3: "DEU", capital: "Berlin", lat: 53.5511, lng: 9.9937, flag: "🇩🇪" },
  BREMEN: { name: "Germany", iso3: "DEU", capital: "Berlin", lat: 53.0793, lng: 8.8017, flag: "🇩🇪" },
  FRANKFURT: { name: "Germany", iso3: "DEU", capital: "Berlin", lat: 50.1109, lng: 8.6821, flag: "🇩🇪" },

  NETHERLANDS: { name: "Netherlands", iso3: "NLD", capital: "Amsterdam", lat: 51.9244, lng: 4.4777, flag: "🇳🇱" },
  HOLLAND: { name: "Netherlands", iso3: "NLD", capital: "Amsterdam", lat: 51.9244, lng: 4.4777, flag: "🇳🇱" },
  ROTTERDAM: { name: "Netherlands", iso3: "NLD", capital: "Amsterdam", lat: 51.9244, lng: 4.4777, flag: "🇳🇱" },
  AMSTERDAM: { name: "Netherlands", iso3: "NLD", capital: "Amsterdam", lat: 52.3676, lng: 4.9041, flag: "🇳🇱" },

  BELGIUM: { name: "Belgium", iso3: "BEL", capital: "Brussels", lat: 51.2194, lng: 4.4025, flag: "🇧🇪" },
  ANTWERP: { name: "Belgium", iso3: "BEL", capital: "Brussels", lat: 51.2194, lng: 4.4025, flag: "🇧🇪" },

  FRANCE: { name: "France", iso3: "FRA", capital: "Paris", lat: 43.2965, lng: 5.3698, flag: "🇫🇷" },
  MARSEILLE: { name: "France", iso3: "FRA", capital: "Paris", lat: 43.2965, lng: 5.3698, flag: "🇫🇷" },
  "LE HAVRE": { name: "France", iso3: "FRA", capital: "Paris", lat: 49.4944, lng: 0.1079, flag: "🇫🇷" },
  PARIS: { name: "France", iso3: "FRA", capital: "Paris", lat: 48.8566, lng: 2.3522, flag: "🇫🇷" },

  ITALY: { name: "Italy", iso3: "ITA", capital: "Rome", lat: 44.4056, lng: 8.9463, flag: "🇮🇹" },
  GENOA: { name: "Italy", iso3: "ITA", capital: "Rome", lat: 44.4056, lng: 8.9463, flag: "🇮🇹" },
  ROME: { name: "Italy", iso3: "ITA", capital: "Rome", lat: 41.9028, lng: 12.4964, flag: "🇮🇹" },

  SPAIN: { name: "Spain", iso3: "ESP", capital: "Madrid", lat: 41.3879, lng: 2.1699, flag: "🇪🇸" },
  BARCELONA: { name: "Spain", iso3: "ESP", capital: "Madrid", lat: 41.3879, lng: 2.1699, flag: "🇪🇸" },
  VALENCIA: { name: "Spain", iso3: "ESP", capital: "Madrid", lat: 39.4699, lng: -0.3763, flag: "🇪🇸" },

  GREECE: { name: "Greece", iso3: "GRC", capital: "Athens", lat: 37.9429, lng: 23.6469, flag: "🇬🇷" },
  PIRAEUS: { name: "Greece", iso3: "GRC", capital: "Athens", lat: 37.9429, lng: 23.6469, flag: "🇬🇷" },

  // Americas
  USA: { name: "United States", iso3: "USA", capital: "Washington, D.C.", lat: 40.7128, lng: -74.0060, flag: "🇺🇸" },
  "UNITED STATES": { name: "United States", iso3: "USA", capital: "Washington, D.C.", lat: 40.7128, lng: -74.0060, flag: "🇺🇸" },
  "NEW YORK": { name: "United States", iso3: "USA", capital: "Washington, D.C.", lat: 40.7128, lng: -74.0060, flag: "🇺🇸" },
  "LOS ANGELES": { name: "United States", iso3: "USA", capital: "Washington, D.C.", lat: 34.0522, lng: -118.2437, flag: "🇺🇸" },
  HOUSTON: { name: "United States", iso3: "USA", capital: "Washington, D.C.", lat: 29.7604, lng: -95.3698, flag: "🇺🇸" },
  CHICAGO: { name: "United States", iso3: "USA", capital: "Washington, D.C.", lat: 41.8781, lng: -87.6298, flag: "🇺🇸" },

  CANADA: { name: "Canada", iso3: "CAN", capital: "Ottawa", lat: 49.2827, lng: -123.1207, flag: "🇨🇦" },
  VANCOUVER: { name: "Canada", iso3: "CAN", capital: "Ottawa", lat: 49.2827, lng: -123.1207, flag: "🇨🇦" },
  TORONTO: { name: "Canada", iso3: "CAN", capital: "Ottawa", lat: 43.6532, lng: -79.3832, flag: "🇨🇦" },
  MONTREAL: { name: "Canada", iso3: "CAN", capital: "Ottawa", lat: 45.5017, lng: -73.5673, flag: "🇨🇦" },

  BRAZIL: { name: "Brazil", iso3: "BRA", capital: "Brasilia", lat: -23.9608, lng: -46.3339, flag: "🇧🇷" },
  SANTOS: { name: "Brazil", iso3: "BRA", capital: "Brasilia", lat: -23.9608, lng: -46.3339, flag: "🇧🇷" },

  // Africa / Oceania
  EGYPT: { name: "Egypt", iso3: "EGY", capital: "Cairo", lat: 31.2001, lng: 29.9187, flag: "🇪🇬" },
  ALEXANDRIA: { name: "Egypt", iso3: "EGY", capital: "Cairo", lat: 31.2001, lng: 29.9187, flag: "🇪🇬" },
  "PORT SAID": { name: "Egypt", iso3: "EGY", capital: "Cairo", lat: 31.2653, lng: 32.3019, flag: "🇪🇬" },
  CAIRO: { name: "Egypt", iso3: "EGY", capital: "Cairo", lat: 30.0444, lng: 31.2357, flag: "🇪🇬" },

  "SOUTH AFRICA": { name: "South Africa", iso3: "ZAF", capital: "Pretoria", lat: -29.8587, lng: 31.0218, flag: "🇿🇦" },
  DURBAN: { name: "South Africa", iso3: "ZAF", capital: "Pretoria", lat: -29.8587, lng: 31.0218, flag: "🇿🇦" },
  "CAPE TOWN": { name: "South Africa", iso3: "ZAF", capital: "Pretoria", lat: -33.9249, lng: 18.4241, flag: "🇿🇦" },

  KENYA: { name: "Kenya", iso3: "KEN", capital: "Nairobi", lat: -4.0435, lng: 39.6682, flag: "🇰🇪" },
  MOMBASA: { name: "Kenya", iso3: "KEN", capital: "Nairobi", lat: -4.0435, lng: 39.6682, flag: "🇰🇪" },

  AUSTRALIA: { name: "Australia", iso3: "AUS", capital: "Canberra", lat: -33.8688, lng: 151.2093, flag: "🇦🇺" },
  SYDNEY: { name: "Australia", iso3: "AUS", capital: "Canberra", lat: -33.8688, lng: 151.2093, flag: "🇦🇺" },
  MELBOURNE: { name: "Australia", iso3: "AUS", capital: "Canberra", lat: -37.8136, lng: 144.9631, flag: "🇦🇺" }
};

/**
 * Resolves a POL or POD port/country string or object into a standardized GlobeLocation object.
 */
export function resolveGlobeLocation(input, fallbackName = "Global Node", fallbackCoords = [25.2854, 51.5310]) {
  if (!input) {
    return {
      name: fallbackName,
      iso3: "GLB",
      capital: fallbackName,
      lat: fallbackCoords[0],
      lng: fallbackCoords[1],
      flag: "🌐"
    };
  }

  // If already a valid GlobeLocation with lat/lng
  if (typeof input === "object" && typeof input.lat === "number" && typeof input.lng === "number") {
    return input;
  }

  // Extract search terms
  const searchStrings = [];
  if (typeof input === "string") {
    searchStrings.push(input);
  } else if (typeof input === "object") {
    if (input.city) searchStrings.push(input.city);
    if (input.country) searchStrings.push(input.country);
    if (input.name) searchStrings.push(input.name);
  }

  // Clean and check against database
  for (const str of searchStrings) {
    const cleaned = String(str).toUpperCase().trim();
    
    // Direct key match
    if (COUNTRY_PORT_DB[cleaned]) {
      return COUNTRY_PORT_DB[cleaned];
    }

    // Split by comma / slash / hyphen / space
    const tokens = cleaned.split(/[,/\\()\-–|]+/).map(t => t.trim()).filter(Boolean);
    for (const token of tokens) {
      if (COUNTRY_PORT_DB[token]) {
        return COUNTRY_PORT_DB[token];
      }
    }

    // Substring match
    for (const [key, val] of Object.entries(COUNTRY_PORT_DB)) {
      if (cleaned.includes(key) || key.includes(cleaned)) {
        return val;
      }
    }
  }

  // If city/country string provided but not in table, build best-effort location
  const displayName = (typeof input === "object" ? (input.country || input.city) : input) || fallbackName;
  return {
    name: displayName,
    iso3: displayName.slice(0, 3).toUpperCase(),
    capital: displayName,
    lat: fallbackCoords[0],
    lng: fallbackCoords[1],
    flag: "📍"
  };
}
