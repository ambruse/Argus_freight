// Group display rows by exact facility IDs, never by price or city aliases.
// Each option is already a server-selected winner for equivalent terms.
export function groupPublicRoutes(rates = []) {
  const lanes = new Map();
  for (const rate of rates) {
    const key = JSON.stringify([rate.origin_id, rate.destination_id]);
    if (!lanes.has(key)) lanes.set(key, { key, options: [] });
    const options = lanes.get(key).options;
    const index = options.findIndex(option => option.reference === rate.reference);
    if (index < 0) options.push(rate);
    else options[index] = rate;
  }
  return [...lanes.values()];
}
