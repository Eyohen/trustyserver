// controller/admin.js
const db = require('../models');
const { User, Transcript, Order } = db;
const { Op } = require('sequelize');

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
        description: `₦${order.amount} - ${order.paymentStatus}`,
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

module.exports = {
  getDashboardAnalytics,
  getSystemStats,
  getActivityFeed
};
