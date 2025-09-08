
// seeders/20241201000004-create-sample-transcripts.js
'use strict';
const { v4: uuidv4 } = require('uuid');

module.exports = {
  async up(queryInterface, Sequelize) {
    // Get users and orders
    const users = await queryInterface.sequelize.query(
      'SELECT id FROM "Users" WHERE role = \'user\' LIMIT 3',
      { type: Sequelize.QueryTypes.SELECT }
    );

    const orders = await queryInterface.sequelize.query(
      'SELECT id, "userId" FROM "Orders" WHERE "paymentStatus" = \'paid\' LIMIT 2',
      { type: Sequelize.QueryTypes.SELECT }
    );

    if (users.length < 3 || orders.length < 2) {
      console.log('Not enough users or paid orders found. Please run previous seeders first.');
      return;
    }

    const transcripts = [
      {
        id: uuidv4(),
        title: 'Board Meeting Recording - Q4 2024',
        originalFileName: 'board-meeting-q4-2024.mp3',
        filePath: '/uploads/audio/sample-board-meeting.mp3',
        fileSize: 52428800, // 50MB
        fileType: 'audio/mpeg',
        duration: 2700, // 45 minutes in seconds
        speakers: 2,
        turnaroundTime: '1.5days',
        timestampFrequency: 'speaker',
        isVerbatim: false,
        status: 'completed',
        transcriptContent: `[00:00:00] Speaker 1: Good morning everyone, welcome to our Q4 board meeting. Let's start with the financial overview.

[00:02:15] Speaker 2: Thank you. Our revenue for Q4 has increased by 15% compared to Q3, reaching $2.3 million.

[00:05:30] Speaker 1: That's excellent news. What about our operational costs?

[00:06:45] Speaker 2: Operational costs have remained stable at around $1.8 million, giving us a healthy profit margin.

[00:10:20] Speaker 1: Perfect. Let's move on to our expansion plans for next year...`,
        notes: null,
        adminNotes: 'High quality audio, clear speakers',
        specialInstructions: 'Please include speaker identification and timestamps',
        userId: users[0].id,
        orderId: orders[0].id,
        assignedTo: null, // Will be admin user ID in real scenario
        startedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
        completedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
        deliveredAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
        estimatedDelivery: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
        createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
        updatedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000)
      },
      {
        id: uuidv4(),
        title: 'Customer Interview Session',
        originalFileName: 'customer-interview-dec2024.wav',
        filePath: '/uploads/audio/sample-customer-interview.wav',
        fileSize: 76800000, // 76MB
        fileType: 'audio/wav',
        duration: 3600, // 60 minutes in seconds
        speakers: 3,
        turnaroundTime: '1.5days',
        timestampFrequency: '2min',
        isVerbatim: true,
        status: 'processing',
        transcriptContent: null,
        notes: null,
        adminNotes: 'Multiple speakers, some background noise',
        specialInstructions: 'Full verbatim transcription required with all filler words',
        userId: users[1].id,
        orderId: orders[1].id,
        assignedTo: null, // Will be admin user ID in real scenario
        startedAt: new Date(Date.now() - 6 * 60 * 60 * 1000), // 6 hours ago
        completedAt: null,
        deliveredAt: null,
        estimatedDelivery: new Date(Date.now() + 18 * 60 * 60 * 1000), // 18 hours from now
        createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
        updatedAt: new Date(Date.now() - 6 * 60 * 60 * 1000)
      },
      {
        id: uuidv4(),
        title: 'Podcast Episode Draft',
        originalFileName: 'podcast-episode-15-draft.m4a',
        filePath: '/uploads/audio/sample-podcast-episode.m4a',
        fileSize: 45600000, // 45MB
        fileType: 'audio/mp4',
        duration: 1800, // 30 minutes in seconds
        speakers: 2,
        turnaroundTime: '3days',
        timestampFrequency: 'speaker',
        isVerbatim: false,
        status: 'pending',
        transcriptContent: null,
        notes: null,
        adminNotes: null,
        specialInstructions: 'Clean up for publication, remove filler words',
        userId: users[2].id,
        orderId: null, // This one doesn't have a paid order yet
        assignedTo: null,
        startedAt: null,
        completedAt: null,
        deliveredAt: null,
        estimatedDelivery: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000), // 3 days from now
        createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
        updatedAt: new Date(Date.now() - 2 * 60 * 60 * 1000)
      }
    ];

    await queryInterface.bulkInsert('Transcripts', transcripts, {});
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.bulkDelete('Transcripts', {
      title: {
        [Sequelize.Op.in]: [
          'Board Meeting Recording - Q4 2024',
          'Customer Interview Session',
          'Podcast Episode Draft'
        ]
      }
    }, {});
  }
};