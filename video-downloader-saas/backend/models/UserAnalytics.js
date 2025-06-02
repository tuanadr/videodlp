const { DataTypes, Model } = require('sequelize');
const { sequelize } = require('../database');

class UserAnalytics extends Model {
  // Cập nhật thống kê page view
  static async trackPageView(userId, sessionId, ipAddress, userAgent) {
    const [analytics, created] = await UserAnalytics.findOrCreate({
      where: { 
        user_id: userId || null, 
        session_id: sessionId 
      },
      defaults: {
        user_id: userId || null,
        session_id: sessionId,
        ip_address: ipAddress,
        user_agent: userAgent,
        page_views: 1,
        downloads_count: 0,
        time_spent_seconds: 0,
        revenue_generated: 0
      }
    });

    if (!created) {
      analytics.page_views += 1;
      analytics.updated_at = new Date();
      await analytics.save();
    }

    return analytics;
  }

  // Cập nhật thống kê download
  static async trackDownload(userId, sessionId, revenue = 0) {
    const analytics = await UserAnalytics.findOne({
      where: { 
        user_id: userId || null, 
        session_id: sessionId 
      }
    });

    if (analytics) {
      analytics.downloads_count += 1;
      analytics.revenue_generated += revenue;
      analytics.updated_at = new Date();
      await analytics.save();
    }

    return analytics;
  }

  // Cập nhật thời gian sử dụng
  static async trackTimeSpent(userId, sessionId, seconds) {
    const analytics = await UserAnalytics.findOne({
      where: { 
        user_id: userId || null, 
        session_id: sessionId 
      }
    });

    if (analytics) {
      analytics.time_spent_seconds += seconds;
      analytics.updated_at = new Date();
      await analytics.save();
    }

    return analytics;
  }

  // Lấy thống kê tổng quan
  static async getDashboardStats(startDate, endDate) {
    const stats = await sequelize.query(`
      SELECT 
        COUNT(DISTINCT session_id) as total_sessions,
        COUNT(DISTINCT user_id) as unique_users,
        SUM(page_views) as total_page_views,
        SUM(downloads_count) as total_downloads,
        SUM(revenue_generated) as total_revenue,
        AVG(time_spent_seconds) as avg_session_duration
      FROM "UserAnalytics"
      WHERE created_at BETWEEN :startDate AND :endDate
    `, {
      replacements: { startDate, endDate },
      type: sequelize.QueryTypes.SELECT
    });

    return stats[0];
  }
}

UserAnalytics.init({
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  user_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'Users',
      key: 'id'
    },
    onUpdate: 'CASCADE',
    onDelete: 'SET NULL'
  },
  session_id: {
    type: DataTypes.STRING(255),
    allowNull: false
  },
  ip_address: {
    type: DataTypes.STRING,
    allowNull: true
  },
  user_agent: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  page_views: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  downloads_count: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  time_spent_seconds: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  revenue_generated: {
    type: DataTypes.DECIMAL(10, 2),
    defaultValue: 0
  }
}, {
  sequelize,
  modelName: 'UserAnalytics',
  tableName: 'UserAnalytics',
  timestamps: true,
  indexes: [
    {
      fields: ['user_id']
    },
    {
      fields: ['session_id']
    },
    {
      fields: ['created_at']
    }
  ]
});

module.exports = UserAnalytics;
