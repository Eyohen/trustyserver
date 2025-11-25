
// controllers/transcriptController.js
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;
const db = require('../models');
const { Transcript, User, Order } = db;
const { Op } = require('sequelize');

// Configure multer for file upload
const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    const uploadPath = path.join(__dirname, '../uploads/audio');
    try {
      await fs.mkdir(uploadPath, { recursive: true });
      cb(null, uploadPath);
    } catch (error) {
      cb(error);
    }
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const sanitizedOriginalName = file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_');
    cb(null, `${uniqueSuffix}-${sanitizedOriginalName}`);
  }
});

const fileFilter = (req, file, cb) => {
  const allowedTypes = ['.mp3', '.wav', '.m4a', '.aac', '.flac', '.ogg', '.mp4'];
  const ext = path.extname(file.originalname).toLowerCase();

  if (allowedTypes.includes(ext)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only audio/video files are allowed.'), false);
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 2 * 1024 * 1024 * 1024 // 2GB limit
  }
});

// Create transcript request
const createTranscript = async (req, res) => {
  try {
    const {
      title,
      speakers,
      turnaroundTime,
      timestampFrequency,
      isVerbatim,
      specialInstructions,
      orderId
    } = req.body;

    if (!req.file) {
      return res.status(400).json({ message: 'Audio file is required' });
    }

    // Verify order exists and belongs to user
    const order = await Order.findOne({
      where: {
        id: orderId,
        userId: req.user.userId,
        paymentStatus: 'paid'
      }
    });

    if (!order) {
      return res.status(404).json({ message: 'Valid paid order not found' });
    }

    // Check if order already has a transcript
    const existingTranscript = await Transcript.findOne({
      where: { orderId }
    });

    if (existingTranscript) {
      return res.status(400).json({ message: 'Order already has a transcript request' });
    }

    // Create transcript record
    const transcript = await Transcript.create({
      title,
      originalFileName: req.file.originalname,
      filePath: req.file.path,
      fileSize: req.file.size,
      fileType: req.file.mimetype,
      speakers: parseInt(speakers),
      turnaroundTime,
      timestampFrequency,
      isVerbatim: isVerbatim === 'true',
      specialInstructions,
      userId: req.user.userId,
      orderId,
      status: 'pending'
    });

    // Fetch complete transcript with associations
    const completeTranscript = await Transcript.findByPk(transcript.id, {
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['id', 'firstName', 'lastName', 'email']
        },
        {
          model: Order,
          as: 'order',
          attributes: ['id', 'orderNumber', 'amount', 'paymentStatus']
        }
      ]
    });

    res.status(201).json({
      message: 'Transcript request created successfully',
      transcript: completeTranscript
    });

  } catch (error) {
    console.error('Create transcript error:', error);
    
    // Clean up uploaded file if error occurs
    if (req.file) {
      try {
        await fs.unlink(req.file.path);
      } catch (unlinkError) {
        console.error('Failed to delete uploaded file:', unlinkError);
      }
    }

    res.status(500).json({
      message: 'Failed to create transcript request',
      error: error.message
    });
  }
};

// Get all transcripts (admin only)
const getAllTranscripts = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      status,
      userId,
      assignedTo,
      search,
      sortBy = 'createdAt',
      sortOrder = 'DESC'
    } = req.query;

    const offset = (page - 1) * limit;
    const where = {};

    // Apply filters
    if (status) where.status = status;
    if (userId) where.userId = userId;
    if (assignedTo) where.assignedTo = assignedTo;

    // Search functionality
    if (search) {
      where[Op.or] = [
        { title: { [Op.iLike]: `%${search}%` } },
        { originalFileName: { [Op.iLike]: `%${search}%` } }
      ];
    }

    const transcripts = await Transcript.findAndCountAll({
      where,
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['id', 'firstName', 'lastName', 'email']
        },
        {
          model: User,
          as: 'assignedAdmin',
          attributes: ['id', 'firstName', 'lastName'],
          required: false
        },
        {
          model: Order,
          as: 'order',
          attributes: ['id', 'orderNumber', 'amount']
        }
      ],
      order: [[sortBy, sortOrder]],
      limit: parseInt(limit),
      offset: parseInt(offset)
    });

    res.json({
      transcripts: transcripts.rows,
      pagination: {
        total: transcripts.count,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(transcripts.count / limit)
      }
    });

  } catch (error) {
    console.error('Get transcripts error:', error);
    res.status(500).json({
      message: 'Failed to get transcripts',
      error: error.message
    });
  }
};

// Get user's transcripts
const getUserTranscripts = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      status,
      sortBy = 'createdAt',
      sortOrder = 'DESC'
    } = req.query;

    const offset = (page - 1) * limit;
    const where = { userId: req.user.userId };

    if (status) where.status = status;

    const transcripts = await Transcript.findAndCountAll({
      where,
      include: [
        {
          model: Order,
          as: 'order',
          attributes: ['id', 'orderNumber', 'amount', 'paymentStatus']
        }
      ],
      order: [[sortBy, sortOrder]],
      limit: parseInt(limit),
      offset: parseInt(offset)
    });

    res.json({
      transcripts: transcripts.rows,
      pagination: {
        total: transcripts.count,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(transcripts.count / limit)
      }
    });

  } catch (error) {
    console.error('Get user transcripts error:', error);
    res.status(500).json({
      message: 'Failed to get user transcripts',
      error: error.message
    });
  }
};

// Get single transcript
const getTranscriptById = async (req, res) => {
  try {
    const { id } = req.params;
    const where = { id };

    // If not admin, only allow user to see their own transcripts
    if (req.user.role !== 'admin') {
      where.userId = req.user.userId;
    }

    const transcript = await Transcript.findOne({
      where,
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['id', 'firstName', 'lastName', 'email']
        },
        {
          model: User,
          as: 'assignedAdmin',
          attributes: ['id', 'firstName', 'lastName'],
          required: false
        },
        {
          model: Order,
          as: 'order',
          attributes: ['id', 'orderNumber', 'amount', 'specifications']
        }
      ]
    });

    if (!transcript) {
      return res.status(404).json({ message: 'Transcript not found' });
    }

    res.json({ transcript });

  } catch (error) {
    console.error('Get transcript error:', error);
    res.status(500).json({
      message: 'Failed to get transcript',
      error: error.message
    });
  }
};

// Update transcript status (admin only)
const updateTranscriptStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, transcriptContent, adminNotes, assignedTo } = req.body;

    const transcript = await Transcript.findByPk(id);
    if (!transcript) {
      return res.status(404).json({ message: 'Transcript not found' });
    }

    const updateData = { status };

    // Set timestamps based on status
    if (status === 'processing' && !transcript.startedAt) {
      updateData.startedAt = new Date();
      if (assignedTo) updateData.assignedTo = assignedTo;
      else updateData.assignedTo = req.user.userId;
    } else if (status === 'completed' && !transcript.completedAt) {
      updateData.completedAt = new Date();
      if (transcriptContent) updateData.transcriptContent = transcriptContent;
    } else if (status === 'delivered' && !transcript.deliveredAt) {
      updateData.deliveredAt = new Date();
    }

    if (adminNotes !== undefined) updateData.adminNotes = adminNotes;

    await transcript.update(updateData);

    // Fetch updated transcript
    const updatedTranscript = await Transcript.findByPk(id, {
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['id', 'firstName', 'lastName', 'email']
        },
        {
          model: User,
          as: 'assignedAdmin',
          attributes: ['id', 'firstName', 'lastName']
        }
      ]
    });

    // Send email notification when transcript is completed
    if (status === 'completed') {
      // TODO: Send email notification to user
      console.log(`Transcript ${id} completed for user ${transcript.userId}`);
    }

    res.json({
      message: 'Transcript status updated successfully',
      transcript: updatedTranscript
    });

  } catch (error) {
    console.error('Update transcript status error:', error);
    res.status(500).json({
      message: 'Failed to update transcript status',
      error: error.message
    });
  }
};

// Download transcript file
const downloadTranscript = async (req, res) => {
  try {
    const { id } = req.params;
    const where = { id, status: 'completed' };

    // If not admin, only allow user to download their own transcripts
    if (req.user.role !== 'admin') {
      where.userId = req.user.userId;
    }

    const transcript = await Transcript.findOne({ where });

    if (!transcript) {
      return res.status(404).json({ message: 'Transcript not found or not completed' });
    }

    // Check if transcript file was uploaded by admin
    if (transcript.transcriptFilePath) {
      const filePath = transcript.transcriptFilePath;

      // Check if file exists
      try {
        await fs.access(filePath);
      } catch (err) {
        return res.status(404).json({ message: 'Transcript file not found on server' });
      }

      // Download the file
      return res.download(filePath, `${transcript.title}_transcript${path.extname(filePath)}`);
    }

    // Fall back to text content stored in database
    if (!transcript.transcriptContent) {
      return res.status(400).json({ message: 'Transcript content not available' });
    }

    // Set response headers for text download
    res.setHeader('Content-Type', 'text/plain');
    res.setHeader('Content-Disposition', `attachment; filename="${transcript.title}_transcript.txt"`);

    res.send(transcript.transcriptContent);

  } catch (error) {
    console.error('Download transcript error:', error);
    res.status(500).json({
      message: 'Failed to download transcript',
      error: error.message
    });
  }
};

// Get transcript statistics
const getTranscriptStats = async (req, res) => {
  try {
    const stats = await Promise.all([
      Transcript.count(),
      Transcript.count({ where: { status: 'pending' } }),
      Transcript.count({ where: { status: 'processing' } }),
      Transcript.count({ where: { status: 'completed' } }),
      Transcript.count({ where: { status: 'delivered' } }),
      Transcript.sum('fileSize') || 0,
      Transcript.findAll({
        attributes: [
          'turnaroundTime',
          [db.sequelize.fn('COUNT', db.sequelize.col('id')), 'count']
        ],
        group: ['turnaroundTime']
      })
    ]);

    const turnaroundStats = stats[6].reduce((acc, item) => {
      acc[item.turnaroundTime] = parseInt(item.dataValues.count);
      return acc;
    }, {});

    res.json({
      stats: {
        total: stats[0],
        pending: stats[1],
        processing: stats[2],
        completed: stats[3],
        delivered: stats[4],
        totalFileSize: stats[5],
        turnaroundBreakdown: turnaroundStats
      }
    });

  } catch (error) {
    console.error('Get transcript stats error:', error);
    res.status(500).json({
      message: 'Failed to get transcript statistics',
      error: error.message
    });
  }
};

// Delete transcript (admin only or user for pending transcripts)
const deleteTranscript = async (req, res) => {
  try {
    const { id } = req.params;
    
    const transcript = await Transcript.findByPk(id);
    if (!transcript) {
      return res.status(404).json({ message: 'Transcript not found' });
    }

    // Check permissions
    const isAdmin = req.user.role === 'admin';
    const isOwner = transcript.userId === req.user.userId;
    const isPending = transcript.status === 'pending';

    if (!isAdmin && (!isOwner || !isPending)) {
      return res.status(403).json({ 
        message: 'You can only delete your own pending transcripts' 
      });
    }

    // Delete the audio file
    try {
      await fs.unlink(transcript.filePath);
    } catch (unlinkError) {
      console.warn('Could not delete audio file:', unlinkError.message);
    }

    await transcript.destroy();

    res.json({ message: 'Transcript deleted successfully' });

  } catch (error) {
    console.error('Delete transcript error:', error);
    res.status(500).json({
      message: 'Failed to delete transcript',
      error: error.message
    });
  }
};

module.exports = {
  upload,
  createTranscript,
  getAllTranscripts,
  getUserTranscripts,
  getTranscriptById,
  updateTranscriptStatus,
  downloadTranscript,
  getTranscriptStats,
  deleteTranscript
};