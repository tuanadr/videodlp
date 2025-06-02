const { User, RefreshToken, Video } = require('../models');
const { Op } = require('sequelize');
const logger = require('../utils/logger');
const { 
  NotFoundError, 
  ConflictError, 
  ValidationError 
} = require('../utils/errorHandler');

/**
 * User Service - Handles all user-related database operations
 * Implements caching, optimization, and error handling
 */
class UserService {
  /**
   * Find user by ID with optional includes
   */
  static async findById(id, options = {}) {
    const { includeVideos = false, includeTokens = false } = options;
    
    const include = [];
    if (includeVideos) {
      include.push({
        model: Video,
        as: 'videos',
        limit: 10,
        order: [['createdAt', 'DESC']]
      });
    }
    
    if (includeTokens) {
      include.push({
        model: RefreshToken,
        as: 'refreshTokens',
        where: { isRevoked: false },
        required: false
      });
    }

    const user = await User.findByPk(id, {
      include,
      attributes: { exclude: ['password'] }
    });

    if (!user) {
      throw new NotFoundError('User not found');
    }

    return user;
  }

  /**
   * Find user by email
   */
  static async findByEmail(email, includePassword = false) {
    const attributes = includePassword 
      ? undefined 
      : { exclude: ['password'] };

    const user = await User.findOne({
      where: { email: email.toLowerCase() },
      attributes
    });

    return user;
  }

  /**
   * Create new user with validation
   */
  static async createUser(userData) {
    const { name, email, password } = userData;

    // Check if user already exists
    const existingUser = await this.findByEmail(email);
    if (existingUser) {
      throw new ConflictError('Email already registered');
    }

    try {
      const user = await User.create({
        name: name.trim(),
        email: email.toLowerCase(),
        password,
        role: 'user',
        subscription: 'free',
        isActive: true
      });

      logger.info('New user created', { 
        userId: user.id, 
        email: user.email 
      });

      // Return user without password
      const { password: _, ...userWithoutPassword } = user.toJSON();
      return userWithoutPassword;
    } catch (error) {
      logger.error('Failed to create user', { 
        email, 
        error: error.message 
      });
      throw error;
    }
  }

  /**
   * Update user profile
   */
  static async updateProfile(userId, updateData) {
    const user = await User.findByPk(userId);
    if (!user) {
      throw new NotFoundError('User not found');
    }

    // Validate email uniqueness if email is being updated
    if (updateData.email && updateData.email !== user.email) {
      const existingUser = await this.findByEmail(updateData.email);
      if (existingUser) {
        throw new ConflictError('Email already in use');
      }
    }

    try {
      await user.update({
        ...updateData,
        email: updateData.email?.toLowerCase()
      });

      logger.info('User profile updated', { 
        userId, 
        updatedFields: Object.keys(updateData) 
      });

      return await this.findById(userId);
    } catch (error) {
      logger.error('Failed to update user profile', { 
        userId, 
        error: error.message 
      });
      throw error;
    }
  }

  /**
   * Update user password
   */
  static async updatePassword(userId, newPassword) {
    const user = await User.findByPk(userId);
    if (!user) {
      throw new NotFoundError('User not found');
    }

    try {
      await user.update({ password: newPassword });
      
      // Revoke all refresh tokens for security
      await RefreshToken.update(
        { isRevoked: true },
        { where: { userId, isRevoked: false } }
      );

      logger.security('Password updated and tokens revoked', { userId });
      
      return true;
    } catch (error) {
      logger.error('Failed to update password', { 
        userId, 
        error: error.message 
      });
      throw error;
    }
  }

  /**
   * Get user statistics
   */
  static async getUserStats(userId) {
    const user = await User.findByPk(userId, {
      include: [
        {
          model: Video,
          as: 'videos',
          attributes: []
        }
      ],
      attributes: [
        'id',
        'downloadCount',
        'dailyDownloadCount',
        'lastDownloadDate',
        'subscription',
        'bonusDownloads'
      ]
    });

    if (!user) {
      throw new NotFoundError('User not found');
    }

    const totalVideos = await Video.count({
      where: { userId }
    });

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const todayVideos = await Video.count({
      where: {
        userId,
        createdAt: { [Op.gte]: todayStart }
      }
    });

    return {
      totalDownloads: user.downloadCount || 0,
      dailyDownloads: user.dailyDownloadCount || 0,
      totalVideos,
      todayVideos,
      subscription: user.subscription,
      bonusDownloads: user.bonusDownloads || 0,
      lastDownloadDate: user.lastDownloadDate
    };
  }

  /**
   * Increment download count
   */
  static async incrementDownloadCount(userId) {
    const user = await User.findByPk(userId);
    if (!user) {
      throw new NotFoundError('User not found');
    }

    const today = new Date();
    const lastDownload = user.lastDownloadDate;
    
    // Reset daily count if it's a new day
    const isNewDay = !lastDownload || 
      lastDownload.toDateString() !== today.toDateString();

    const updateData = {
      downloadCount: (user.downloadCount || 0) + 1,
      dailyDownloadCount: isNewDay ? 1 : (user.dailyDownloadCount || 0) + 1,
      lastDownloadDate: today
    };

    await user.update(updateData);

    logger.info('Download count incremented', { 
      userId, 
      totalDownloads: updateData.downloadCount,
      dailyDownloads: updateData.dailyDownloadCount 
    });

    return updateData;
  }

  /**
   * Check download permissions (Updated: No download count limits)
   */
  static async checkDownloadLimits(userId) {
    const user = await User.findByPk(userId);
    if (!user) {
      throw new NotFoundError('User not found');
    }

    // All users can download unlimited times
    // Only check if account is active
    return {
      canDownload: user.isActive !== false,
      reason: user.isActive !== false ? null : 'account_disabled'
    };
  }

  /**
   * Deactivate user account
   */
  static async deactivateUser(userId) {
    const user = await User.findByPk(userId);
    if (!user) {
      throw new NotFoundError('User not found');
    }

    await user.update({ isActive: false });
    
    // Revoke all refresh tokens
    await RefreshToken.update(
      { isRevoked: true },
      { where: { userId, isRevoked: false } }
    );

    logger.security('User account deactivated', { userId });
    
    return true;
  }
}

module.exports = UserService;
