// routes/orderRoutes.js
const express = require('express');
const {
  createOrder,
  verifyPayment,
  getUserOrders,
  getOrderById,
  getAllOrders,
  getPricing,
  getOrderStats,
  updateOrderStatus
} = require('../controller/order');
const { verifyToken, requireAdmin } = require('../middleware/auth');
const { 
  validateOrder, 
  validatePaymentVerification,
  validatePagination 
} = require('../middleware/validation');

const router = express.Router();

// Public routes
router.get('/pricing', getPricing);

// User routes (authenticated users)
router.post('/create', verifyToken, validateOrder, createOrder);
router.post('/verify-payment', verifyToken, validatePaymentVerification, verifyPayment);
router.get('/my-orders', verifyToken, validatePagination, getUserOrders);
router.get('/:id', verifyToken, getOrderById);

// Admin routes (admin only)
router.get('/', verifyToken, requireAdmin, validatePagination, getAllOrders);
router.get('/stats/overview', verifyToken, requireAdmin, getOrderStats);
router.patch('/:id/status', verifyToken, requireAdmin, updateOrderStatus);

module.exports = router;