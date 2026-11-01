// Older deployments return port names without cities. Load reference metadata
// only when needed; keep the server's available routes and IDs unchanged.
let cityDirectory;
export async function withCityNames(locations) {
    if (locations.every(location => location.city)) return locations;
    if (!cityDirectory) {
        cityDirectory = import('../../../frontend/lib/data/port-catalog.json')
            .then(({ default: catalog }) => new Map(catalog.ports.map(port => [port.id, port.city])))
            .catch(error => { cityDirectory = undefined; throw error; });
    }
    const cities = await cityDirectory;
    return locations.map(location => location.city ? location : {
        ...location,
        city: cities.get(location.id) || (location.kind === 'TRUCK' ? location.name : ''),
    });
}
