
// routes/user.js
const express = require('express');
const {
  getAllUsers,
  getUserById,
  updateProfile,
  toggleUserStatus,
  deleteUser,
  getUserStats
} = require('../controller/user');
const { verifyToken, requireAdmin } = require('../middleware/auth');
const { validateUpdateProfile } = require('../middleware/validation');

const router = express.Router();

// User routes (authenticated users)
router.patch('/profile', verifyToken, validateUpdateProfile, updateProfile);

// Admin routes (admin only)
router.get('/', verifyToken, requireAdmin, getAllUsers);
router.get('/stats', verifyToken, requireAdmin, getUserStats);
router.get('/:id', verifyToken, requireAdmin, getUserById);
router.patch('/:id/toggle-status', verifyToken, requireAdmin, toggleUserStatus);
router.delete('/:id', verifyToken, requireAdmin, deleteUser);

module.exports = router;