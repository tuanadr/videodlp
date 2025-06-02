const { DataTypes, Model } = require('sequelize');
const { sequelize } = require('../database');

class AdImpression extends Model {
  // Track ad impression
  static async trackImpression(userId, sessionId, adType, adPosition, revenue = 0) {
    const [impression, created] = await AdImpression.findOrCreate({
      where: {
        user_id: userId || null,
        session_id: sessionId,
        ad_type: adType,
        ad_position: adPosition,
        created_at: {
          [sequelize.Op.gte]: new Date(new Date().setHours(0, 0, 0, 0))
        }
      },
      defaults: {
        user_id: userId || null,
        session_id: sessionId,
        ad_type: adType,
        ad_position: adPosition,
        impressions: 1,
        clicks: 0,
        revenue: revenue
      }
    });

    if (!created) {
      impression.impressions += 1;
      impression.revenue += revenue;
      await impression.save();
    }

    return impression;
  }

  // Track ad click
  static async trackClick(userId, sessionId, adType, adPosition, revenue = 0) {
    const impression = await AdImpression.findOne({
      where: {
        user_id: userId || null,
        session_id: sessionId,
        ad_type: adType,
        ad_position: adPosition,
        created_at: {
          [sequelize.Op.gte]: new Date(new Date().setHours(0, 0, 0, 0))
        }
      }
    });

    if (impression) {
      impression.clicks += 1;
      impression.revenue += revenue;
      await impression.save();
    } else {
      // Create new record if impression doesn't exist
      await AdImpression.create({
        user_id: userId || null,
        session_id: sessionId,
        ad_type: adType,
        ad_position: adPosition,
        impressions: 0,
        clicks: 1,
        revenue: revenue
      });
    }

    return impression;
  }

  // Get ad performance stats
  static async getAdStats(startDate, endDate, adType = null) {
    const whereClause = {
      created_at: {
        [sequelize.Op.between]: [startDate, endDate]
      }
    };

    if (adType) {
      whereClause.ad_type = adType;
    }

    const stats = await AdImpression.findAll({
      where: whereClause,
      attributes: [
        'ad_type',
        'ad_position',
        [sequelize.fn('SUM', sequelize.col('impressions')), 'total_impressions'],
        [sequelize.fn('SUM', sequelize.col('clicks')), 'total_clicks'],
        [sequelize.fn('SUM', sequelize.col('revenue')), 'total_revenue'],
        [sequelize.fn('AVG', 
          sequelize.literal('CASE WHEN impressions > 0 THEN (clicks::float / impressions::float) * 100 ELSE 0 END')
        ), 'ctr_percentage']
      ],
      group: ['ad_type', 'ad_position'],
      raw: true
    });

    return stats;
  }

  // Get daily ad revenue
  static async getDailyRevenue(startDate, endDate) {
    const stats = await sequelize.query(`
      SELECT 
        DATE(created_at) as date,
        ad_type,
        SUM(impressions) as impressions,
        SUM(clicks) as clicks,
        SUM(revenue) as revenue
      FROM "AdImpressions"
      WHERE created_at BETWEEN :startDate AND :endDate
      GROUP BY DATE(created_at), ad_type
      ORDER BY date DESC, ad_type
    `, {
      replacements: { startDate, endDate },
      type: sequelize.QueryTypes.SELECT
    });

    return stats;
  }
}

AdImpression.init({
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
    allowNull: true
  },
  ad_type: {
    type: DataTypes.STRING(50),
    allowNull: false,
    validate: {
      isIn: [['banner', 'video', 'popup', 'affiliate', 'interstitial']]
    }
  },
  ad_position: {
    type: DataTypes.STRING(50),
    allowNull: true,
    validate: {
      isIn: [['header', 'sidebar', 'footer', 'pre-download', 'post-download', 'modal']]
    }
  },
  impressions: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    validate: {
      min: 0
    }
  },
  clicks: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    validate: {
      min: 0
    }
  },
  revenue: {
    type: DataTypes.DECIMAL(10, 2),
    defaultValue: 0,
    validate: {
      min: 0
    }
  }
}, {
  sequelize,
  modelName: 'AdImpression',
  tableName: 'AdImpressions',
  timestamps: true,
  indexes: [
    {
      fields: ['user_id']
    },
    {
      fields: ['session_id']
    },
    {
      fields: ['ad_type']
    },
    {
      fields: ['created_at']
    },
    {
      fields: ['user_id', 'session_id', 'ad_type', 'ad_position', 'created_at']
    }
  ]
});

module.exports = AdImpression;
