const nodemailer = require('nodemailer');

// Create transporter
const createTransporter = () => {
  if (process.env.NODE_ENV === 'production') {
    // Production email service (e.g., SendGrid, Mailgun, etc.)
    return nodemailer.createTransporter({
      service: process.env.EMAIL_SERVICE,
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
      }
    });
  } else {
    // Development - use Ethereal Email for testing
    return nodemailer.createTransporter({
      host: 'smtp.ethereal.email',
      port: 587,
      auth: {
        user: process.env.ETHEREAL_EMAIL || 'ethereal.user@ethereal.email',
        pass: process.env.ETHEREAL_PASS || 'ethereal.pass'
      }
    });
  }
};

// Send verification email
const sendVerificationEmail = async (email, token, userName) => {
  try {
    const transporter = createTransporter();
    const verificationUrl = `${process.env.FRONTEND_URL}/verify-email/${token}`;

    const mailOptions = {
      from: {
        name: 'TheyThatTestify',
        address: process.env.EMAIL_FROM || 'noreply@theythattestify.com'
      },
      to: email,
      subject: 'Verify Your Email - TheyThatTestify',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: linear-gradient(135deg, #1f2937 0%, #000000 100%); padding: 40px; text-align: center;">
            <h1 style="color: #f59e0b; font-size: 28px; margin: 0;">TheyThatTestify</h1>
            <p style="color: #ffffff; font-size: 16px; margin: 10px 0 0 0;">Welcome to our mission!</p>
          </div>
          
          <div style="padding: 40px; background-color: #ffffff;">
            <h2 style="color: #1f2937; font-size: 24px; margin-bottom: 20px;">Hello ${userName}!</h2>
            
            <p style="color: #4b5563; font-size: 16px; line-height: 1.6; margin-bottom: 20px;">
              Thank you for joining TheyThatTestify! We're excited to have you as part of our mission to document 1 million testimonies of Jesus.
            </p>
            
            <p style="color: #4b5563; font-size: 16px; line-height: 1.6; margin-bottom: 30px;">
              To complete your registration and start sharing your testimony, please verify your email address by clicking the button below:
            </p>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${verificationUrl}" 
                 style="background-color: #f59e0b; color: #000000; padding: 15px 30px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block; font-size: 16px;">
                Verify Email Address
              </a>
            </div>
            
            <p style="color: #6b7280; font-size: 14px; line-height: 1.5; margin-top: 30px;">
              If you didn't create an account with us, please ignore this email. This verification link will expire in 24 hours.
            </p>
            
            <p style="color: #6b7280; font-size: 14px; margin-top: 20px;">
              If the button doesn't work, copy and paste this link into your browser:<br>
              <a href="${verificationUrl}" style="color: #f59e0b; word-break: break-all;">${verificationUrl}</a>
            </p>
          </div>
          
          <div style="background-color: #f9fafb; padding: 20px; text-align: center; border-top: 1px solid #e5e7eb;">
            <p style="color: #6b7280; font-size: 12px; margin: 0;">
              © 2025 TheyThatTestify. All rights reserved.
            </p>
          </div>
        </div>
      `
    };

    const result = await transporter.sendMail(mailOptions);
    console.log('Verification email sent:', result.messageId);
    return result;

  } catch (error) {
    console.error('Failed to send verification email:', error);
    throw error;
  }
};

// Send password reset email
const sendPasswordResetEmail = async (email, token, userName) => {
  try {
    const transporter = createTransporter();
    const resetUrl = `${process.env.FRONTEND_URL}/reset-password/${token}`;

    const mailOptions = {
      from: {
        name: 'TheyThatTestify',
        address: process.env.EMAIL_FROM || 'noreply@theythattestify.com'
      },
      to: email,
      subject: 'Reset Your Password - TheyThatTestify',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: linear-gradient(135deg, #1f2937 0%, #000000 100%); padding: 40px; text-align: center;">
            <h1 style="color: #f59e0b; font-size: 28px; margin: 0;">TheyThatTestify</h1>
          </div>
          
          <div style="padding: 40px; background-color: #ffffff;">
            <h2 style="color: #1f2937; font-size: 24px; margin-bottom: 20px;">Password Reset Request</h2>
            
            <p style="color: #4b5563; font-size: 16px; line-height: 1.6; margin-bottom: 20px;">
              Hello ${userName},
            </p>
            
            <p style="color: #4b5563; font-size: 16px; line-height: 1.6; margin-bottom: 20px;">
              We received a request to reset your password for your TheyThatTestify account. If you made this request, click the button below to reset your password:
            </p>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${resetUrl}" 
                 style="background-color: #f59e0b; color: #000000; padding: 15px 30px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block; font-size: 16px;">
                Reset Password
              </a>
            </div>
            
            <p style="color: #dc2626; font-size: 14px; line-height: 1.5; margin-top: 30px;">
              ⚠️ This password reset link will expire in 1 hour for your security.
            </p>
            
            <p style="color: #6b7280; font-size: 14px; line-height: 1.5; margin-top: 20px;">
              If you didn't request a password reset, please ignore this email. Your account remains secure and no changes have been made.
            </p>
            
            <p style="color: #6b7280; font-size: 14px; margin-top: 20px;">
              If the button doesn't work, copy and paste this link into your browser:<br>
              <a href="${resetUrl}" style="color: #f59e0b; word-break: break-all;">${resetUrl}</a>
            </p>
          </div>
          
          <div style="background-color: #f9fafb; padding: 20px; text-align: center; border-top: 1px solid #e5e7eb;">
            <p style="color: #6b7280; font-size: 12px; margin: 0;">
              © 2025 TheyThatTestify. All rights reserved.
            </p>
          </div>
        </div>
      `
    };

    const result = await transporter.sendMail(mailOptions);
    console.log('Password reset email sent:', result.messageId);
    return result;

  } catch (error) {
    console.error('Failed to send password reset email:', error);
    throw error;
  }
};

// Send testimony approval notification
const sendApprovalNotification = async (email, testimonyTitle, userName) => {
  try {
    const transporter = createTransporter();

    const mailOptions = {
      from: {
        name: 'TheyThatTestify',
        address: process.env.EMAIL_FROM || 'noreply@theythattestify.com'
      },
      to: email,
      subject: 'Your Testimony Has Been Approved! - TheyThatTestify',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: linear-gradient(135deg, #059669 0%, #10b981 100%); padding: 40px; text-align: center;">
            <h1 style="color: #ffffff; font-size: 28px; margin: 0;">🎉 Testimony Approved!</h1>
          </div>
          
          <div style="padding: 40px; background-color: #ffffff;">
            <h2 style="color: #1f2937; font-size: 24px; margin-bottom: 20px;">Congratulations ${userName}!</h2>
            
            <p style="color: #4b5563; font-size: 16px; line-height: 1.6; margin-bottom: 20px;">
              We're excited to let you know that your testimony "<strong>${testimonyTitle}</strong>" has been approved and is now live on TheyThatTestify!
            </p>
            
            <p style="color: #4b5563; font-size: 16px; line-height: 1.6; margin-bottom: 30px;">
              Your story is now part of our mission to document 1 million testimonies of what Jesus has done. Thank you for sharing your heart and helping others see God's goodness.
            </p>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${process.env.FRONTEND_URL}/watch" 
                 style="background-color: #f59e0b; color: #000000; padding: 15px 30px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block; font-size: 16px;">
                View Your Testimony
              </a>
            </div>
            
            <p style="color: #6b7280; font-size: 14px; line-height: 1.5; margin-top: 30px;">
              <em>"They overcame by the blood of the Lamb and by the word of their testimony." - Revelation 12:11</em>
            </p>
          </div>
          
          <div style="background-color: #f9fafb; padding: 20px; text-align: center; border-top: 1px solid #e5e7eb;">
            <p style="color: #6b7280; font-size: 12px; margin: 0;">
              © 2025 TheyThatTestify. All rights reserved.
            </p>
          </div>
        </div>
      `
    };

    const result = await transporter.sendMail(mailOptions);
    console.log('Approval notification email sent:', result.messageId);
    return result;

  } catch (error) {
    console.error('Failed to send approval notification email:', error);
    throw error;
  }
};

module.exports = {
  sendVerificationEmail,
  sendPasswordResetEmail,
  sendApprovalNotification
};