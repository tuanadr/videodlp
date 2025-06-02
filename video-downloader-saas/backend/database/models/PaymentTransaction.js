const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const PaymentTransaction = sequelize.define('PaymentTransaction', {
    userId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: 'user_id',
      references: {
        model: 'Users',
        key: 'id'
      }
    },
    transactionId: {
      type: DataTypes.STRING(255),
      allowNull: false,
      unique: true,
      field: 'transaction_id'
    },
    paymentMethod: {
      type: DataTypes.STRING(50),
      allowNull: false,
      field: 'payment_method',
      validate: {
        isIn: [['vnpay', 'momo', 'stripe', 'paypal']]
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
      type: DataTypes.STRING(3),
      defaultValue: 'VND',
      validate: {
        isIn: [['VND', 'USD', 'EUR']]
      }
    },
    status: {
      type: DataTypes.STRING(50),
      allowNull: false,
      defaultValue: 'pending',
      validate: {
        isIn: [['pending', 'completed', 'failed', 'refunded', 'cancelled']]
      }
    },
    subscriptionMonths: {
      type: DataTypes.INTEGER,
      defaultValue: 1,
      field: 'subscription_months',
      validate: {
        min: 1,
        max: 12
      }
    },
    vnpayData: {
      type: DataTypes.JSONB,
      allowNull: true,
      field: 'vnpay_data'
    },
    momoData: {
      type: DataTypes.JSONB,
      allowNull: true,
      field: 'momo_data'
    }
  }, {
    timestamps: true,
    tableName: 'PaymentTransactions'
  });

  // Instance methods
  PaymentTransaction.prototype.markAsCompleted = function(paymentData = {}) {
    this.status = 'completed';
    
    if (this.paymentMethod === 'vnpay' && paymentData) {
      this.vnpayData = { ...this.vnpayData, ...paymentData };
    } else if (this.paymentMethod === 'momo' && paymentData) {
      this.momoData = { ...this.momoData, ...paymentData };
    }
    
    return this.save();
  };

  PaymentTransaction.prototype.markAsFailed = function(errorData = {}) {
    this.status = 'failed';
    
    if (this.paymentMethod === 'vnpay' && errorData) {
      this.vnpayData = { ...this.vnpayData, error: errorData };
    } else if (this.paymentMethod === 'momo' && errorData) {
      this.momoData = { ...this.momoData, error: errorData };
    }
    
    return this.save();
  };

  PaymentTransaction.prototype.markAsRefunded = function(refundData = {}) {
    this.status = 'refunded';
    
    if (this.paymentMethod === 'vnpay' && refundData) {
      this.vnpayData = { ...this.vnpayData, refund: refundData };
    } else if (this.paymentMethod === 'momo' && refundData) {
      this.momoData = { ...this.momoData, refund: refundData };
    }
    
    return this.save();
  };

  PaymentTransaction.prototype.isCompleted = function() {
    return this.status === 'completed';
  };

  PaymentTransaction.prototype.isPending = function() {
    return this.status === 'pending';
  };

  PaymentTransaction.prototype.isFailed = function() {
    return this.status === 'failed';
  };

  // Static methods
  PaymentTransaction.createTransaction = async function(userId, transactionId, paymentMethod, amount, subscriptionMonths = 1) {
    return await this.create({
      userId,
      transactionId,
      paymentMethod,
      amount,
      subscriptionMonths,
      status: 'pending'
    });
  };

  PaymentTransaction.findByTransactionId = async function(transactionId) {
    return await this.findOne({
      where: { transactionId },
      include: [{
        model: sequelize.models.User,
        as: 'user',
        attributes: ['id', 'name', 'email', 'tier']
      }]
    });
  };

  PaymentTransaction.getUserTransactions = async function(userId, limit = 10) {
    return await this.findAll({
      where: { userId },
      order: [['createdAt', 'DESC']],
      limit
    });
  };

  PaymentTransaction.getRevenueStats = async function(dateRange = null) {
    const whereClause = { status: 'completed' };
    
    if (dateRange) {
      whereClause.createdAt = {
        [sequelize.Sequelize.Op.between]: [dateRange.start, dateRange.end]
      };
    }

    const stats = await this.findAll({
      where: whereClause,
      attributes: [
        'paymentMethod',
        [sequelize.fn('COUNT', sequelize.col('id')), 'transactionCount'],
        [sequelize.fn('SUM', sequelize.col('amount')), 'totalRevenue'],
        [sequelize.fn('AVG', sequelize.col('amount')), 'averageAmount']
      ],
      group: ['paymentMethod'],
      raw: true
    });

    const totalStats = await this.findOne({
      where: whereClause,
      attributes: [
        [sequelize.fn('COUNT', sequelize.col('id')), 'totalTransactions'],
        [sequelize.fn('SUM', sequelize.col('amount')), 'totalRevenue']
      ],
      raw: true
    });

    return {
      byPaymentMethod: stats,
      total: totalStats
    };
  };

  PaymentTransaction.getPendingTransactions = async function() {
    return await this.findAll({
      where: { 
        status: 'pending',
        createdAt: {
          [sequelize.Sequelize.Op.gte]: new Date(Date.now() - 24 * 60 * 60 * 1000) // Last 24 hours
        }
      },
      include: [{
        model: sequelize.models.User,
        as: 'user',
        attributes: ['id', 'name', 'email']
      }],
      order: [['createdAt', 'DESC']]
    });
  };

  return PaymentTransaction;
};
