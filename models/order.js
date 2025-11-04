// models/order.js
'use strict';
const { Model, UUIDV4 } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class Order extends Model {
    static associate(models) {
      Order.belongsTo(models.User, {
        foreignKey: 'userId',
        as: 'user'
      });
      Order.hasOne(models.Transcript, {
        foreignKey: 'orderId',
        as: 'transcript'
      });
    }
  }

  Order.init({
    id: {
      type: DataTypes.UUID,
      defaultValue: UUIDV4,
      primaryKey: true,
      allowNull: false
    },
    orderNumber: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true
    },
    userId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'Users',
        key: 'id'
      }
    },
    amount: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      validate: {
        min: 0
      }
    },
    currency: {
      type: DataTypes.STRING,
      defaultValue: 'USD',
      allowNull: false
    },
    paymentStatus: {
      type: DataTypes.ENUM('pending', 'paid', 'failed', 'refunded', 'cancelled'),
      defaultValue: 'pending',
      allowNull: false
    },
    paymentMethod: {
      type: DataTypes.STRING,
      allowNull: true
    },
    paymentReference: {
      type: DataTypes.STRING,
      allowNull: false,
      // unique: true,
      comment: 'Unique reference for this order'
    },
    paystackReference: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: 'Reference returned from Paystack after payment'
    },
    paidAt: {
      type: DataTypes.DATE,
      allowNull: true
    },
    specifications: {
      type: DataTypes.JSON,
      allowNull: false,
      comment: 'Stores duration, speakers, turnaround, timestamp, verbatim settings'
    },
    customerInfo: {
      type: DataTypes.JSON,
      allowNull: false,
      comment: 'Stores customer name, email, phone for the order'
    },
    pricing: {
      type: DataTypes.JSON,
      allowNull: true,
      comment: 'Stores pricing breakdown for reference'
    },
    adminNotes: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'Internal notes for admin use'
    }
  }, {
    sequelize,
    modelName: 'Order',
    hooks: {
      beforeCreate: (order) => {
        // Generate order number
        const timestamp = Date.now().toString();
        const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
        order.orderNumber = `TT-${timestamp.slice(-6)}${random}`;
      }
    },
    indexes: [
      { fields: ['userId'] },
      { fields: ['orderNumber'], unique: true },
      { fields: ['paymentStatus'] },
      { fields: ['paymentReference'], unique: true },
      { fields: ['paystackReference'] },
      { fields: ['createdAt'] },
      { fields: ['paidAt'] }
    ]
  });

  return Order;
};