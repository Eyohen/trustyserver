
// controllers/authController.js
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const db = require('../models');
const { User } = db;
const { sendEmail } = require('../utils/email');

// Generate JWT token
const generateToken = (userId, role) => {
  return jwt.sign(
    { userId, role },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );
};

// Register user
const register = async (req, res) => {
  try {
    const { firstName, lastName, email, password, phone } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({ where: { email } });
    if (existingUser) {
      return res.status(400).json({ message: 'User already exists with this email' });
    }

    // Generate verification token
    const verificationToken = crypto.randomBytes(32).toString('hex');

    // Create user
    const user = await User.create({
      firstName,
      lastName,
      email,
      password,
      phone,
      verificationToken
    });

    // Generate JWT token
    const token = generateToken(user.id, user.role);

    // Send verification email (uncomment when email service is set up)
    // await sendEmail({
    //   to: email,
    //   subject: 'Verify your TrustyTranscript account',
    //   template: 'verification',
    //   data: { verificationToken, firstName }
    // });

    res.status(201).json({
      message: 'User registered successfully! Please check your email to verify your account.',
      token,
      user: user.toJSON()
    });

  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({ 
      message: 'Failed to register user', 
      error: error.message 
    });
  }
};

// Login user
const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Find user
    const user = await User.findOne({ 
      where: { email, isActive: true }
    });

    if (!user || !(await user.checkPassword(password))) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    // Update last login
    await user.update({ lastLogin: new Date() });

    // Generate token
    const token = generateToken(user.id, user.role);

    res.json({
      message: 'Login successful',
      token,
      user: user.toJSON()
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ 
      message: 'Failed to login', 
      error: error.message 
    });
  }
};

// Admin login
const adminLogin = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Find admin user
    const user = await User.findOne({ 
      where: { email, role: 'admin', isActive: true }
    });

    if (!user || !(await user.checkPassword(password))) {
      return res.status(401).json({ message: 'Invalid admin credentials' });
    }

    // Update last login
    await user.update({ lastLogin: new Date() });

    // Generate token
    const token = generateToken(user.id, user.role);

    res.json({
      message: 'Admin login successful',
      token,
      user: user.toJSON()
    });

  } catch (error) {
    console.error('Admin login error:', error);
    res.status(500).json({ 
      message: 'Failed to login', 
      error: error.message 
    });
  }
};

// Verify email
const verifyEmail = async (req, res) => {
  try {
    const { token } = req.params;

    const user = await User.findOne({ 
      where: { verificationToken: token }
    });

    if (!user) {
      return res.status(400).json({ message: 'Invalid verification token' });
    }

    await user.update({
      isVerified: true,
      verificationToken: null
    });

    res.json({ message: 'Email verified successfully' });

  } catch (error) {
    console.error('Email verification error:', error);
    res.status(500).json({ 
      message: 'Failed to verify email', 
      error: error.message 
    });
  }
};

// Forgot password
const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    const user = await User.findOne({ where: { email } });
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Generate reset token
    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetExpires = new Date(Date.now() + 3600000); // 1 hour

    await user.update({
      resetPasswordToken: resetToken,
      resetPasswordExpires: resetExpires
    });

    // Send reset email (uncomment when email service is set up)
    // await sendEmail({
    //   to: email,
    //   subject: 'Reset your TrustyTranscript password',
    //   template: 'reset-password',
    //   data: { resetToken, firstName: user.firstName }
    // });

    res.json({ 
      message: 'Password reset email sent',
      // For development only - remove in production
      resetToken: process.env.NODE_ENV === 'development' ? resetToken : undefined
    });

  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({ 
      message: 'Failed to process request', 
      error: error.message 
    });
  }
};

// Reset password
const resetPassword = async (req, res) => {
  try {
    const { token } = req.params;
    const { password } = req.body;

    const user = await User.findOne({
      where: {
        resetPasswordToken: token,
        resetPasswordExpires: { [db.Sequelize.Op.gt]: new Date() }
      }
    });

    if (!user) {
      return res.status(400).json({ message: 'Invalid or expired reset token' });
    }

    await user.update({
      password,
      resetPasswordToken: null,
      resetPasswordExpires: null
    });

    res.json({ message: 'Password reset successfully' });

  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({ 
      message: 'Failed to reset password', 
      error: error.message 
    });
  }
};

// Get current user
const getCurrentUser = async (req, res) => {
  try {
    const user = await User.findByPk(req.user.userId, {
      include: [
        {
          model: db.Transcript,
          as: 'transcripts',
          attributes: ['id', 'title', 'status'],
          limit: 5,
          order: [['createdAt', 'DESC']]
        },
        {
          model: db.Order,
          as: 'orders',
          attributes: ['id', 'orderNumber', 'amount', 'paymentStatus'],
          limit: 5,
          order: [['createdAt', 'DESC']]
        }
      ]
    });

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json({ user: user.toJSON() });

  } catch (error) {
    console.error('Get current user error:', error);
    res.status(500).json({ 
      message: 'Failed to get user', 
      error: error.message 
    });
  }
};

// Change password
const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    const user = await User.findByPk(req.user.userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Verify current password
    if (!(await user.checkPassword(currentPassword))) {
      return res.status(400).json({ message: 'Current password is incorrect' });
    }

    // Update password
    await user.update({ password: newPassword });

    res.json({ message: 'Password changed successfully' });

  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({
      message: 'Failed to change password',
      error: error.message
    });
  }
};

// Refresh token
const refreshToken = async (req, res) => {
  try {
    const user = await User.findByPk(req.user.userId);
    if (!user || !user.isActive) {
      return res.status(401).json({ message: 'User not found or inactive' });
    }

    const token = generateToken(user.id, user.role);

    res.json({
      message: 'Token refreshed successfully',
      token,
      user: user.toJSON()
    });

  } catch (error) {
    console.error('Refresh token error:', error);
    res.status(500).json({
      message: 'Failed to refresh token',
      error: error.message
    });
  }
};

module.exports = {
  register,
  login,
  adminLogin,
  verifyEmail,
  forgotPassword,
  resetPassword,
  getCurrentUser,
  changePassword,
  refreshToken
};
