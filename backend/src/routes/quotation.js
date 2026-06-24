// src/routes/quotation.js
const express = require('express');
const router  = express.Router();
const { authenticateToken, requireRole } = require('../middleware/auth');
const { 
  generateQuotation, 
  getQuotations, 
  downloadQuotation,
  approveQuotation,
  disapproveQuotation
} = require('../controllers/quotationController');

// All quotation routes require authentication
router.use(authenticateToken);

// Restrict access to admin, operator, and sales roles
router.use(requireRole('admin', 'operator', 'sales'));

router.post('/generate',       generateQuotation);
router.get('/',               getQuotations);
router.get('/download/:id',   downloadQuotation);

// Admin-only approval routes
router.post('/approve/:id',     requireRole('admin'), approveQuotation);
router.post('/disapprove/:id',  requireRole('admin'), disapproveQuotation);

module.exports = router;
