const { DataTypes, Model } = require('sequelize');
const { sequelize } = require('../database');

class Subscription extends Model {}

Subscription.init({
  stripeSubscriptionId: {
    type: DataTypes.STRING,
    allowNull: false
  },
  stripePriceId: {
    type: DataTypes.STRING,
    allowNull: false
  },
  stripeCustomerId: {
    type: DataTypes.STRING,
    allowNull: false
  },
  status: {
    type: DataTypes.ENUM('active', 'canceled', 'past_due', 'unpaid', 'incomplete', 'incomplete_expired'),
    defaultValue: 'active'
  },
  plan: {
    type: DataTypes.ENUM('premium'),
    defaultValue: 'premium'
  },
  currentPeriodStart: {
    type: DataTypes.DATE,
    allowNull: false
  },
  currentPeriodEnd: {
    type: DataTypes.DATE,
    allowNull: false
  },
  cancelAtPeriodEnd: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  userId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'Users',
      key: 'id'
    }
  }
}, {
  sequelize,
  modelName: 'Subscription',
  timestamps: true
});

module.exports = Subscription;