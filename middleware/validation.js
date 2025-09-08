
// middleware/validation.js
const { body, validationResult, param, query } = require('express-validator');

// Handle validation errors
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      message: 'Validation failed',
      errors: errors.array()
    });
  }
  next();
};

// User registration validation
const validateRegister = [
  body('firstName')
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('First name must be between 2 and 50 characters')
    .matches(/^[a-zA-Z\s]+$/)
    .withMessage('First name can only contain letters and spaces'),
  
  body('lastName')
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('Last name must be between 2 and 50 characters')
    .matches(/^[a-zA-Z\s]+$/)
    .withMessage('Last name can only contain letters and spaces'),
  
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email address'),
  
  body('password')
    .isLength({ min: 8, max: 100 })
    .withMessage('Password must be between 8 and 100 characters')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('Password must contain at least one lowercase letter, one uppercase letter, and one number'),
  
  body('phone')
    .optional()
    .isMobilePhone()
    .withMessage('Please provide a valid phone number'),
  
  handleValidationErrors
];

// User login validation
const validateLogin = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email address'),
  
  body('password')
    .notEmpty()
    .withMessage('Password is required'),
  
  handleValidationErrors
];

// Forgot password validation
const validateForgotPassword = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email address'),
  
  handleValidationErrors
];

// Reset password validation
const validateResetPassword = [
  body('password')
    .isLength({ min: 8, max: 100 })
    .withMessage('Password must be between 8 and 100 characters')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('Password must contain at least one lowercase letter, one uppercase letter, and one number'),
  
  handleValidationErrors
];

// Change password validation
const validateChangePassword = [
  body('currentPassword')
    .notEmpty()
    .withMessage('Current password is required'),
  
  body('newPassword')
    .isLength({ min: 8, max: 100 })
    .withMessage('New password must be between 8 and 100 characters')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('New password must contain at least one lowercase letter, one uppercase letter, and one number'),
  
  handleValidationErrors
];

// Update profile validation
const validateUpdateProfile = [
  body('firstName')
    .optional()
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('First name must be between 2 and 50 characters'),
  
  body('lastName')
    .optional()
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('Last name must be between 2 and 50 characters'),
  
  body('phone')
    .optional()
    .isMobilePhone()
    .withMessage('Please provide a valid phone number'),
  
  handleValidationErrors
];

// Transcript validation
const validateTranscript = [
  body('title')
    .trim()
    .isLength({ min: 3, max: 200 })
    .withMessage('Title must be between 3 and 200 characters'),
  
  body('speakers')
    .isInt({ min: 1, max: 10 })
    .withMessage('Number of speakers must be between 1 and 10'),
  
  body('turnaroundTime')
    .isIn(['3days', '1.5days', '6-12hrs'])
    .withMessage('Invalid turnaround time'),
  
  body('timestampFrequency')
    .isIn(['speaker', '2min', '30sec', '10sec'])
    .withMessage('Invalid timestamp frequency'),
  
  body('isVerbatim')
    .optional()
    .isBoolean()
    .withMessage('isVerbatim must be a boolean'),
  
  body('orderId')
    .isUUID()
    .withMessage('Valid order ID is required'),
  
  body('specialInstructions')
    .optional()
    .isLength({ max: 1000 })
    .withMessage('Special instructions cannot exceed 1000 characters'),
  
  handleValidationErrors
];

// Transcript status update validation
const validateTranscriptStatus = [
  body('status')
    .isIn(['pending', 'processing', 'completed', 'delivered', 'cancelled'])
    .withMessage('Invalid status'),
  
  body('transcriptContent')
    .optional()
    .isLength({ min: 10 })
    .withMessage('Transcript content must be at least 10 characters'),
  
  body('adminNotes')
    .optional()
    .isLength({ max: 1000 })
    .withMessage('Admin notes cannot exceed 1000 characters'),
  
  handleValidationErrors
];

// Order validation
const validateOrder = [
  body('duration')
    .isInt({ min: 1, max: 10080 }) // Max 1 week in minutes
    .withMessage('Duration must be between 1 and 10080 minutes'),
  
  body('speakers')
    .isInt({ min: 1, max: 10 })
    .withMessage('Number of speakers must be between 1 and 10'),
  
  body('turnaroundTime')
    .isIn(['3days', '1.5days', '6-12hrs'])
    .withMessage('Invalid turnaround time'),
  
  body('timestampFrequency')
    .isIn(['speaker', '2min', '30sec', '10sec'])
    .withMessage('Invalid timestamp frequency'),
  
  body('isVerbatim')
    .optional()
    .isBoolean()
    .withMessage('isVerbatim must be a boolean'),
  
  body('customerInfo')
    .isObject()
    .withMessage('Customer information is required'),
  
  body('customerInfo.name')
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Customer name must be between 2 and 100 characters'),
  
  body('customerInfo.email')
    .isEmail()
    .withMessage('Valid customer email is required'),
  
  body('customerInfo.phone')
    .isMobilePhone()
    .withMessage('Valid customer phone number is required'),
  
  handleValidationErrors
];

// Payment verification validation
const validatePaymentVerification = [
  body('paymentReference')
    .notEmpty()
    .withMessage('Payment reference is required'),
  
  body('paystackReference')
    .notEmpty()
    .withMessage('Paystack reference is required'),
  
  body('paymentData')
    .optional()
    .isObject()
    .withMessage('Payment data must be an object'),
  
  handleValidationErrors
];

// Pagination validation
const validatePagination = [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),
  
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100'),
  
  handleValidationErrors
];

module.exports = {
  validateRegister,
  validateLogin,
  validateForgotPassword,
  validateResetPassword,
  validateChangePassword,
  validateUpdateProfile,
  validateTranscript,
  validateTranscriptStatus,
  validateOrder,
  validatePaymentVerification,
  validatePagination,
  handleValidationErrors
};