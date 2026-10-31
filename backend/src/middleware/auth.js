// src/middleware/auth.js
// ─────────────────────────────────────────────────────────────
//  JWT Authentication Middleware
//  Expects: Authorization: Bearer <token>
//  Attaches req.user = { id, username, role } on success.
// ─────────────────────────────────────────────────────────────
const jwt = require('jsonwebtoken');

const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  let token = authHeader && authHeader.split(' ')[1]; // "Bearer <token>"

  // Fallback to query parameter (e.g., for direct browser file downloads)
  if (!token && req.query.token) {
    token = req.query.token;
  }

  if (!token) {
    return res.status(401).json({ success: false, message: 'Access denied. No token provided.' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded; // { id, username, role, iat, exp }
    // Raters manage tariffs only, plus their own account/password. Enforce this
    // centrally so direct API calls cannot bypass the restricted navigation.
    if (decoded.role === 'rater') {
      const route = `${req.baseUrl}${req.path}`.replace(/\/+$/, '').toLowerCase();
      const accountRoutes = {
        '/api/auth/me': ['GET'],
        '/api/auth/profile': ['GET', 'POST'],
        '/api/auth/verify-password': ['POST'],
        '/api/auth/change-password': ['POST'],
      };
      if (!route.startsWith('/api/live-pricing/') && !accountRoutes[route]?.includes(req.method)) {
        return res.status(403).json({ success: false, message: 'Rater access is limited to live freight rates and your own account.' });
      }
    }
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ success: false, message: 'Token expired. Please log in again.' });
    }
    return res.status(403).json({ success: false, message: 'Invalid token.' });
  }
};

/**
 * Role guard factory — use after authenticateToken.
 * Example: router.get('/admin', authenticateToken, requireRole('admin'), handler)
 */
const requireRole = (...roles) => (req, res, next) => {
  if (!roles.includes(req.user?.role)) {
    return res.status(403).json({ success: false, message: 'Insufficient permissions.' });
  }
  next();
};

module.exports = { authenticateToken, requireRole };
