const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const { createEnquiry, getEnquiries, updateEnquiryStatus } = require('../controllers/callEnquiryController');

router.use(authenticateToken);

router.post('/', createEnquiry);
router.get('/', getEnquiries);
router.patch('/:id/status', updateEnquiryStatus);

module.exports = router;
