
// routes/admin.js
const express = require('express');
const {
  getDashboardAnalytics,
  getSystemStats,
  getActivityFeed,
  getAllOrders,
  getAllTranscripts,
  getAllUsers,
  updateTranscriptStatus,
  updateOrderStatus,
  uploadTranscriptFile,
  downloadTranscriptFile,
  downloadAudioFile
} = require('../controller/admin');
const { verifyToken, requireAdmin } = require('../middleware/auth');

const router = express.Router();

// All admin routes require authentication and admin role
router.use(verifyToken, requireAdmin);

// Dashboard routes
router.get('/analytics', getDashboardAnalytics);
router.get('/stats', getSystemStats);
router.get('/activity', getActivityFeed);

// Data management routes
router.get('/orders', getAllOrders);
router.get('/transcripts', getAllTranscripts);
router.get('/users', getAllUsers);

// Update routes
router.patch('/transcripts/:id', updateTranscriptStatus);
router.patch('/orders/:id', updateOrderStatus);

// File management routes
router.post('/transcripts/:id/upload', uploadTranscriptFile);
router.get('/transcripts/:id/download', downloadTranscriptFile);
router.get('/transcripts/:id/audio', downloadAudioFile);

module.exports = router;
