const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const AdImpression = sequelize.define('AdImpression', {
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
      allowNull: true,
      field: 'session_id'
    },
    adType: {
      type: DataTypes.STRING(50),
      allowNull: false,
      field: 'ad_type',
      validate: {
        isIn: [['banner', 'video', 'popup', 'affiliate', 'interstitial']]
      }
    },
    adPosition: {
      type: DataTypes.STRING(50),
      allowNull: true,
      field: 'ad_position',
      validate: {
        isIn: [['header', 'sidebar', 'footer', 'pre-download', 'post-download', 'modal']]
      }
    },
    impressions: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    },
    clicks: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    },
    revenue: {
      type: DataTypes.DECIMAL(10, 2),
      defaultValue: 0
    }
  }, {
    timestamps: true,
    tableName: 'AdImpressions'
  });

  // Instance methods
  AdImpression.prototype.recordImpression = function() {
    this.impressions += 1;
    return this.save();
  };

  AdImpression.prototype.recordClick = function(revenueAmount = 0) {
    this.clicks += 1;
    this.revenue += parseFloat(revenueAmount);
    return this.save();
  };

  AdImpression.prototype.getCTR = function() {
    if (this.impressions === 0) return 0;
    return (this.clicks / this.impressions * 100).toFixed(2);
  };

  AdImpression.prototype.getRevenuePerImpression = function() {
    if (this.impressions === 0) return 0;
    return (this.revenue / this.impressions).toFixed(4);
  };

  // Static methods
  AdImpression.recordAdImpression = async function(userId, sessionId, adType, adPosition) {
    const [impression, created] = await this.findOrCreate({
      where: {
        userId: userId || null,
        sessionId,
        adType,
        adPosition,
        createdAt: {
          [sequelize.Sequelize.Op.gte]: new Date(new Date().setHours(0, 0, 0, 0))
        }
      },
      defaults: {
        userId: userId || null,
        sessionId,
        adType,
        adPosition,
        impressions: 1,
        clicks: 0,
        revenue: 0
      }
    });

    if (!created) {
      await impression.recordImpression();
    }

    return impression;
  };

  AdImpression.recordAdClick = async function(userId, sessionId, adType, adPosition, revenueAmount = 0) {
    const impression = await this.findOne({
      where: {
        userId: userId || null,
        sessionId,
        adType,
        adPosition,
        createdAt: {
          [sequelize.Sequelize.Op.gte]: new Date(new Date().setHours(0, 0, 0, 0))
        }
      }
    });

    if (impression) {
      await impression.recordClick(revenueAmount);
      return impression;
    }

    // Create new record if impression doesn't exist
    return await this.create({
      userId: userId || null,
      sessionId,
      adType,
      adPosition,
      impressions: 1,
      clicks: 1,
      revenue: parseFloat(revenueAmount)
    });
  };

  AdImpression.getAdStats = async function(dateRange = null, adType = null) {
    const whereClause = {};
    
    if (dateRange) {
      whereClause.createdAt = {
        [sequelize.Sequelize.Op.between]: [dateRange.start, dateRange.end]
      };
    }

    if (adType) {
      whereClause.adType = adType;
    }

    return await this.findAll({
      where: whereClause,
      attributes: [
        'adType',
        'adPosition',
        [sequelize.fn('SUM', sequelize.col('impressions')), 'totalImpressions'],
        [sequelize.fn('SUM', sequelize.col('clicks')), 'totalClicks'],
        [sequelize.fn('SUM', sequelize.col('revenue')), 'totalRevenue'],
        [sequelize.fn('AVG', sequelize.literal('CASE WHEN impressions > 0 THEN (clicks::float / impressions * 100) ELSE 0 END')), 'avgCTR']
      ],
      group: ['adType', 'adPosition'],
      order: [['totalRevenue', 'DESC']]
    });
  };

  AdImpression.getTotalAdRevenue = async function(dateRange = null) {
    const whereClause = {};
    
    if (dateRange) {
      whereClause.createdAt = {
        [sequelize.Sequelize.Op.between]: [dateRange.start, dateRange.end]
      };
    }

    const result = await this.findOne({
      where: whereClause,
      attributes: [
        [sequelize.fn('SUM', sequelize.col('revenue')), 'totalRevenue'],
        [sequelize.fn('SUM', sequelize.col('impressions')), 'totalImpressions'],
        [sequelize.fn('SUM', sequelize.col('clicks')), 'totalClicks']
      ],
      raw: true
    });

    return {
      totalRevenue: parseFloat(result.totalRevenue) || 0,
      totalImpressions: parseInt(result.totalImpressions) || 0,
      totalClicks: parseInt(result.totalClicks) || 0,
      overallCTR: result.totalImpressions > 0 ? 
        (result.totalClicks / result.totalImpressions * 100).toFixed(2) : 0
    };
  };

  return AdImpression;
};
