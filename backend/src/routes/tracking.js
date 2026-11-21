// Public tracking is registered through tracking/router.js in server.js.
// Kept as a compatibility module for callers mounting this route directly.
const { createTrackingRouters } = require('../tracking/router');
module.exports = createTrackingRouters(require('../config/db').pool).publicRouter;
