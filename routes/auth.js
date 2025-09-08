
// routes/authRoutes.js
const express = require('express');
const {
  register,
  login,
  adminLogin,
  verifyEmail,
  forgotPassword,
  resetPassword,
  getCurrentUser,
  changePassword,
  refreshToken
} = require('../controller/auth');
const { verifyToken } = require('../middleware/auth');
const { 
  validateRegister, 
  validateLogin, 
  validateForgotPassword,
  validateResetPassword,
  validateChangePassword
} = require('../middleware/validation');

const router = express.Router();

// Public routes
router.post('/register', validateRegister, register);
router.post('/login', validateLogin, login);
router.post('/admin-login', validateLogin, adminLogin);
router.post('/forgot-password', validateForgotPassword, forgotPassword);
router.post('/reset-password/:token', validateResetPassword, resetPassword);
router.get('/verify-email/:token', verifyEmail);

// Protected routes (require authentication)
router.get('/me', verifyToken, getCurrentUser);
router.post('/change-password', verifyToken, validateChangePassword, changePassword);
router.post('/refresh-token', verifyToken, refreshToken);

module.exports = router;