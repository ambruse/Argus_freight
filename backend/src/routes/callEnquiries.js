const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const { createEnquiry, getEnquiries, updateEnquiryStatus, updateEnquiry } = require('../controllers/callEnquiryController');

router.use(authenticateToken);

router.post('/', createEnquiry);
router.get('/', getEnquiries);
router.patch('/:id/status', updateEnquiryStatus);
router.patch('/:id', updateEnquiry);

module.exports = router;
