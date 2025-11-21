// controller/admin.js
const db = require('../models');
const { User, Transcript, Order } = db;
const { Op } = require('sequelize');
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;

// Dashboard analytics
const getDashboardAnalytics = async (req, res) => {
  try {
    const [
      totalUsers,
      totalTranscripts,
      totalOrders,
      totalRevenue,
      pendingTranscripts,
      processingTranscripts,
      completedTranscripts,
      recentOrders,
      recentTranscripts,
      monthlyStats
    ] = await Promise.all([
      // Basic counts
      User.count({ where: { role: 'user' } }),
      Transcript.count(),
      Order.count(),
      Order.sum('amount', { where: { paymentStatus: 'paid' } }) || 0,
      
      // Transcript status counts
      Transcript.count({ where: { status: 'pending' } }),
      Transcript.count({ where: { status: 'processing' } }),
      Transcript.count({ where: { status: 'completed' } }),
      
      // Recent activity
      Order.findAll({
        limit: 5,
        order: [['createdAt', 'DESC']],
        include: [
          {
            model: User,
            as: 'user',
            attributes: ['firstName', 'lastName', 'email']
          }
        ],
        attributes: ['id', 'orderNumber', 'amount', 'paymentStatus', 'createdAt']
      }),
      
      Transcript.findAll({
        limit: 5,
        order: [['createdAt', 'DESC']],
        include: [
          {
            model: User,
            as: 'user',
            attributes: ['firstName', 'lastName', 'email']
          }
        ],
        attributes: ['id', 'title', 'status', 'createdAt']
      }),

      // Monthly statistics (last 6 months)
      Order.findAll({
        attributes: [
          [db.sequelize.fn('DATE_TRUNC', 'month', db.sequelize.col('createdAt')), 'month'],
          [db.sequelize.fn('SUM', db.sequelize.col('amount')), 'revenue'],
          [db.sequelize.fn('COUNT', db.sequelize.col('id')), 'orders']
        ],
        where: {
          paymentStatus: 'paid',
          createdAt: {
            [Op.gte]: new Date(new Date().setMonth(new Date().getMonth() - 6))
          }
        },
        group: [db.sequelize.fn('DATE_TRUNC', 'month', db.sequelize.col('createdAt'))],
        order: [[db.sequelize.fn('DATE_TRUNC', 'month', db.sequelize.col('createdAt')), 'ASC']]
      })
    ]);

    res.json({
      analytics: {
        overview: {
          totalUsers,
          totalTranscripts,
          totalOrders,
          totalRevenue: parseFloat(totalRevenue)
        },
        transcriptStatus: {
          pending: pendingTranscripts,
          processing: processingTranscripts,
          completed: completedTranscripts
        },
        recentActivity: {
          orders: recentOrders,
          transcripts: recentTranscripts
        },
        monthlyStats: monthlyStats.map(stat => ({
          month: stat.dataValues.month,
          revenue: parseFloat(stat.dataValues.revenue),
          orders: parseInt(stat.dataValues.orders)
        }))
      }
    });

  } catch (error) {
    console.error('Get dashboard analytics error:', error);
    res.status(500).json({
      message: 'Failed to get dashboard analytics',
      error: error.message
    });
  }
};

// System statistics with date ranges
const getSystemStats = async (req, res) => {
  try {
    const { period = '30' } = req.query;
    const days = parseInt(period);
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const [
      // User stats
      totalUsers,
      newUsers,
      activeUsers,
      
      // Transcript stats
      totalTranscripts,
      newTranscripts,
      completedTranscripts,
      
      // Revenue stats
      totalRevenue,
      newRevenue,
      
      // Performance metrics
      avgProcessingTime,
      customerSatisfaction
    ] = await Promise.all([
      User.count({ where: { role: 'user' } }),
      User.count({
        where: {
          role: 'user',
          createdAt: { [Op.gte]: startDate }
        }
      }),
      User.count({
        where: {
          role: 'user',
          isActive: true,
          lastLogin: { [Op.gte]: startDate }
        }
      }),
      
      Transcript.count(),
      Transcript.count({
        where: { createdAt: { [Op.gte]: startDate } }
      }),
      Transcript.count({
        where: {
          status: 'completed',
          completedAt: { [Op.gte]: startDate }
        }
      }),
      
      Order.sum('amount', { where: { paymentStatus: 'paid' } }) || 0,
      Order.sum('amount', {
        where: {
          paymentStatus: 'paid',
          createdAt: { [Op.gte]: startDate }
        }
      }) || 0,
      
      // Average processing time (in hours)
      Transcript.findAll({
        attributes: [
          [db.sequelize.fn('AVG', 
            db.sequelize.literal('EXTRACT(EPOCH FROM ("completedAt" - "startedAt")) / 3600')
          ), 'avgHours']
        ],
        where: {
          status: 'completed',
          startedAt: { [Op.not]: null },
          completedAt: { [Op.not]: null }
        }
      }),
      
      // Placeholder for customer satisfaction - you can implement this based on ratings
      95.5
    ]);

    const avgHours = avgProcessingTime[0]?.dataValues.avgHours || 0;

    res.json({
      stats: {
        users: {
          total: totalUsers,
          new: newUsers,
          active: activeUsers,
          growth: totalUsers > 0 ? ((newUsers / totalUsers) * 100).toFixed(1) : '0'
        },
        transcripts: {
          total: totalTranscripts,
          new: newTranscripts,
          completed: completedTranscripts,
          growth: totalTranscripts > 0 ? ((newTranscripts / totalTranscripts) * 100).toFixed(1) : '0'
        },
        revenue: {
          total: parseFloat(totalRevenue),
          new: parseFloat(newRevenue),
          growth: totalRevenue > 0 ? ((newRevenue / totalRevenue) * 100).toFixed(1) : '0'
        },
        performance: {
          avgProcessingTime: parseFloat(avgHours).toFixed(1),
          customerSatisfaction: customerSatisfaction
        }
      }
    });

  } catch (error) {
    console.error('Get system stats error:', error);
    res.status(500).json({
      message: 'Failed to get system statistics',
      error: error.message
    });
  }
};

// Activity feed for admin dashboard
const getActivityFeed = async (req, res) => {
  try {
    const { limit = 20 } = req.query;

    // Get recent orders
    const recentOrders = await Order.findAll({
      limit: parseInt(limit) / 2,
      order: [['createdAt', 'DESC']],
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['firstName', 'lastName', 'email']
        }
      ],
      attributes: ['id', 'orderNumber', 'amount', 'paymentStatus', 'createdAt']
    });

    // Get recent transcript updates
    const recentTranscripts = await Transcript.findAll({
      limit: parseInt(limit) / 2,
      order: [['updatedAt', 'DESC']],
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['firstName', 'lastName', 'email']
        }
      ],
      attributes: ['id', 'title', 'status', 'updatedAt']
    });

    // Combine and sort by timestamp
    const activities = [
      ...recentOrders.map(order => ({
        type: 'order',
        id: order.id,
        title: `New order ${order.orderNumber}`,
        description: `$${order.amount} - ${order.paymentStatus}`,
        user: order.user,
        timestamp: order.createdAt
      })),
      ...recentTranscripts.map(transcript => ({
        type: 'transcript',
        id: transcript.id,
        title: `Transcript updated: ${transcript.title}`,
        description: `Status: ${transcript.status}`,
        user: transcript.user,
        timestamp: transcript.updatedAt
      }))
    ].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
     .slice(0, parseInt(limit));

    res.json({ activities });

  } catch (error) {
    console.error('Get activity feed error:', error);
    res.status(500).json({
      message: 'Failed to get activity feed',
      error: error.message
    });
  }
};

// Get all orders with pagination and filters
const getAllOrders = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      status,
      sortBy = 'createdAt',
      sortOrder = 'DESC'
    } = req.query;

    const offset = (parseInt(page) - 1) * parseInt(limit);

    const where = {};
    if (status) {
      where.paymentStatus = status;
    }

    const { count, rows: orders } = await Order.findAndCountAll({
      where,
      limit: parseInt(limit),
      offset,
      order: [[sortBy, sortOrder]],
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['id', 'firstName', 'lastName', 'email', 'phone']
        },
        {
          model: Transcript,
          as: 'transcript',
          attributes: ['id', 'title', 'status', 'originalFileName']
        }
      ]
    });

    res.json({
      orders,
      pagination: {
        total: count,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(count / parseInt(limit))
      }
    });

  } catch (error) {
    console.error('Get all orders error:', error);
    res.status(500).json({
      message: 'Failed to get orders',
      error: error.message
    });
  }
};

// Get all transcripts with pagination and filters
const getAllTranscripts = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      status,
      sortBy = 'createdAt',
      sortOrder = 'DESC'
    } = req.query;

    const offset = (parseInt(page) - 1) * parseInt(limit);

    const where = {};
    if (status) {
      where.status = status;
    }

    const { count, rows: transcripts } = await Transcript.findAndCountAll({
      where,
      limit: parseInt(limit),
      offset,
      order: [[sortBy, sortOrder]],
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['id', 'firstName', 'lastName', 'email', 'phone']
        },
        {
          model: Order,
          as: 'order',
          attributes: ['id', 'orderNumber', 'paymentStatus', 'amount']
        },
        {
          model: User,
          as: 'assignedAdmin',
          attributes: ['id', 'firstName', 'lastName', 'email']
        }
      ]
    });

    res.json({
      transcripts,
      pagination: {
        total: count,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(count / parseInt(limit))
      }
    });

  } catch (error) {
    console.error('Get all transcripts error:', error);
    res.status(500).json({
      message: 'Failed to get transcripts',
      error: error.message
    });
  }
};

// Get all users with pagination
const getAllUsers = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      role,
      sortBy = 'createdAt',
      sortOrder = 'DESC'
    } = req.query;

    const offset = (parseInt(page) - 1) * parseInt(limit);

    const where = {};
    if (role) {
      where.role = role;
    }

    const { count, rows: users } = await User.findAndCountAll({
      where,
      limit: parseInt(limit),
      offset,
      order: [[sortBy, sortOrder]],
      attributes: { exclude: ['password'] },
      include: [
        {
          model: Order,
          as: 'orders',
          attributes: ['id', 'orderNumber', 'amount', 'paymentStatus']
        },
        {
          model: Transcript,
          as: 'transcripts',
          attributes: ['id', 'title', 'status']
        }
      ]
    });

    res.json({
      users,
      pagination: {
        total: count,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(count / parseInt(limit))
      }
    });

  } catch (error) {
    console.error('Get all users error:', error);
    res.status(500).json({
      message: 'Failed to get users',
      error: error.message
    });
  }
};

// Update transcript status and assign to admin
const updateTranscriptStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, assignedTo, adminNotes, transcriptContent } = req.body;

    const transcript = await Transcript.findByPk(id);

    if (!transcript) {
      return res.status(404).json({ message: 'Transcript not found' });
    }

    // Update fields
    if (status) transcript.status = status;
    if (assignedTo !== undefined) transcript.assignedTo = assignedTo;
    if (adminNotes !== undefined) transcript.adminNotes = adminNotes;
    if (transcriptContent !== undefined) transcript.transcriptContent = transcriptContent;

    // Update timestamps based on status
    if (status === 'processing' && !transcript.startedAt) {
      transcript.startedAt = new Date();
    } else if (status === 'completed' && !transcript.completedAt) {
      transcript.completedAt = new Date();
    } else if (status === 'delivered' && !transcript.deliveredAt) {
      transcript.deliveredAt = new Date();
    }

    await transcript.save();

    // Fetch updated transcript with relationships
    const updatedTranscript = await Transcript.findByPk(id, {
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['id', 'firstName', 'lastName', 'email']
        },
        {
          model: Order,
          as: 'order',
          attributes: ['id', 'orderNumber', 'paymentStatus']
        }
      ]
    });

    res.json({
      message: 'Transcript updated successfully',
      transcript: updatedTranscript
    });

  } catch (error) {
    console.error('Update transcript status error:', error);
    res.status(500).json({
      message: 'Failed to update transcript',
      error: error.message
    });
  }
};

// Update order status
const updateOrderStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { paymentStatus, adminNotes } = req.body;

    const order = await Order.findByPk(id);

    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    if (paymentStatus) order.paymentStatus = paymentStatus;
    if (adminNotes !== undefined) order.adminNotes = adminNotes;

    if (paymentStatus === 'paid' && !order.paidAt) {
      order.paidAt = new Date();
    }

    await order.save();

    const updatedOrder = await Order.findByPk(id, {
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['id', 'firstName', 'lastName', 'email']
        }
      ]
    });

    res.json({
      message: 'Order updated successfully',
      order: updatedOrder
    });

  } catch (error) {
    console.error('Update order status error:', error);
    res.status(500).json({
      message: 'Failed to update order',
      error: error.message
    });
  }
};

// Configure multer for completed transcript uploads
const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    const uploadPath = path.join(__dirname, '../uploads/completed');
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
  const allowedTypes = ['.pdf', '.docx', '.doc', '.txt'];
  const ext = path.extname(file.originalname).toLowerCase();

  if (allowedTypes.includes(ext)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only PDF, DOCX, DOC, and TXT files are allowed.'), false);
  }
};

const uploadCompletedFile = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 50 * 1024 * 1024 // 50MB limit
  }
}).single('file');

// Upload completed transcript file
const uploadTranscriptFile = async (req, res) => {
  try {
    uploadCompletedFile(req, res, async (err) => {
      if (err) {
        return res.status(400).json({
          message: err.message || 'File upload failed',
          error: err.code
        });
      }

      if (!req.file) {
        return res.status(400).json({ message: 'File is required' });
      }

      const { id } = req.params;
      const transcript = await Transcript.findByPk(id);

      if (!transcript) {
        return res.status(404).json({ message: 'Transcript not found' });
      }

      // Update transcript with file path
      transcript.transcriptFilePath = req.file.path;
      transcript.status = 'completed';

      if (!transcript.completedAt) {
        transcript.completedAt = new Date();
      }

      await transcript.save();

      res.json({
        message: 'Transcript file uploaded successfully',
        transcript: {
          id: transcript.id,
          transcriptFilePath: transcript.transcriptFilePath,
          status: transcript.status
        }
      });
    });

  } catch (error) {
    console.error('Upload transcript file error:', error);
    res.status(500).json({
      message: 'Failed to upload transcript file',
      error: error.message
    });
  }
};

// Download transcript file (for admin)
const downloadTranscriptFile = async (req, res) => {
  try {
    const { id } = req.params;

    const transcript = await Transcript.findByPk(id);

    if (!transcript) {
      return res.status(404).json({ message: 'Transcript not found' });
    }

    if (!transcript.transcriptFilePath) {
      return res.status(404).json({ message: 'Transcript file not found' });
    }

    const filePath = transcript.transcriptFilePath;

    // Check if file exists
    try {
      await fs.access(filePath);
    } catch (err) {
      return res.status(404).json({ message: 'File not found on server' });
    }

    res.download(filePath, transcript.originalFileName || 'transcript.pdf');

  } catch (error) {
    console.error('Download transcript file error:', error);
    res.status(500).json({
      message: 'Failed to download transcript file',
      error: error.message
    });
  }
};

// Download original audio file (for admin)
const downloadAudioFile = async (req, res) => {
  try {
    const { id } = req.params;

    const transcript = await Transcript.findByPk(id);

    if (!transcript) {
      return res.status(404).json({ message: 'Transcript not found' });
    }

    if (!transcript.filePath) {
      return res.status(404).json({ message: 'Audio file not found' });
    }

    const filePath = transcript.filePath;

    // Check if file exists
    try {
      await fs.access(filePath);
    } catch (err) {
      return res.status(404).json({ message: 'File not found on server' });
    }

    res.download(filePath, transcript.originalFileName || 'audio.mp3');

  } catch (error) {
    console.error('Download audio file error:', error);
    res.status(500).json({
      message: 'Failed to download audio file',
      error: error.message
    });
  }
};

module.exports = {
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
};
