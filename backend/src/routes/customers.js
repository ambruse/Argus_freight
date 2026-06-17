const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const { getAllCustomers } = require('../controllers/customerController');

router.use(authenticateToken);
router.get('/', getAllCustomers);

module.exports = router;
