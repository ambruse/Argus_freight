// src/middleware/errorHandler.js
// ─────────────────────────────────────────────────────────────
//  Global Express error handler.
//  Must be the last middleware registered in server.js.
// ─────────────────────────────────────────────────────────────
const multer = require('multer');

const errorHandler = (err, req, res, _next) => {
  console.error(`[ERROR] ${req.method} ${req.path}:`, err.message);

  // Multer-specific errors (file size, wrong type, etc.)
  if (err instanceof multer.MulterError) {
    const messages = {
      LIMIT_FILE_SIZE:       'File is too large. Maximum allowed size is 10 MB.',
      LIMIT_UNEXPECTED_FILE: err.message || 'Unexpected file field.',
    };
    return res.status(400).json({
      success: false,
      message: messages[err.code] || `Upload error: ${err.message}`,
    });
  }

  // JWT / auth errors forwarded from middleware
  if (err.name === 'UnauthorizedError') {
    return res.status(401).json({ success: false, message: 'Invalid or missing authentication token.' });
  }

  // Postgres unique-violation (code 23505)
  if (err.code === '23505') {
    return res.status(409).json({ success: false, message: 'A record with that identifier already exists.' });
  }

  // Default 500
  const statusCode = err.statusCode || 500;
  res.status(statusCode).json({
    success: false,
    message: err.message || 'An unexpected server error occurred.',
    ...(process.env.NODE_ENV !== 'production' && { stack: err.stack }),
  });
};

module.exports = errorHandler;
