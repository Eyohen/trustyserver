// models/transcript.js
'use strict';
const { Model, UUIDV4 } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class Transcript extends Model {
    static associate(models) {
      Transcript.belongsTo(models.User, {
        foreignKey: 'userId',
        as: 'user'
      });
      Transcript.belongsTo(models.Order, {
        foreignKey: 'orderId',
        as: 'order'
      });
      // Self-referencing for assigned admin
      Transcript.belongsTo(models.User, {
        foreignKey: 'assignedTo',
        as: 'assignedAdmin'
      });
    }
  }

  Transcript.init({
    id: {
      type: DataTypes.UUID,
      defaultValue: UUIDV4,
      primaryKey: true,
      allowNull: false
    },
    title: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        len: [3, 200],
        notEmpty: true
      }
    },
    originalFileName: {
      type: DataTypes.STRING,
      allowNull: false
    },
    filePath: {
      type: DataTypes.STRING,
      allowNull: false
    },
    fileSize: {
      type: DataTypes.BIGINT,
      allowNull: false
    },
    fileType: {
      type: DataTypes.STRING,
      allowNull: false
    },
    duration: {
      type: DataTypes.INTEGER, // in seconds
      allowNull: true
    },
    speakers: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 2,
      validate: {
        min: 1,
        max: 10
      }
    },
    turnaroundTime: {
      type: DataTypes.ENUM('3days', '1.5days', '6-12hrs'),
      allowNull: false,
      defaultValue: '3days'
    },
    timestampFrequency: {
      type: DataTypes.ENUM('speaker', '2min', '30sec', '10sec'),
      allowNull: false,
      defaultValue: 'speaker'
    },
    isVerbatim: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    status: {
      type: DataTypes.ENUM('pending', 'processing', 'completed', 'delivered', 'cancelled'),
      defaultValue: 'pending',
      allowNull: false
    },
    transcriptContent: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    transcriptFilePath: {
      type: DataTypes.STRING,
      allowNull: true
    },
    notes: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    adminNotes: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'Internal notes for admin use'
    },
    specialInstructions: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    userId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'Users',
        key: 'id'
      }
    },
    orderId: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'Orders',
        key: 'id'
      }
    },
    assignedTo: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'Users',
        key: 'id'
      }
    },
    startedAt: {
      type: DataTypes.DATE,
      allowNull: true
    },
    completedAt: {
      type: DataTypes.DATE,
      allowNull: true
    },
    deliveredAt: {
      type: DataTypes.DATE,
      allowNull: true
    },
    estimatedDelivery: {
      type: DataTypes.DATE,
      allowNull: true
    }
  }, {
    sequelize,
    modelName: 'Transcript',
    hooks: {
      beforeCreate: (transcript) => {
        // Calculate estimated delivery based on turnaround time
        const now = new Date();
        const turnaroundHours = {
          '3days': 72,
          '1.5days': 36,
          '6-12hrs': 12
        };
        
        const hours = turnaroundHours[transcript.turnaroundTime] || 72;
        transcript.estimatedDelivery = new Date(now.getTime() + (hours * 60 * 60 * 1000));
      }
    },
    indexes: [
      { fields: ['userId'] },
      { fields: ['orderId'] },
      { fields: ['status'] },
      { fields: ['assignedTo'] },
      { fields: ['createdAt'] },
      { fields: ['estimatedDelivery'] }
    ]
  });

  return Transcript;
};
