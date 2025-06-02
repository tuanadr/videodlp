const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const DownloadHistory = sequelize.define('DownloadHistory', {
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
    videoUrl: {
      type: DataTypes.TEXT,
      allowNull: false,
      field: 'video_url'
    },
    videoTitle: {
      type: DataTypes.STRING(500),
      allowNull: true,
      field: 'video_title'
    },
    formatId: {
      type: DataTypes.STRING(100),
      allowNull: true,
      field: 'format_id'
    },
    quality: {
      type: DataTypes.STRING(50),
      allowNull: true
    },
    fileSizeMb: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true,
      field: 'file_size_mb'
    },
    downloadDurationSeconds: {
      type: DataTypes.INTEGER,
      allowNull: true,
      field: 'download_duration_seconds'
    },
    userTier: {
      type: DataTypes.ENUM('anonymous', 'free', 'pro'),
      allowNull: false,
      field: 'user_tier'
    },
    revenueGenerated: {
      type: DataTypes.DECIMAL(10, 2),
      defaultValue: 0,
      field: 'revenue_generated'
    }
  }, {
    timestamps: true,
    tableName: 'DownloadHistory'
  });

  // Instance methods
  DownloadHistory.prototype.markAsCompleted = function(duration, fileSize = null) {
    this.downloadDurationSeconds = Math.floor(duration / 1000);
    if (fileSize) {
      this.fileSizeMb = parseFloat((fileSize / (1024 * 1024)).toFixed(2));
    }
    return this.save();
  };

  DownloadHistory.prototype.addRevenue = function(amount) {
    this.revenueGenerated += parseFloat(amount);
    return this.save();
  };

  DownloadHistory.prototype.getDownloadSpeed = function() {
    if (!this.fileSizeMb || !this.downloadDurationSeconds || this.downloadDurationSeconds === 0) {
      return null;
    }
    // Return speed in MB/s
    return (this.fileSizeMb / this.downloadDurationSeconds).toFixed(2);
  };

  // Static methods
  DownloadHistory.recordDownload = async function(userId, sessionId, videoUrl, videoTitle, formatId, userTier) {
    return await this.create({
      userId: userId || null,
      sessionId,
      videoUrl,
      videoTitle,
      formatId,
      userTier
    });
  };

  DownloadHistory.getUserDownloads = async function(userId, limit = 20) {
    return await this.findAll({
      where: { userId },
      order: [['createdAt', 'DESC']],
      limit
    });
  };

  DownloadHistory.getSessionDownloads = async function(sessionId) {
    return await this.findAll({
      where: { sessionId },
      order: [['createdAt', 'DESC']]
    });
  };

  DownloadHistory.getDownloadStats = async function(dateRange = null) {
    const whereClause = {};
    
    if (dateRange) {
      whereClause.createdAt = {
        [sequelize.Sequelize.Op.between]: [dateRange.start, dateRange.end]
      };
    }

    const statsByTier = await this.findAll({
      where: whereClause,
      attributes: [
        'userTier',
        [sequelize.fn('COUNT', sequelize.col('id')), 'downloadCount'],
        [sequelize.fn('SUM', sequelize.col('file_size_mb')), 'totalSizeMb'],
        [sequelize.fn('AVG', sequelize.col('download_duration_seconds')), 'avgDurationSeconds'],
        [sequelize.fn('SUM', sequelize.col('revenue_generated')), 'totalRevenue']
      ],
      group: ['userTier'],
      raw: true
    });

    const totalStats = await this.findOne({
      where: whereClause,
      attributes: [
        [sequelize.fn('COUNT', sequelize.col('id')), 'totalDownloads'],
        [sequelize.fn('SUM', sequelize.col('file_size_mb')), 'totalSizeMb'],
        [sequelize.fn('AVG', sequelize.col('download_duration_seconds')), 'avgDurationSeconds'],
        [sequelize.fn('SUM', sequelize.col('revenue_generated')), 'totalRevenue'],
        [sequelize.fn('COUNT', sequelize.fn('DISTINCT', sequelize.col('user_id'))), 'uniqueUsers']
      ],
      raw: true
    });

    return {
      byTier: statsByTier,
      total: totalStats
    };
  };

  DownloadHistory.getPopularVideos = async function(limit = 10, dateRange = null) {
    const whereClause = {};
    
    if (dateRange) {
      whereClause.createdAt = {
        [sequelize.Sequelize.Op.between]: [dateRange.start, dateRange.end]
      };
    }

    return await this.findAll({
      where: whereClause,
      attributes: [
        'videoUrl',
        'videoTitle',
        [sequelize.fn('COUNT', sequelize.col('id')), 'downloadCount'],
        [sequelize.fn('COUNT', sequelize.fn('DISTINCT', sequelize.col('user_id'))), 'uniqueUsers']
      ],
      group: ['videoUrl', 'videoTitle'],
      order: [[sequelize.literal('downloadCount'), 'DESC']],
      limit,
      raw: true
    });
  };

  DownloadHistory.getUserDownloadCount = async function(userId, dateRange = null) {
    const whereClause = { userId };
    
    if (dateRange) {
      whereClause.createdAt = {
        [sequelize.Sequelize.Op.between]: [dateRange.start, dateRange.end]
      };
    }

    return await this.count({ where: whereClause });
  };

  DownloadHistory.getSessionDownloadCount = async function(sessionId, dateRange = null) {
    const whereClause = { sessionId };
    
    if (dateRange) {
      whereClause.createdAt = {
        [sequelize.Sequelize.Op.between]: [dateRange.start, dateRange.end]
      };
    }

    return await this.count({ where: whereClause });
  };

  DownloadHistory.getTodayDownloads = async function(userId = null, sessionId = null) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const whereClause = {
      createdAt: {
        [sequelize.Sequelize.Op.between]: [today, tomorrow]
      }
    };

    if (userId) {
      whereClause.userId = userId;
    } else if (sessionId) {
      whereClause.sessionId = sessionId;
    }

    return await this.count({ where: whereClause });
  };

  return DownloadHistory;
};
