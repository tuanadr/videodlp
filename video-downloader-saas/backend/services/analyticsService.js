const { UserAnalytics, AdImpression, PaymentTransaction, User } = require('../models');
const { sequelize } = require('../database');

class AnalyticsService {
  constructor() {
    this.sessionCache = new Map(); // Cache for session data
  }

  /**
   * Track page view
   */
  async trackPageView(userId, sessionId, page, userAgent, ipAddress) {
    try {
      await UserAnalytics.trackPageView(userId, sessionId, ipAddress, userAgent);
      
      // Update session cache
      this.updateSessionCache(sessionId, { lastPage: page, lastActivity: new Date() });
      
      return true;
    } catch (error) {
      console.error('Error tracking page view:', error);
      return false;
    }
  }

  /**
   * Track video info request
   */
  async trackVideoInfo(userId, sessionId, videoUrl) {
    try {
      // This could be tracked as a specific type of page view
      await this.trackPageView(userId, sessionId, 'video_info', null, null);
      
      // Additional video-specific tracking could be added here
      return true;
    } catch (error) {
      console.error('Error tracking video info:', error);
      return false;
    }
  }

  /**
   * Track download start (simplified - no download history tracking)
   */
  async trackDownloadStart(userId, sessionId, videoUrl, formatId, videoTitle, userTier) {
    try {
      // Since we removed download history, just update user analytics
      await UserAnalytics.trackDownload(userId, sessionId, 0);

      console.log(`Download started: ${videoTitle} by user ${userId || 'anonymous'} (${userTier})`);
      return { success: true, message: 'Download tracking simplified' };
    } catch (error) {
      console.error('Error tracking download start:', error);
      return null;
    }
  }

  /**
   * Track download completion (simplified - no download history tracking)
   */
  async trackDownloadComplete(userId, sessionId, videoUrl, formatId, duration, fileSizeMb = null, revenueGenerated = 0) {
    try {
      // Update user analytics only
      await UserAnalytics.trackDownload(userId, sessionId, revenueGenerated);

      console.log(`Download completed: ${videoUrl} by user ${userId || 'anonymous'}, duration: ${duration}ms`);
      return { success: true, message: 'Download completion tracked in user analytics' };
    } catch (error) {
      console.error('Error tracking download complete:', error);
      return null;
    }
  }

  /**
   * Track download error
   */
  async trackDownloadError(userId, sessionId, videoUrl, errorMessage) {
    try {
      // Could create a separate error tracking table or log to existing analytics
      console.log(`Download error for user ${userId}, session ${sessionId}: ${errorMessage}`);
      
      // For now, we'll just log it. In production, you might want to store this in a separate table
      return true;
    } catch (error) {
      console.error('Error tracking download error:', error);
      return false;
    }
  }

  /**
   * Track revenue
   */
  async trackRevenue(userId, amount, source, transactionId = null) {
    try {
      // Update user analytics
      if (userId) {
        const analytics = await UserAnalytics.findOne({
          where: { user_id: userId },
          order: [['updated_at', 'DESC']]
        });

        if (analytics) {
          analytics.revenue_generated += amount;
          await analytics.save();
        }

        // Update user total revenue
        const user = await User.findByPk(userId);
        if (user) {
          user.total_revenue_generated += amount;
          await user.save();
        }
      }

      return true;
    } catch (error) {
      console.error('Error tracking revenue:', error);
      return false;
    }
  }

  /**
   * Track ad impression
   */
  async trackAdImpression(userId, sessionId, adType, adPosition, revenue = 0) {
    try {
      await AdImpression.trackImpression(userId, sessionId, adType, adPosition, revenue);
      
      // Track revenue if any
      if (revenue > 0) {
        await this.trackRevenue(userId, revenue, 'ad_impression');
      }

      return true;
    } catch (error) {
      console.error('Error tracking ad impression:', error);
      return false;
    }
  }

  /**
   * Track ad click
   */
  async trackAdClick(userId, sessionId, adType, adPosition, revenue = 0) {
    try {
      await AdImpression.trackClick(userId, sessionId, adType, adPosition, revenue);
      
      // Track revenue if any
      if (revenue > 0) {
        await this.trackRevenue(userId, revenue, 'ad_click');
      }

      return true;
    } catch (error) {
      console.error('Error tracking ad click:', error);
      return false;
    }
  }

  /**
   * Track referral reward
   */
  async trackReferralReward(referrerId, newUserId, reward) {
    try {
      // This could be tracked in a separate referral analytics table
      // For now, we'll log it
      console.log(`Referral reward: User ${referrerId} received ${JSON.stringify(reward)} for referring user ${newUserId}`);
      
      return true;
    } catch (error) {
      console.error('Error tracking referral reward:', error);
      return false;
    }
  }

  /**
   * Update session cache
   */
  updateSessionCache(sessionId, data) {
    const existing = this.sessionCache.get(sessionId) || {};
    this.sessionCache.set(sessionId, { ...existing, ...data });
  }

  /**
   * Get session data from cache
   */
  getSessionData(sessionId) {
    return this.sessionCache.get(sessionId) || {};
  }

  /**
   * Generate dashboard statistics
   */
  async generateDashboardStats(startDate = null, endDate = null) {
    try {
      // Default to last 30 days if no dates provided
      if (!startDate) {
        startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      }
      if (!endDate) {
        endDate = new Date();
      }

      const [userStats, downloadStats, revenueStats, adStats] = await Promise.all([
        this.getUserStats(startDate, endDate),
        this.getDownloadStats(startDate, endDate),
        this.getRevenueStats(startDate, endDate),
        this.getAdStats(startDate, endDate)
      ]);

      return {
        period: { startDate, endDate },
        users: userStats,
        downloads: downloadStats,
        revenue: revenueStats,
        ads: adStats,
        generatedAt: new Date()
      };
    } catch (error) {
      console.error('Error generating dashboard stats:', error);
      throw error;
    }
  }

  /**
   * Get user statistics
   */
  async getUserStats(startDate, endDate) {
    const stats = await sequelize.query(`
      SELECT 
        COUNT(DISTINCT u.id) as total_users,
        COUNT(DISTINCT CASE WHEN u.tier = 'pro' THEN u.id END) as pro_users,
        COUNT(DISTINCT CASE WHEN u.tier = 'free' THEN u.id END) as free_users,
        COUNT(DISTINCT CASE WHEN u.created_at BETWEEN :startDate AND :endDate THEN u.id END) as new_users,
        COUNT(DISTINCT CASE WHEN u.last_login_at BETWEEN :startDate AND :endDate THEN u.id END) as active_users
      FROM "Users" u
    `, {
      replacements: { startDate, endDate },
      type: sequelize.QueryTypes.SELECT
    });

    return stats[0];
  }

  /**
   * Get download statistics (simplified - from UserAnalytics only)
   */
  async getDownloadStats(startDate, endDate) {
    // Get basic download stats from UserAnalytics instead
    const stats = await UserAnalytics.getBasicStats(startDate, endDate);

    return {
      summary: stats,
      message: 'Download history tracking removed - unlimited downloads for all tiers'
    };
  }

  /**
   * Get revenue statistics
   */
  async getRevenueStats(startDate, endDate) {
    const paymentStats = await PaymentTransaction.getRevenueStats(startDate, endDate);
    const dailyRevenue = await PaymentTransaction.getDailyRevenue(startDate, endDate);
    const adRevenue = await AdImpression.getDailyRevenue(startDate, endDate);

    return {
      payments: paymentStats,
      dailyPayments: dailyRevenue,
      dailyAds: adRevenue
    };
  }

  /**
   * Get ad statistics
   */
  async getAdStats(startDate, endDate) {
    const adStats = await AdImpression.getAdStats(startDate, endDate);
    
    return {
      performance: adStats
    };
  }

  /**
   * Get user behavior analytics
   */
  async getUserBehaviorAnalytics(userId, days = 30) {
    try {
      const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
      const endDate = new Date();

      const [analytics, payments] = await Promise.all([
        UserAnalytics.findAll({
          where: {
            user_id: userId,
            created_at: { [sequelize.Op.between]: [startDate, endDate] }
          },
          order: [['created_at', 'DESC']]
        }),
        PaymentTransaction.getUserPaymentHistory(userId, 10, 0)
      ]);

      return {
        analytics,
        payments: payments.rows,
        summary: {
          totalPageViews: analytics.reduce((sum, a) => sum + a.page_views, 0),
          totalDownloads: analytics.reduce((sum, a) => sum + a.downloads_count, 0),
          totalTimeSpent: analytics.reduce((sum, a) => sum + a.time_spent_seconds, 0),
          totalRevenue: analytics.reduce((sum, a) => sum + parseFloat(a.revenue_generated), 0)
        },
        message: 'Download history removed - showing analytics data only'
      };
    } catch (error) {
      console.error('Error getting user behavior analytics:', error);
      throw error;
    }
  }

  /**
   * Clean up old analytics data (simplified - no download history)
   */
  async cleanupOldData(daysToKeep = 90) {
    try {
      const cutoffDate = new Date(Date.now() - daysToKeep * 24 * 60 * 60 * 1000);

      // Clean up old analytics for anonymous users only
      const deletedAnalytics = await UserAnalytics.destroy({
        where: {
          user_id: null,
          created_at: { [sequelize.Op.lt]: cutoffDate }
        }
      });

      return {
        deletedAnalytics,
        message: 'Download history cleanup removed - no download history tracking'
      };
    } catch (error) {
      console.error('Error cleaning up old data:', error);
      throw error;
    }
  }
}

module.exports = AnalyticsService;
