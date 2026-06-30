// src/routes/customers.js
const express = require('express');
const router = express.Router();
const { authenticateToken, requireRole } = require('../middleware/auth');
const { getAllCustomers, updateCustomerByAdmin, deleteCustomerByAdmin } = require('../controllers/customerController');

router.use(authenticateToken);

// Accessible by Admin, Operator, Sales
router.get('/', requireRole('admin', 'operator', 'sales'), getAllCustomers);

// Only admin can insert/edit/delete
router.put('/:id', requireRole('admin'), updateCustomerByAdmin);
router.delete('/:id', requireRole('admin'), deleteCustomerByAdmin);

module.exports = router;
