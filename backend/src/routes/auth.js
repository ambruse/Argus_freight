// src/routes/auth.js
const express = require('express');
const router  = express.Router();
const { 
  login, me, verifyPassword, changePassword, register, 
  getEmailSettings, updateEmailSettings, getAdminUsers, 
  updateAdminUserEmail, getOperatorsList, createAdminOperator, deleteAdminUser, toggleStallUser,
  updateUserExtension
} = require('../controllers/authController');
const { authenticateToken } = require('../middleware/auth');
const { authRateLimiter } = require('../middleware/rateLimiter');

// Public — no auth required (rate-limited)
router.post('/login', authRateLimiter, login);
router.post('/register', authRateLimiter, register);

// Protected — verify token and return user info
router.get('/me', authenticateToken, me);

// Protected — password management (rate-limited)
router.post('/verify-password', authenticateToken, authRateLimiter, verifyPassword);
router.post('/change-password', authenticateToken, authRateLimiter, changePassword);

// Protected — email settings management
router.get('/email-settings', authenticateToken, getEmailSettings);
router.post('/email-settings', authenticateToken, updateEmailSettings);

// Protected — list of active operators (for sales dropdown)
router.get('/operators', authenticateToken, getOperatorsList);

// Admin only — manage other users email settings
router.get('/admin/users', authenticateToken, getAdminUsers);
router.post('/admin/update-user-email', authenticateToken, updateAdminUserEmail);
router.post('/admin/create-operator', authenticateToken, createAdminOperator);
router.post('/admin/delete-user', authenticateToken, deleteAdminUser);
router.post('/admin/toggle-stall', authenticateToken, toggleStallUser);
router.post('/admin/update-extension', authenticateToken, updateUserExtension);
module.exports = router;
