'use strict';

// Tracker accounts use only Operations and their own account settings.
function trackerCanRequest(route, method) {
  const account = {
    '/api/auth/me': ['GET'],
    '/api/auth/profile': ['GET', 'POST'],
    '/api/auth/verify-password': ['POST'],
    '/api/auth/change-password': ['POST'],
  };
  if (account[route]?.includes(method)) return true;
  if (route === '/api/shipments/tracking') return ['GET', 'POST'].includes(method);
  if (route === '/api/shipments/tracking/bulk') return method === 'POST';
  if (/^\/api\/shipments\/tracking\/[^/]+$/.test(route)) return method === 'GET';
  if (/^\/api\/shipments\/[^/]+\/tracking$/.test(route)) return method === 'PATCH';
  if (/^\/api\/shipments\/[^/]+\/tracking\/events$/.test(route)) return ['GET', 'POST'].includes(method);
  return false;
}

module.exports = { trackerCanRequest };
