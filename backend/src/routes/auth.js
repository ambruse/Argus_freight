// src/routes/auth.js
const express = require('express');
const router  = express.Router();
const { 
  login, me, verifyPassword, changePassword, register, 
  getEmailSettings, updateEmailSettings, getAdminUsers, 
  updateAdminUserEmail, getOperatorsList, getSalesList, createAdminOperator, deleteAdminUser, toggleStallUser,
  updateUserExtension, updateUserCountry, updateProfile, getProfile, getPublicKey, getSignature, updateSignature,
  forgotPassword, verifyResetToken, resetPassword,
  getAdminResetEmailSettings, updateAdminResetEmailSettings
} = require('../controllers/authController');
const { authenticateToken } = require('../middleware/auth');
const { authRateLimiter } = require('../middleware/rateLimiter');

// Public — no auth required (rate-limited)
router.get('/public-key', getPublicKey);
router.post('/login', authRateLimiter, login);
router.post('/register', authRateLimiter, register);
router.post('/forgot-password', authRateLimiter, forgotPassword);
router.post('/verify-reset-token', authRateLimiter, verifyResetToken);
router.post('/reset-password', authRateLimiter, resetPassword);

// Protected — verify token and return user info
router.get('/me', authenticateToken, me);

// Protected — password management (rate-limited)
router.post('/verify-password', authenticateToken, authRateLimiter, verifyPassword);
router.post('/change-password', authenticateToken, authRateLimiter, changePassword);

// Protected — profile update management
router.get('/profile', authenticateToken, getProfile);
router.post('/profile', authenticateToken, updateProfile);

// Protected — email settings management
router.get('/email-settings', authenticateToken, getEmailSettings);
router.post('/email-settings', authenticateToken, updateEmailSettings);

// Protected — signature settings
router.get('/signature', authenticateToken, getSignature);
router.post('/signature', authenticateToken, updateSignature);

// Protected — list of active operators (for sales dropdown)
router.get('/operators', authenticateToken, getOperatorsList);

// Protected — list of active sales users (for customer dropdown)
router.get('/sales', authenticateToken, getSalesList);

// Admin only — manage other users email settings & system reset email
router.get('/admin/users', authenticateToken, getAdminUsers);
router.post('/admin/update-user-email', authenticateToken, updateAdminUserEmail);
router.post('/admin/create-operator', authenticateToken, createAdminOperator);
router.post('/admin/delete-user', authenticateToken, deleteAdminUser);
router.post('/admin/toggle-stall', authenticateToken, toggleStallUser);
router.post('/admin/update-extension', authenticateToken, updateUserExtension);
router.post('/admin/update-country', authenticateToken, updateUserCountry);
router.get('/admin/reset-email-settings', authenticateToken, getAdminResetEmailSettings);
router.post('/admin/reset-email-settings', authenticateToken, updateAdminResetEmailSettings);
module.exports = router;
