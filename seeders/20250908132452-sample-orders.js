
// seeders/20250908132452-sample-orders.js
'use strict';
const { v4: uuidv4 } = require('uuid');

module.exports = {
  async up(queryInterface, Sequelize) {
    // First, get the user IDs (you'll need to update these with actual UUIDs after running the user seeder)
    const users = await queryInterface.sequelize.query(
      'SELECT id FROM "Users" WHERE role = \'user\' LIMIT 3',
      { type: Sequelize.QueryTypes.SELECT }
    );

    if (users.length < 3) {
      console.log('Not enough users found. Please run user seeders first.');
      return;
    }

    const orders = [
      {
        id: uuidv4(),
        orderNumber: 'TT-001234',
        userId: users[0].id,
        amount: 84.00,
        currency: 'NGN',
        paymentStatus: 'paid',
        paymentMethod: 'card',
        paymentReference: 'TT-1234567890-ABCD',
        paystackReference: 'trx_abc123def456',
        paidAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000), // 3 days ago
        specifications:JSON.stringify({
          duration: 45,
          speakers: 2,
          turnaroundTime: '1.5days',
          timestampFrequency: 'speaker',
          isVerbatim: false
        }),
        customerInfo: JSON.stringify({
          name: 'John Doe',
          email: 'john.doe@example.com',
          phone: '+2348012345678'
        }),
        pricing: JSON.stringify({
          rate: 1.5,
          totalPrice: 84,
          breakdown: {
            baseRate: 1.2,
            speakerMultiplier: 0,
            timestampMultiplier: 0.3,
            verbatimMultiplier: 0,
            finalRate: 1.5
          }
        }),
        createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
        updatedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000)
      },
      {
        id: uuidv4(),
        orderNumber: 'TT-001235',
        userId: users[1].id,
        amount: 126.00,
        currency: 'NGN',
        paymentStatus: 'paid',
        paymentMethod: 'bank_transfer',
        paymentReference: 'TT-1234567891-EFGH',
        paystackReference: 'trx_def456ghi789',
        paidAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000), // 1 day ago
        specifications: JSON.stringify({
          duration: 60,
          speakers: 3,
          turnaroundTime: '1.5days',
          timestampFrequency: '2min',
          isVerbatim: true
        }),
        customerInfo: JSON.stringify({
          name: 'Sarah Wilson',
          email: 'sarah.wilson@example.com',
          phone: '+2348098765432'
        }),
        pricing: JSON.stringify({
          rate: 1.75,
          totalPrice: 126,
          breakdown: {
            baseRate: 1.2,
            speakerMultiplier: 0.35,
            timestampMultiplier: 0.2,
            verbatimMultiplier: 0.2,
            finalRate: 1.75
          }
        }),
        createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
        updatedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000)
      },
      {
        id: uuidv4(),
        orderNumber: 'TT-001236',
        userId: users[2].id,
        amount: 72.00,
        currency: 'NGN',
        paymentStatus: 'pending',
        paymentMethod: null,
        paymentReference: 'TT-1234567892-IJKL',
        paystackReference: null,
        paidAt: null,
        specifications: JSON.stringify({
          duration: 30,
          speakers: 2,
          turnaroundTime: '3days',
          timestampFrequency: 'speaker',
          isVerbatim: false
        }),
        customerInfo: JSON.stringify({
          name: 'Michael Johnson',
          email: 'michael.johnson@example.com',
          phone: '+2347034567890'
        }),
        pricing: JSON.stringify({
          rate: 1.2,
          totalPrice: 72,
          breakdown: {
            baseRate: 0.9,
            speakerMultiplier: 0,
            timestampMultiplier: 0.3,
            verbatimMultiplier: 0,
            finalRate: 1.2
          }
        }),
        createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
        updatedAt: new Date(Date.now() - 2 * 60 * 60 * 1000)
      }
    ];

    await queryInterface.bulkInsert('Orders', orders, {});
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.bulkDelete('Orders', {
      orderNumber: {
        [Sequelize.Op.in]: ['TT-001234', 'TT-001235', 'TT-001236']
      }
    }, {});
  }
};