const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Subscription = sequelize.define('Subscription', {
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
    timestamps: true,
    createdAt: true,
    updatedAt: true
  });

  return Subscription;
};