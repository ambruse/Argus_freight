// src/routes/rfq.js
const express = require('express');
const router  = express.Router();
const { authenticateToken } = require('../middleware/auth');
const { generateRfq, sendRfqEmail, getNextRef } = require('../controllers/rfqController');
const { generateCustomerRfq, sendCustomerRfqEmail } = require('../controllers/customerRfqController');

router.use(authenticateToken);

router.get('/next-ref', getNextRef);
router.post('/generate', generateRfq);
router.post('/customer-generate', generateCustomerRfq);
router.post('/:ref_no/send-email', sendRfqEmail);
router.post('/customer-send-email/:ref_no', sendCustomerRfqEmail);

module.exports = router;
