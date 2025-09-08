// controllers/orderController.js
const crypto = require('crypto');
const db = require('../models');
const { Order, User, Transcript } = db;
const { Op } = require('sequelize');

// Calculate pricing based on specifications
const calculatePrice = (specifications) => {
  const { duration, speakers, turnaroundTime, timestampFrequency, isVerbatim } = specifications;

  // Base rates per minute
  const baseRates = {
    '3days': 0.9,
    '1.5days': 1.2,
    '6-12hrs': 1.5
  };

  let rate = baseRates[turnaroundTime] || 0.9;

  // Speaker multiplier
  if (speakers >= 3) {
    rate += 0.35;
  }

  // Timestamp multiplier
  const timestampRates = {
    'speaker': 0.3,
    '2min': 0.2,
    '30sec': 0.4,
    '10sec': 0.6
  };

  rate += timestampRates[timestampFrequency] || 0.3;

  // Verbatim multiplier
  if (isVerbatim) {
    rate += 0.2;
  }

  // Calculate total (duration in minutes * rate * 60 for NGN conversion)
  const totalPrice = Math.ceil((duration / 60) * rate * 60);

  return {
    rate: parseFloat(rate.toFixed(2)),
    totalPrice,
    breakdown: {
      baseRate: baseRates[turnaroundTime],
      speakerMultiplier: speakers >= 3 ? 0.35 : 0,
      timestampMultiplier: timestampRates[timestampFrequency] || 0.3,
      verbatimMultiplier: isVerbatim ? 0.2 : 0,
      finalRate: rate
    }
  };
};

// Create order (before payment)
const createOrder = async (req, res) => {
  try {
    const {
      duration, // in minutes
      speakers,
      turnaroundTime,
      timestampFrequency,
      isVerbatim,
      customerInfo
    } = req.body;

    // Validate required fields
    if (!duration || !speakers || !turnaroundTime || !timestampFrequency || !customerInfo) {
      return res.status(400).json({ message: 'Missing required fields' });
    }

    const specifications = {
      duration: parseInt(duration),
      speakers: parseInt(speakers),
      turnaroundTime,
      timestampFrequency,
      isVerbatim: isVerbatim === true || isVerbatim === 'true'
    };

    // Calculate pricing
    const pricing = calculatePrice(specifications);

    // Generate unique payment reference
    const paymentReference = `TT-${Date.now()}-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;

    // Create order
    const order = await Order.create({
      userId: req.user.userId,
      amount: pricing.totalPrice,
      currency: 'NGN',
      paymentReference,
      specifications,
      customerInfo,
      pricing,
      paymentStatus: 'pending'
    });

    res.status(201).json({
      message: 'Order created successfully',
      order,
      pricing,
      paymentReference
    });

  } catch (error) {
    console.error('Create order error:', error);
    res.status(500).json({
      message: 'Failed to create order',
      error: error.message
    });
  }
};

// Verify payment (called from frontend after Paystack payment)
const verifyPayment = async (req, res) => {
  try {
    const { paymentReference, paystackReference, paymentData } = req.body;

    if (!paymentReference || !paystackReference) {
      return res.status(400).json({ message: 'Payment reference and Paystack reference are required' });
    }

    const order = await Order.findOne({
      where: { 
        paymentReference,
        userId: req.user.userId,
        paymentStatus: 'pending'
      }
    });

    if (!order) {
      return res.status(404).json({ message: 'Order not found or already processed' });
    }

    // Since payment verification happens on frontend with Paystack inline,
    // we trust the frontend verification and update the order
    await order.update({
      paymentStatus: 'paid',
      paystackReference,
      paidAt: new Date(),
      paymentMethod: paymentData?.channel || 'card' // from Paystack response
    });

    // Fetch updated order with user info
    const updatedOrder = await Order.findByPk(order.id, {
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['id', 'firstName', 'lastName', 'email']
        }
      ]
    });

    res.json({
      message: 'Payment verified successfully',
      order: updatedOrder
    });

  } catch (error) {
    console.error('Verify payment error:', error);
    res.status(500).json({
      message: 'Failed to verify payment',
      error: error.message
    });
  }
};

// Get user orders
const getUserOrders = async (req, res) => {
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

    if (status) where.paymentStatus = status;

    const orders = await Order.findAndCountAll({
      where,
      include: [
        {
          model: Transcript,
          as: 'transcript',
          attributes: ['id', 'title', 'status', 'completedAt', 'estimatedDelivery'],
          required: false
        }
      ],
      order: [[sortBy, sortOrder]],
      limit: parseInt(limit),
      offset: parseInt(offset)
    });

    res.json({
      orders: orders.rows,
      pagination: {
        total: orders.count,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(orders.count / limit)
      }
    });

  } catch (error) {
    console.error('Get user orders error:', error);
    res.status(500).json({
      message: 'Failed to get user orders',
      error: error.message
    });
  }
};

// Get single order
const getOrderById = async (req, res) => {
  try {
    const { id } = req.params;
    const where = { id };

    // If not admin, only allow user to see their own orders
    if (req.user.role !== 'admin') {
      where.userId = req.user.userId;
    }

    const order = await Order.findOne({
      where,
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['id', 'firstName', 'lastName', 'email']
        },
        {
          model: Transcript,
          as: 'transcript',
          attributes: ['id', 'title', 'status', 'completedAt', 'estimatedDelivery']
        }
      ]
    });

    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    res.json({ order });

  } catch (error) {
    console.error('Get order error:', error);
    res.status(500).json({
      message: 'Failed to get order',
      error: error.message
    });
  }
};

// Get all orders (admin only)
const getAllOrders = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      status,
      userId,
      search,
      sortBy = 'createdAt',
      sortOrder = 'DESC',
      startDate,
      endDate
    } = req.query;

    const offset = (page - 1) * limit;
    const where = {};

    // Apply filters
    if (status) where.paymentStatus = status;
    if (userId) where.userId = userId;

    // Date range filter
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt[Op.gte] = new Date(startDate);
      if (endDate) where.createdAt[Op.lte] = new Date(endDate);
    }

    // Search functionality
    if (search) {
      where[Op.or] = [
        { orderNumber: { [Op.iLike]: `%${search}%` } },
        { paymentReference: { [Op.iLike]: `%${search}%` } },
        { paystackReference: { [Op.iLike]: `%${search}%` } }
      ];
    }

    const orders = await Order.findAndCountAll({
      where,
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['id', 'firstName', 'lastName', 'email']
        },
        {
          model: Transcript,
          as: 'transcript',
          attributes: ['id', 'title', 'status']
        }
      ],
      order: [[sortBy, sortOrder]],
      limit: parseInt(limit),
      offset: parseInt(offset)
    });

    res.json({
      orders: orders.rows,
      pagination: {
        total: orders.count,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(orders.count / limit)
      }
    });

  } catch (error) {
    console.error('Get orders error:', error);
    res.status(500).json({
      message: 'Failed to get orders',
      error: error.message
    });
  }
};

// Get pricing calculation (public endpoint)
const getPricing = async (req, res) => {
  try {
    const { duration, speakers, turnaroundTime, timestampFrequency, isVerbatim } = req.query;

    if (!duration || !speakers || !turnaroundTime || !timestampFrequency) {
      return res.status(400).json({ message: 'Missing required parameters' });
    }

    const specifications = {
      duration: parseInt(duration),
      speakers: parseInt(speakers),
      turnaroundTime,
      timestampFrequency,
      isVerbatim: isVerbatim === 'true'
    };

    const pricing = calculatePrice(specifications);

    res.json({
      specifications,
      pricing
    });

  } catch (error) {
    console.error('Get pricing error:', error);
    res.status(500).json({
      message: 'Failed to calculate pricing',
      error: error.message
    });
  }
};

// Get order statistics (admin only)
const getOrderStats = async (req, res) => {
  try {
    const { period = '30' } = req.query;
    const days = parseInt(period);
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const [
      totalOrders,
      paidOrders,
      pendingOrders,
      failedOrders,
      totalRevenue,
      recentRevenue
    ] = await Promise.all([
      Order.count(),
      Order.count({ where: { paymentStatus: 'paid' } }),
      Order.count({ where: { paymentStatus: 'pending' } }),
      Order.count({ where: { paymentStatus: 'failed' } }),
      Order.sum('amount', { where: { paymentStatus: 'paid' } }) || 0,
      Order.sum('amount', {
        where: {
          paymentStatus: 'paid',
          createdAt: { [Op.gte]: startDate }
        }
      }) || 0
    ]);

    res.json({
      stats: {
        totalOrders,
        paidOrders,
        pendingOrders,
        failedOrders,
        totalRevenue: parseFloat(totalRevenue),
        recentRevenue: parseFloat(recentRevenue)
      }
    });

  } catch (error) {
    console.error('Get order stats error:', error);
    res.status(500).json({
      message: 'Failed to get order statistics',
      error: error.message
    });
  }
};

// Update order status (admin only)
const updateOrderStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, adminNotes } = req.body;

    const order = await Order.findByPk(id);
    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    await order.update({ 
      paymentStatus: status,
      adminNotes 
    });

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
      message: 'Order status updated successfully',
      order: updatedOrder
    });

  } catch (error) {
    console.error('Update order status error:', error);
    res.status(500).json({
      message: 'Failed to update order status',
      error: error.message
    });
  }
};

module.exports = {
  createOrder,
  verifyPayment,
  getUserOrders,
  getOrderById,
  getAllOrders,
  getPricing,
  getOrderStats,
  updateOrderStatus,
  calculatePrice
};