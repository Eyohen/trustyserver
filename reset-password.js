// reset-password.js
// Script to reset a user's password in the local database

require('dotenv').config();
const { User } = require('./models');

async function resetPassword(email, newPassword) {
  try {
    // Find user by email
    const user = await User.findOne({ where: { email } });

    if (!user) {
      console.log(`❌ User with email ${email} not found`);
      process.exit(1);
    }

    console.log(`Found user: ${user.firstName} ${user.lastName} (${user.email})`);

    // Update password (will be automatically hashed by beforeUpdate hook)
    await user.update({ password: newPassword });

    console.log(`✅ Password successfully updated for ${email}`);
    console.log(`New password: ${newPassword}`);

    process.exit(0);
  } catch (error) {
    console.error('Error resetting password:', error.message);
    process.exit(1);
  }
}

// Get email and password from command line arguments
const email = process.argv[2];
const newPassword = process.argv[3];

if (!email || !newPassword) {
  console.log('Usage: node reset-password.js <email> <new-password>');
  console.log('Example: node reset-password.js john.doe@example.com NewSecurePass123!');
  process.exit(1);
}

// Run the password reset
resetPassword(email, newPassword);
