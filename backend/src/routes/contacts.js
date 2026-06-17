// src/routes/contacts.js
const express = require('express');
const router = express.Router();
const { authenticateToken, requireRole } = require('../middleware/auth');
const { getAllContacts, createContact, deleteContact } = require('../controllers/contactController');

router.use(authenticateToken);

router.get('/', getAllContacts);
router.post('/', createContact);
router.delete('/:id', requireRole('admin'), deleteContact);

module.exports = router;
