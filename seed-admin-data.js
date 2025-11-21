// seed-admin-data.js
require('dotenv').config();
const db = require('./models');
const { User, Order, Transcript } = db;

const seedAdminData = async () => {
  try {
    console.log('🌱 Seeding admin data...');

    // First, let's create some test users
    console.log('Creating test users...');

    const users = [];
    for (let i = 1; i <= 3; i++) {
      const user = await User.findOrCreate({
        where: { email: `user${i}@example.com` },
        defaults: {
          firstName: `John${i}`,
          lastName: `Doe${i}`,
          email: `user${i}@example.com`,
          password: 'password123',
          phone: `+1234567890${i}`,
          role: 'user',
          isVerified: true,
          isActive: true
        }
      });
      users.push(user[0]);
    }

    console.log(`✅ Created ${users.length} test users`);

    // Create 3 orders
    console.log('Creating test orders...');

    const orders = [];
    const orderData = [
      {
        userId: users[0].id,
        amount: 84.00,
        currency: 'USD',
        paymentStatus: 'paid',
        paymentMethod: 'card',
        paymentReference: `REF-${Date.now()}-001`,
        paystackReference: 'pstk_test_123456789',
        specifications: {
          duration: 45,
          speakers: 2,
          turnaround: '3days',
          timestamp: 'speaker',
          verbatim: false
        },
        customerInfo: {
          name: `${users[0].firstName} ${users[0].lastName}`,
          email: users[0].email,
          phone: users[0].phone
        },
        pricing: {
          basePrice: 60,
          speakerFee: 12,
          turnaroundFee: 0,
          timestampFee: 0,
          verbatimFee: 12,
          total: 84
        },
        paidAt: new Date()
      },
      {
        userId: users[1].id,
        amount: 126.00,
        currency: 'USD',
        paymentStatus: 'paid',
        paymentMethod: 'paystack',
        paymentReference: `REF-${Date.now()}-002`,
        paystackReference: 'pstk_test_987654321',
        specifications: {
          duration: 60,
          speakers: 3,
          turnaround: '1.5days',
          timestamp: '2min',
          verbatim: true
        },
        customerInfo: {
          name: `${users[1].firstName} ${users[1].lastName}`,
          email: users[1].email,
          phone: users[1].phone
        },
        pricing: {
          basePrice: 80,
          speakerFee: 20,
          turnaroundFee: 10,
          timestampFee: 5,
          verbatimFee: 11,
          total: 126
        },
        paidAt: new Date()
      },
      {
        userId: users[2].id,
        amount: 72.00,
        currency: 'USD',
        paymentStatus: 'pending',
        paymentMethod: null,
        paymentReference: `REF-${Date.now()}-003`,
        specifications: {
          duration: 30,
          speakers: 2,
          turnaround: '3days',
          timestamp: 'speaker',
          verbatim: false
        },
        customerInfo: {
          name: `${users[2].firstName} ${users[2].lastName}`,
          email: users[2].email,
          phone: users[2].phone
        },
        pricing: {
          basePrice: 60,
          speakerFee: 12,
          turnaroundFee: 0,
          timestampFee: 0,
          verbatimFee: 0,
          total: 72
        }
      }
    ];

    for (let i = 0; i < orderData.length; i++) {
      const data = orderData[i];
      // Generate order number manually since hook might not work in seeder
      const timestamp = Date.now().toString();
      const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
      data.orderNumber = `TT-${timestamp.slice(-6)}${random}`;

      const order = await Order.create(data);
      orders.push(order);
    }

    console.log(`✅ Created ${orders.length} test orders`);

    // Create 3 transcripts (for the paid orders)
    console.log('Creating test transcripts...');

    const transcripts = [];
    const transcriptData = [
      {
        title: 'Business Meeting Recording',
        originalFileName: 'meeting-recording-march-2024.mp3',
        filePath: '/uploads/audio/sample-audio-1.mp3',
        fileSize: 15728640, // 15MB
        fileType: 'audio/mpeg',
        duration: 2700, // 45 minutes in seconds
        speakers: 2,
        turnaroundTime: '3days',
        timestampFrequency: 'speaker',
        isVerbatim: false,
        status: 'pending',
        userId: users[0].id,
        orderId: orders[0].id,
        specialInstructions: 'Please include speaker labels and timestamps'
      },
      {
        title: 'Client Interview Session',
        originalFileName: 'interview-audio-march-2024.wav',
        filePath: '/uploads/audio/sample-audio-2.wav',
        fileSize: 25165824, // 24MB
        fileType: 'audio/wav',
        duration: 3600, // 60 minutes in seconds
        speakers: 3,
        turnaroundTime: '1.5days',
        timestampFrequency: '2min',
        isVerbatim: true,
        status: 'processing',
        userId: users[1].id,
        orderId: orders[1].id,
        specialInstructions: 'Verbatim transcription required, include all filler words',
        startedAt: new Date()
      },
      {
        title: 'Podcast Episode 42',
        originalFileName: 'podcast-ep42-final.m4a',
        filePath: '/uploads/audio/sample-audio-3.m4a',
        fileSize: 20971520, // 20MB
        fileType: 'audio/m4a',
        duration: 1800, // 30 minutes in seconds
        speakers: 2,
        turnaroundTime: '3days',
        timestampFrequency: 'speaker',
        isVerbatim: false,
        status: 'completed',
        userId: users[0].id,
        orderId: orders[0].id,
        transcriptContent: 'This is a sample completed transcript content...',
        startedAt: new Date(Date.now() - 48 * 60 * 60 * 1000), // 2 days ago
        completedAt: new Date()
      }
    ];

    for (const data of transcriptData) {
      const transcript = await Transcript.create(data);
      transcripts.push(transcript);
    }

    console.log(`✅ Created ${transcripts.length} test transcripts`);

    console.log('');
    console.log('🎉 Database seeded successfully!');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`👥 Users: ${users.length}`);
    console.log(`📋 Orders: ${orders.length}`);
    console.log(`📄 Transcripts: ${transcripts.length}`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('');
    console.log('Test Users Created:');
    users.forEach((user, i) => {
      console.log(`  ${i + 1}. ${user.email} (password: password123)`);
    });
    console.log('');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error seeding data:', error);
    if (error.errors) {
      error.errors.forEach(err => {
        console.error(`   • ${err.path}: ${err.message}`);
      });
    }
    process.exit(1);
  }
};

// Run the seeder
db.sequelize.authenticate()
  .then(() => {
    console.log('✅ Database connected');
    return seedAdminData();
  })
  .catch(err => {
    console.error('❌ Database connection failed:', err.message);
    process.exit(1);
  });
