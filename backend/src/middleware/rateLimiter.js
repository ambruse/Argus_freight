// src/middleware/rateLimiter.js
// ─────────────────────────────────────────────────────────────
//  Lightweight Custom In-Memory Rate Limiter Middleware
// ─────────────────────────────────────────────────────────────

const rateLimitStore = {};
const LIMIT_WINDOW_MS = 15 * 60 * 1000; // 15 minutes
const MAX_REQUESTS = 100; // Max 100 requests per window

const authRateLimiter = (req, res, next) => {
  const ip = req.ip || req.headers['x-forwarded-for'] || req.socket.remoteAddress;
  const now = Date.now();

  if (!rateLimitStore[ip]) {
    rateLimitStore[ip] = [];
  }

  // Filter out timestamps outside the current window
  rateLimitStore[ip] = rateLimitStore[ip].filter(timestamp => now - timestamp < LIMIT_WINDOW_MS);

  if (rateLimitStore[ip].length >= MAX_REQUESTS) {
    return res.status(429).json({
      success: false,
      message: 'Too many requests from this IP. Please try again after 15 minutes.'
    });
  }

  rateLimitStore[ip].push(now);
  next();
};

module.exports = { authRateLimiter };
