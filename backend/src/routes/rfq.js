// src/routes/rfq.js
const express = require('express');
const router  = express.Router();
const { authenticateToken } = require('../middleware/auth');
const { generateRfq, sendRfqEmail, approveRfq, rejectRfq } = require('../controllers/rfqController');
const { generateCustomerRfq, sendCustomerRfqEmail, approveCustomerRfq, rejectCustomerRfq } = require('../controllers/customerRfqController');

router.use(authenticateToken);

router.post('/generate', generateRfq);
router.post('/customer-generate', generateCustomerRfq);

// Customer approve/reject MUST come before /:ref_no routes to avoid param collision
router.post('/customer-approve/:ref_no', approveCustomerRfq);
router.post('/customer-reject/:ref_no',  rejectCustomerRfq);

router.post('/:ref_no/send-email', sendRfqEmail);
router.post('/:ref_no/approve',    approveRfq);
router.post('/:ref_no/reject',     rejectRfq);
router.post('/customer-send-email/:ref_no', sendCustomerRfqEmail);

module.exports = router;
