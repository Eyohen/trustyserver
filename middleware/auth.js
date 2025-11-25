
// middleware/auth.js
const jwt = require('jsonwebtoken');
const db = require('../models');
const { User } = db;

// Verify JWT token
const verifyToken = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    let token;

    // Check Authorization header first
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.split(' ')[1];
    }
    // Fall back to query parameter (for file downloads)
    else if (req.query.token) {
      token = req.query.token;
    }

    if (!token) {
      return res.status(401).json({ message: 'Access token required' });
    }
    
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Check if user still exists and is active
    const user = await User.findOne({
      where: { 
        id: decoded.userId, 
        isActive: true 
      },
      attributes: ['id', 'email', 'role', 'isVerified', 'firstName', 'lastName']
    });

    if (!user) {
      return res.status(401).json({ message: 'Invalid or expired token' });
    }

    req.user = {
      userId: user.id,
      email: user.email,
      role: user.role,
      isVerified: user.isVerified,
      firstName: user.firstName,
      lastName: user.lastName
    };

    next();

  } catch (error) {
    console.error('Token verification error:', error);
    
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ message: 'Invalid token' });
    } else if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ message: 'Token expired' });
    }
    
    return res.status(500).json({ message: 'Token verification failed' });
  }
};

// Require admin role
const requireAdmin = (req, res, next) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Admin access required' });
  }
  next();
};

// Require verified email
const requireVerified = (req, res, next) => {
  if (!req.user.isVerified) {
    return res.status(403).json({ 
      message: 'Email verification required. Please check your email and verify your account.' 
    });
  }
  next();
};

// Optional authentication (for public endpoints that can benefit from user context)
const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return next(); // Continue without authentication
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    const user = await User.findOne({
      where: { 
        id: decoded.userId, 
        isActive: true 
      },
      attributes: ['id', 'email', 'role', 'isVerified']
    });

    if (user) {
      req.user = {
        userId: user.id,
        email: user.email,
        role: user.role,
        isVerified: user.isVerified
      };
    }

    next();

  } catch (error) {
    // If token is invalid, continue without authentication
    next();
  }
};

module.exports = {
  verifyToken,
  requireAdmin,
  requireVerified,
  optionalAuth
};