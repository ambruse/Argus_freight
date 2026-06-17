// src/routes/rfq.js
const express = require('express');
const router  = express.Router();
const { authenticateToken } = require('../middleware/auth');
const { generateRfq, sendRfqEmail } = require('../controllers/rfqController');

router.use(authenticateToken);

router.post('/generate', generateRfq);
router.post('/:ref_no/send-email', sendRfqEmail);

module.exports = router;
