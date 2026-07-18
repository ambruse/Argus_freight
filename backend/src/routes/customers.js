// src/routes/customers.js
const express = require('express');
const router = express.Router();
const { authenticateToken, requireRole } = require('../middleware/auth');
const { getAllCustomers, updateCustomerByAdmin, deleteCustomerByAdmin, createCustomer } = require('../controllers/customerController');

router.use(authenticateToken);

// Accessible by Admin, Operator, Sales
router.get('/', requireRole('admin', 'operator', 'sales'), getAllCustomers);
router.post('/', requireRole('admin', 'operator', 'sales'), createCustomer);

// Only admin can insert/edit/delete
router.put('/:id', requireRole('admin'), updateCustomerByAdmin);
router.delete('/:id', requireRole('admin'), deleteCustomerByAdmin);

module.exports = router;
