// src/routes/dashboard.js
const express = require('express');
const router  = express.Router();
const { authenticateToken } = require('../middleware/auth');
const { getMetrics, getMonthlySummary, getUnreadReplies } = require('../controllers/dashboardController');

router.use(authenticateToken);
router.get('/metrics', getMetrics);
router.get('/summary', getMonthlySummary);
router.get('/unread-replies', getUnreadReplies);

module.exports = router;
