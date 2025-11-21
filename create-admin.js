// create-admin.js
require('dotenv').config();
const db = require('./models');
const { User } = db;

const createAdminAccount = async () => {
  try {
    console.log('🔧 Creating admin account...');

    // Check if admin already exists
    const existingAdmin = await User.findOne({
      where: { email: process.env.ADMIN_EMAIL || 'admin@theythattestify.com' }
    });

    if (existingAdmin) {
      console.log('⚠️  Admin account already exists!');
      console.log('📧 Email:', existingAdmin.email);
      console.log('👤 Name:', existingAdmin.firstName, existingAdmin.lastName);
      console.log('🔑 Role:', existingAdmin.role);

      // Update to admin role if not already
      if (existingAdmin.role !== 'admin') {
        existingAdmin.role = 'admin';
        existingAdmin.isVerified = true;
        await existingAdmin.save();
        console.log('✅ Updated user to admin role');
      }

      process.exit(0);
    }

    // Create new admin account
    const admin = await User.create({
      firstName: 'Admin',
      lastName: 'TrustyTranscript',
      email: process.env.ADMIN_EMAIL || 'admin@theythattestify.com',
      password: process.env.ADMIN_PASSWORD || 'SecureAdmin123!',
      phone: '+1234567890',
      role: 'admin',
      isVerified: true,
      isActive: true
    });

    console.log('✅ Admin account created successfully!');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📧 Email:', admin.email);
    console.log('🔑 Password:', process.env.ADMIN_PASSWORD || 'SecureAdmin123!');
    console.log('👤 Name:', admin.firstName, admin.lastName);
    console.log('🆔 ID:', admin.id);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('');
    console.log('🎯 You can now login using these credentials at:');
    console.log('   POST /api/auth/login');
    console.log('');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error creating admin account:', error.message);
    if (error.errors) {
      error.errors.forEach(err => {
        console.error(`   • ${err.path}: ${err.message}`);
      });
    }
    process.exit(1);
  }
};

// Run the function
db.sequelize.authenticate()
  .then(() => {
    console.log('✅ Database connected');
    return createAdminAccount();
  })
  .catch(err => {
    console.error('❌ Database connection failed:', err.message);
    process.exit(1);
  });
