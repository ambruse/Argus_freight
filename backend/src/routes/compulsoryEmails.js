const express = require('express');
const router = express.Router();
const compulsoryEmailsController = require('../controllers/compulsoryEmailsController');
const { authenticateToken, requireRole } = require('../middleware/auth');

// Get all compulsory emails (public for authenticated users)
router.get('/', authenticateToken, compulsoryEmailsController.getAll);

// Admin-only routes
router.post('/', authenticateToken, requireRole('admin'), compulsoryEmailsController.create);
router.put('/:id', authenticateToken, requireRole('admin'), compulsoryEmailsController.update);
router.delete('/:id', authenticateToken, requireRole('admin'), compulsoryEmailsController.remove);

module.exports = router;
