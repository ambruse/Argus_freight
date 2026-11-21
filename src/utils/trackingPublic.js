// Public tracking helpers: never infer a measured position or historical event.
export function formatTrackingTime(value) {
  if (!value) return 'Not recorded';
  const source = String(value);
  if (/^\d{4}-\d{2}-\d{2}$/.test(source)) {
    const day = new Date(`${source}T00:00:00Z`);
    return Number.isNaN(day.getTime()) ? 'Not recorded' : new Intl.DateTimeFormat('en-GB', { dateStyle: 'medium', timeZone: 'UTC' }).format(day);
  }
  const normalized = /^\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}/.test(source) && !/(Z|[+-]\d{2}:?\d{2})$/i.test(source)
    ? `${source.replace(' ', 'T')}Z` : source;
  const date = new Date(normalized);
  return Number.isNaN(date.getTime()) ? 'Not recorded' : new Intl.DateTimeFormat('en-GB', {
    dateStyle: 'medium', timeStyle: 'short', timeZone: 'UTC'
  }).format(date) + ' UTC';
}

export function verifiedEndpoint(location) {
  if (!location || location.lat == null || location.lng == null || location.lat === '' || location.lng === '') return null;
  const lat = Number(location.lat);
  const lng = Number(location.lng);
  if (!Number.isFinite(lat) || !Number.isFinite(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180) return null;
  return { ...location, lat, lng, name: location.port || location.city || location.name || location.country || 'Endpoint' };
}

export function orderedPublicEvents(events) {
  return (Array.isArray(events) ? events : []).filter(event => event && event.is_public !== false && event.is_public !== 0)
    .slice().sort((a, b) => String(a.event_time || '').localeCompare(String(b.event_time || '')) || Number(a.id || 0) - Number(b.id || 0));
}

let socketClientPromise;
export function loadTrackingSocketClient() {
  if (window.io) return Promise.resolve(window.io);
  if (socketClientPromise) return socketClientPromise;
  socketClientPromise = new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = '/socket.io/socket.io.js';
    script.async = true;
    const timeout = window.setTimeout(() => fail(), 8000);
    const fail = () => {
      window.clearTimeout(timeout);
      script.remove();
      socketClientPromise = undefined;
      reject(new Error('Realtime connection unavailable'));
    };
    script.onload = () => {
      if (!window.io) return fail();
      window.clearTimeout(timeout);
      resolve(window.io);
    };
    script.onerror = fail;
    document.head.appendChild(script);
  });
  return socketClientPromise;
}
