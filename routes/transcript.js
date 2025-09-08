
// routes/transcriptRoutes.js
const express = require('express');
const {
  upload,
  createTranscript,
  getAllTranscripts,
  getUserTranscripts,
  getTranscriptById,
  updateTranscriptStatus,
  downloadTranscript,
  getTranscriptStats,
  deleteTranscript
} = require('../controller/transcript');
const { verifyToken, requireAdmin } = require('../middleware/auth');
const { validateTranscript, validateTranscriptStatus } = require('../middleware/validation');

const router = express.Router();

// Public routes
router.get('/stats', getTranscriptStats);

// User routes (authenticated users)
router.post('/', verifyToken, upload.single('audioFile'), validateTranscript, createTranscript);
router.get('/my-transcripts', verifyToken, getUserTranscripts);
router.get('/:id', verifyToken, getTranscriptById);
router.get('/:id/download', verifyToken, downloadTranscript);
router.delete('/:id', verifyToken, deleteTranscript);

// Admin routes (admin only)
router.get('/', verifyToken, requireAdmin, getAllTranscripts);
router.patch('/:id/status', verifyToken, requireAdmin, validateTranscriptStatus, updateTranscriptStatus);

module.exports = router;