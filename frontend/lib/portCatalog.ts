import catalog from "./data/port-catalog.json";
export const PORT_COUNTRIES = catalog.countries;
export const PORT_CATALOG = catalog.ports;
export const normalizeLocationText = (s: string) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
export function findCountry(value: string) {
  const query = normalizeLocationText(value);
  return PORT_COUNTRIES.find(c => [c.code, c.name, ...c.aliases].some(n => normalizeLocationText(n) === query));
}
export function availablePorts(country = "", mode = "", ports = PORT_CATALOG) {
  const code = findCountry(country)?.code;
  const transport = mode.toUpperCase();
  return ports.filter(p => (!country || p.country === code) && (!["AIR", "SEA"].includes(transport) || p.mode === transport));
}
