/** Display metadata only: callers keep the original location ID or saved port value. */
export function locationLabel({ country = '', city = '', name = '' }) {
    if (!city) return [country, name].filter(Boolean).join(', ');
    const place = city !== name ? `${city} — ${name}` : name;
    return [place, country].filter(Boolean).join(', ');
}
