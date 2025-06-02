const { DataTypes, Model } = require('sequelize');
const { sequelize } = require('../database');

class DownloadHistory extends Model {
  // Create download record
  static async createDownload(data) {
    const {
      userId,
      sessionId,
      videoUrl,
      videoTitle,
      formatId,
      quality,
      userTier,
      fileSizeMb = null,
      downloadDurationSeconds = null,
      revenueGenerated = 0
    } = data;

    return await DownloadHistory.create({
      user_id: userId || null,
      session_id: sessionId,
      video_url: videoUrl,
      video_title: videoTitle,
      format_id: formatId,
      quality: quality,
      file_size_mb: fileSizeMb,
      download_duration_seconds: downloadDurationSeconds,
      user_tier: userTier,
      revenue_generated: revenueGenerated
    });
  }

  // Update download with completion data
  async updateCompletion(fileSizeMb, downloadDurationSeconds, revenueGenerated = 0) {
    this.file_size_mb = fileSizeMb;
    this.download_duration_seconds = downloadDurationSeconds;
    this.revenue_generated += revenueGenerated;
    return await this.save();
  }

  // Get user's download history
  static async getUserDownloads(userId, limit = 20, offset = 0) {
    return await DownloadHistory.findAndCountAll({
      where: { user_id: userId },
      order: [['created_at', 'DESC']],
      limit,
      offset,
      attributes: [
        'id',
        'video_url',
        'video_title',
        'format_id',
        'quality',
        'file_size_mb',
        'download_duration_seconds',
        'created_at'
      ]
    });
  }

  // Get download statistics
  static async getDownloadStats(startDate, endDate, userTier = null) {
    const whereClause = {
      created_at: {
        [sequelize.Op.between]: [startDate, endDate]
      }
    };

    if (userTier) {
      whereClause.user_tier = userTier;
    }

    const stats = await DownloadHistory.findAll({
      where: whereClause,
      attributes: [
        'user_tier',
        [sequelize.fn('COUNT', sequelize.col('id')), 'total_downloads'],
        [sequelize.fn('COUNT', sequelize.fn('DISTINCT', sequelize.col('user_id'))), 'unique_users'],
        [sequelize.fn('SUM', sequelize.col('file_size_mb')), 'total_size_mb'],
        [sequelize.fn('AVG', sequelize.col('download_duration_seconds')), 'avg_duration_seconds'],
        [sequelize.fn('SUM', sequelize.col('revenue_generated')), 'total_revenue']
      ],
      group: ['user_tier'],
      raw: true
    });

    return stats;
  }

  // Get popular video formats
  static async getPopularFormats(startDate, endDate, limit = 10) {
    const stats = await DownloadHistory.findAll({
      where: {
        created_at: {
          [sequelize.Op.between]: [startDate, endDate]
        },
        format_id: {
          [sequelize.Op.ne]: null
        }
      },
      attributes: [
        'format_id',
        'quality',
        [sequelize.fn('COUNT', sequelize.col('id')), 'download_count'],
        [sequelize.fn('AVG', sequelize.col('file_size_mb')), 'avg_file_size']
      ],
      group: ['format_id', 'quality'],
      order: [[sequelize.fn('COUNT', sequelize.col('id')), 'DESC']],
      limit,
      raw: true
    });

    return stats;
  }

  // Get daily download trends
  static async getDailyTrends(startDate, endDate) {
    const stats = await sequelize.query(`
      SELECT 
        DATE(created_at) as date,
        user_tier,
        COUNT(*) as downloads,
        COUNT(DISTINCT user_id) as unique_users,
        SUM(file_size_mb) as total_size_mb,
        SUM(revenue_generated) as revenue
      FROM "DownloadHistory"
      WHERE created_at BETWEEN :startDate AND :endDate
      GROUP BY DATE(created_at), user_tier
      ORDER BY date DESC, user_tier
    `, {
      replacements: { startDate, endDate },
      type: sequelize.QueryTypes.SELECT
    });

    return stats;
  }

  // Get top downloaded videos
  static async getTopVideos(startDate, endDate, limit = 10) {
    const stats = await DownloadHistory.findAll({
      where: {
        created_at: {
          [sequelize.Op.between]: [startDate, endDate]
        },
        video_title: {
          [sequelize.Op.ne]: null
        }
      },
      attributes: [
        'video_url',
        'video_title',
        [sequelize.fn('COUNT', sequelize.col('id')), 'download_count'],
        [sequelize.fn('COUNT', sequelize.fn('DISTINCT', sequelize.col('user_id'))), 'unique_users']
      ],
      group: ['video_url', 'video_title'],
      order: [[sequelize.fn('COUNT', sequelize.col('id')), 'DESC']],
      limit,
      raw: true
    });

    return stats;
  }

  // Get user tier conversion funnel
  static async getTierConversionFunnel(startDate, endDate) {
    const stats = await sequelize.query(`
      SELECT 
        user_tier,
        COUNT(DISTINCT user_id) as unique_users,
        COUNT(*) as total_downloads,
        AVG(download_duration_seconds) as avg_duration,
        SUM(revenue_generated) as total_revenue
      FROM "DownloadHistory"
      WHERE created_at BETWEEN :startDate AND :endDate
      GROUP BY user_tier
      ORDER BY 
        CASE user_tier 
          WHEN 'anonymous' THEN 1 
          WHEN 'free' THEN 2 
          WHEN 'pro' THEN 3 
        END
    `, {
      replacements: { startDate, endDate },
      type: sequelize.QueryTypes.SELECT
    });

    return stats;
  }

  // Clean up old anonymous downloads
  static async cleanupOldAnonymousDownloads(daysOld = 30) {
    const cutoffDate = new Date(Date.now() - daysOld * 24 * 60 * 60 * 1000);
    
    const deletedCount = await DownloadHistory.destroy({
      where: {
        user_tier: 'anonymous',
        created_at: {
          [sequelize.Op.lt]: cutoffDate
        }
      }
    });

    return deletedCount;
  }
}

DownloadHistory.init({
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
  video_url: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  video_title: {
    type: DataTypes.STRING(500),
    allowNull: true
  },
  format_id: {
    type: DataTypes.STRING(100),
    allowNull: true
  },
  quality: {
    type: DataTypes.STRING(50),
    allowNull: true
  },
  file_size_mb: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: true,
    validate: {
      min: 0
    }
  },
  download_duration_seconds: {
    type: DataTypes.INTEGER,
    allowNull: true,
    validate: {
      min: 0
    }
  },
  user_tier: {
    type: DataTypes.ENUM('anonymous', 'free', 'pro'),
    allowNull: false
  },
  revenue_generated: {
    type: DataTypes.DECIMAL(10, 2),
    defaultValue: 0,
    validate: {
      min: 0
    }
  }
}, {
  sequelize,
  modelName: 'DownloadHistory',
  tableName: 'DownloadHistory',
  timestamps: true,
  indexes: [
    {
      fields: ['user_id']
    },
    {
      fields: ['session_id']
    },
    {
      fields: ['user_tier']
    },
    {
      fields: ['created_at']
    },
    {
      fields: ['video_url']
    }
  ]
});

module.exports = DownloadHistory;
