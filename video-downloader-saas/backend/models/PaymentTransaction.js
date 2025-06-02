const { DataTypes, Model } = require('sequelize');
const { sequelize } = require('../database');

class PaymentTransaction extends Model {
  // Create new payment transaction
  static async createTransaction(userId, transactionId, paymentMethod, amount, subscriptionMonths = 1) {
    return await PaymentTransaction.create({
      user_id: userId,
      transaction_id: transactionId,
      payment_method: paymentMethod,
      amount: amount,
      currency: 'VND',
      status: 'pending',
      subscription_months: subscriptionMonths
    });
  }

  // Update transaction status
  async updateStatus(status, paymentData = null) {
    this.status = status;
    this.updated_at = new Date();

    if (paymentData) {
      if (this.payment_method === 'vnpay') {
        this.vnpay_data = paymentData;
      } else if (this.payment_method === 'momo') {
        this.momo_data = paymentData;
      }
    }

    return await this.save();
  }

  // Mark as completed
  async markCompleted(paymentData = null) {
    return await this.updateStatus('completed', paymentData);
  }

  // Mark as failed
  async markFailed(paymentData = null) {
    return await this.updateStatus('failed', paymentData);
  }

  // Mark as refunded
  async markRefunded(paymentData = null) {
    return await this.updateStatus('refunded', paymentData);
  }

  // Get transaction by transaction ID
  static async findByTransactionId(transactionId) {
    return await PaymentTransaction.findOne({
      where: { transaction_id: transactionId },
      include: [{
        model: sequelize.models.User,
        as: 'user',
        attributes: ['id', 'name', 'email', 'tier']
      }]
    });
  }

  // Get user's payment history
  static async getUserPaymentHistory(userId, limit = 10, offset = 0) {
    return await PaymentTransaction.findAndCountAll({
      where: { user_id: userId },
      order: [['created_at', 'DESC']],
      limit,
      offset
    });
  }

  // Get revenue statistics
  static async getRevenueStats(startDate, endDate) {
    const stats = await sequelize.query(`
      SELECT 
        payment_method,
        COUNT(*) as transaction_count,
        SUM(CASE WHEN status = 'completed' THEN amount ELSE 0 END) as total_revenue,
        SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as successful_transactions,
        SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as failed_transactions,
        AVG(CASE WHEN status = 'completed' THEN amount ELSE NULL END) as avg_transaction_amount
      FROM "PaymentTransactions"
      WHERE created_at BETWEEN :startDate AND :endDate
      GROUP BY payment_method
    `, {
      replacements: { startDate, endDate },
      type: sequelize.QueryTypes.SELECT
    });

    return stats;
  }

  // Get daily revenue
  static async getDailyRevenue(startDate, endDate) {
    const stats = await sequelize.query(`
      SELECT 
        DATE(created_at) as date,
        payment_method,
        COUNT(*) as transactions,
        SUM(CASE WHEN status = 'completed' THEN amount ELSE 0 END) as revenue
      FROM "PaymentTransactions"
      WHERE created_at BETWEEN :startDate AND :endDate
      GROUP BY DATE(created_at), payment_method
      ORDER BY date DESC, payment_method
    `, {
      replacements: { startDate, endDate },
      type: sequelize.QueryTypes.SELECT
    });

    return stats;
  }

  // Get pending transactions (for cleanup)
  static async getPendingTransactions(olderThanMinutes = 30) {
    const cutoffTime = new Date(Date.now() - olderThanMinutes * 60 * 1000);
    
    return await PaymentTransaction.findAll({
      where: {
        status: 'pending',
        created_at: {
          [sequelize.Op.lt]: cutoffTime
        }
      }
    });
  }

  // Calculate success rate
  static async getSuccessRate(startDate, endDate, paymentMethod = null) {
    const whereClause = {
      created_at: {
        [sequelize.Op.between]: [startDate, endDate]
      }
    };

    if (paymentMethod) {
      whereClause.payment_method = paymentMethod;
    }

    const total = await PaymentTransaction.count({ where: whereClause });
    const successful = await PaymentTransaction.count({
      where: {
        ...whereClause,
        status: 'completed'
      }
    });

    return {
      total,
      successful,
      success_rate: total > 0 ? (successful / total) * 100 : 0
    };
  }
}

PaymentTransaction.init({
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  user_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'Users',
      key: 'id'
    },
    onUpdate: 'CASCADE',
    onDelete: 'CASCADE'
  },
  transaction_id: {
    type: DataTypes.STRING(255),
    allowNull: false,
    unique: true
  },
  payment_method: {
    type: DataTypes.STRING(50),
    allowNull: false,
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
  subscription_months: {
    type: DataTypes.INTEGER,
    defaultValue: 1,
    validate: {
      min: 1,
      max: 12
    }
  },
  vnpay_data: {
    type: DataTypes.JSON,
    allowNull: true
  },
  momo_data: {
    type: DataTypes.JSON,
    allowNull: true
  }
}, {
  sequelize,
  modelName: 'PaymentTransaction',
  tableName: 'PaymentTransactions',
  timestamps: true,
  indexes: [
    {
      fields: ['user_id']
    },
    {
      fields: ['transaction_id'],
      unique: true
    },
    {
      fields: ['payment_method']
    },
    {
      fields: ['status']
    },
    {
      fields: ['created_at']
    }
  ]
});

module.exports = PaymentTransaction;
