
// routes/admin.js
const express = require('express');
const {
  getDashboardAnalytics,
  getSystemStats,
  getActivityFeed
} = require('../controller/admin');
const { verifyToken, requireAdmin } = require('../middleware/auth');

const router = express.Router();

// All admin routes require authentication and admin role
router.use(verifyToken, requireAdmin);

// Dashboard routes
router.get('/analytics', getDashboardAnalytics);
router.get('/stats', getSystemStats);
router.get('/activity', getActivityFeed);

module.exports = router;
