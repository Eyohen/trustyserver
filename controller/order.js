// controllers/orderController.js
const crypto = require('crypto');
const https = require('https');
const db = require('../models');
const { Order, User, Transcript } = db;
const { Op } = require('sequelize');

// Calculate pricing based on specifications
const calculatePrice = (specifications) => {
  const { duration, speakers, turnaroundTime, timestampFrequency, isVerbatim } = specifications;

  // Round up duration to nearest minute (as per new calculation)
  const roundedDuration = Math.ceil(duration);

  // Base rates per minute based on verbatim type, speakers, and turnaround
  let rate = 0;

  if (!isVerbatim) {
    // CLEAN VERBATIM
    if (speakers === 2) {
      const cleanVerbatim2Speakers = {
        '3days': 0.9,
        '1.5days': 1.2,
        '6-12hrs': 1.5
      };
      rate = cleanVerbatim2Speakers[turnaroundTime] || 0.9;
    } else if (speakers >= 3) {
      const cleanVerbatim3Speakers = {
        '3days': 1.25,
        '1.5days': 1.6,
        '6-12hrs': 1.95
      };
      rate = cleanVerbatim3Speakers[turnaroundTime] || 1.25;
    }
  } else {
    // FULL VERBATIM
    if (speakers === 2) {
      const fullVerbatim2Speakers = {
        '3days': 1.2,
        '1.5days': 1.5,
        '6-12hrs': 1.8
      };
      rate = fullVerbatim2Speakers[turnaroundTime] || 1.2;
    } else if (speakers >= 3) {
      const fullVerbatim3Speakers = {
        '3days': 1.6,
        '1.5days': 1.95,
        '6-12hrs': 2.3
      };
      rate = fullVerbatim3Speakers[turnaroundTime] || 1.6;
    }
  }

  let breakdown = {
    baseRate: rate,
    timestampMultiplier: 0
  };

  // Timestamp frequency modifier
  const timestampRates = {
    'none': 0.0,
    'speaker': 0.3,
    '2min': 0.2,
    '30sec': 0.4,
    '10sec': 0.6
  };

  const timestampMod = timestampRates[timestampFrequency] || 0.0;
  rate += timestampMod;
  breakdown.timestampMultiplier = timestampMod;

  breakdown.finalRate = parseFloat(rate.toFixed(2));

  // Calculate total price (rounded duration in minutes * rate per minute)
  const totalPrice = parseFloat((roundedDuration * rate).toFixed(2));

  return {
    rate: parseFloat(rate.toFixed(2)),
    totalPrice,
    breakdown
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

    // Validate Paystack minimum transaction amount ($2.00 USD)
    if (pricing.totalPrice < 2.00) {
      return res.status(400).json({
        message: 'Minimum transaction amount is $2.00 USD. Please increase your order duration or select additional options.',
        minimumAmount: 2.00,
        currentAmount: pricing.totalPrice
      });
    }

    // Generate unique payment reference
    const paymentReference = `TT-${Date.now()}-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;

    // Generate order number
    const timestamp = Date.now().toString();
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    const orderNumber = `TT-${timestamp.slice(-6)}${random}`;

    // Create order
    const order = await Order.create({
      userId: req.user.userId,
      orderNumber,
      amount: pricing.totalPrice,
      currency: 'USD',
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

// Verify payment with Paystack API (called from frontend after Paystack payment)
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

    // Verify payment with Paystack API
    const paystackSecretKey = process.env.PAYSTACK_SECRET_KEY;

    if (!paystackSecretKey) {
      console.error('PAYSTACK_SECRET_KEY not configured');
      return res.status(500).json({ message: 'Payment verification not properly configured' });
    }

    // Make request to Paystack verification endpoint
    const paystackVerification = await new Promise((resolve, reject) => {
      const options = {
        hostname: 'api.paystack.co',
        port: 443,
        path: `/transaction/verify/${paystackReference}`,
        method: 'GET',
        headers: {
          Authorization: `Bearer ${paystackSecretKey}`
        }
      };

      const paystackReq = https.request(options, (paystackRes) => {
        let data = '';

        paystackRes.on('data', (chunk) => {
          data += chunk;
        });

        paystackRes.on('end', () => {
          try {
            const parsedData = JSON.parse(data);
            resolve(parsedData);
          } catch (error) {
            reject(new Error('Failed to parse Paystack response'));
          }
        });
      });

      paystackReq.on('error', (error) => {
        reject(error);
      });

      paystackReq.end();
    });

    // Check if payment was successful
    if (!paystackVerification.status || !paystackVerification.data) {
      console.error('Paystack verification failed:', paystackVerification);
      await order.update({ paymentStatus: 'failed' });
      return res.status(400).json({
        message: 'Payment verification failed',
        details: paystackVerification.message || 'Unknown error'
      });
    }

    const verifiedData = paystackVerification.data;

    // Verify payment status
    if (verifiedData.status !== 'success') {
      await order.update({ paymentStatus: 'failed' });
      return res.status(400).json({
        message: 'Payment was not successful',
        status: verifiedData.status
      });
    }

    // Verify amount matches (Paystack returns amount in kobo/cents)
    const expectedAmountInCents = Math.round(order.amount * 100);
    if (verifiedData.amount !== expectedAmountInCents) {
      console.error('Amount mismatch:', {
        expected: expectedAmountInCents,
        received: verifiedData.amount
      });
      await order.update({ paymentStatus: 'failed' });
      return res.status(400).json({
        message: 'Payment amount mismatch. Please contact support.'
      });
    }

    // Update order as paid
    await order.update({
      paymentStatus: 'paid',
      paystackReference,
      paidAt: new Date(),
      paymentMethod: verifiedData.channel || 'card'
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