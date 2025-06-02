const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const UserAnalytics = sequelize.define('UserAnalytics', {
    userId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      field: 'user_id',
      references: {
        model: 'Users',
        key: 'id'
      }
    },
    sessionId: {
      type: DataTypes.STRING(255),
      allowNull: false,
      field: 'session_id'
    },
    ipAddress: {
      type: DataTypes.INET,
      allowNull: true,
      field: 'ip_address'
    },
    userAgent: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: 'user_agent'
    },
    pageViews: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      field: 'page_views'
    },
    downloadsCount: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      field: 'downloads_count'
    },
    timeSpentSeconds: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      field: 'time_spent_seconds'
    },
    revenueGenerated: {
      type: DataTypes.DECIMAL(10, 2),
      defaultValue: 0,
      field: 'revenue_generated'
    }
  }, {
    timestamps: true,
    tableName: 'UserAnalytics'
  });

  // Instance methods
  UserAnalytics.prototype.incrementPageViews = function() {
    this.pageViews += 1;
    return this.save();
  };

  UserAnalytics.prototype.incrementDownloads = function() {
    this.downloadsCount += 1;
    return this.save();
  };

  UserAnalytics.prototype.addTimeSpent = function(seconds) {
    this.timeSpentSeconds += seconds;
    return this.save();
  };

  UserAnalytics.prototype.addRevenue = function(amount) {
    this.revenueGenerated += parseFloat(amount);
    return this.save();
  };

  // Static methods
  UserAnalytics.findOrCreateSession = async function(userId, sessionId, ipAddress, userAgent) {
    const [analytics, created] = await this.findOrCreate({
      where: {
        userId: userId || null,
        sessionId
      },
      defaults: {
        userId: userId || null,
        sessionId,
        ipAddress,
        userAgent,
        pageViews: 0,
        downloadsCount: 0,
        timeSpentSeconds: 0,
        revenueGenerated: 0
      }
    });

    return analytics;
  };

  UserAnalytics.getSessionStats = async function(sessionId) {
    return await this.findOne({
      where: { sessionId }
    });
  };

  UserAnalytics.getUserStats = async function(userId, dateRange = null) {
    const whereClause = { userId };
    
    if (dateRange) {
      whereClause.createdAt = {
        [sequelize.Sequelize.Op.between]: [dateRange.start, dateRange.end]
      };
    }

    return await this.findAll({
      where: whereClause,
      order: [['createdAt', 'DESC']]
    });
  };

  UserAnalytics.getTotalStats = async function(dateRange = null) {
    const whereClause = {};
    
    if (dateRange) {
      whereClause.createdAt = {
        [sequelize.Sequelize.Op.between]: [dateRange.start, dateRange.end]
      };
    }

    return await this.findOne({
      where: whereClause,
      attributes: [
        [sequelize.fn('COUNT', sequelize.col('id')), 'totalSessions'],
        [sequelize.fn('SUM', sequelize.col('page_views')), 'totalPageViews'],
        [sequelize.fn('SUM', sequelize.col('downloads_count')), 'totalDownloads'],
        [sequelize.fn('SUM', sequelize.col('time_spent_seconds')), 'totalTimeSpent'],
        [sequelize.fn('SUM', sequelize.col('revenue_generated')), 'totalRevenue']
      ],
      raw: true
    });
  };

  return UserAnalytics;
};
