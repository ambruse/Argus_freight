// src/routes/ccRecipients.js
const express = require('express');
const router  = express.Router();
const { getAll, create, update, remove } = require('../controllers/ccRecipientsController');
const { authenticateToken } = require('../middleware/auth');

router.get('/',     authenticateToken, getAll);
router.post('/',    authenticateToken, create);
router.put('/:id',  authenticateToken, update);
router.delete('/:id', authenticateToken, remove);

module.exports = router;
