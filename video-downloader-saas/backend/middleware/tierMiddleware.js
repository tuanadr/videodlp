const rateLimit = require('express-rate-limit');
const { getTierRestrictions, getRateLimitConfig, canPerformAction } = require('../config/tierConfig');
const { User } = require('../models');

/**
 * Middleware to check user tier and apply restrictions
 */
const checkTierRestrictions = (requiredAction = null) => {
  return async (req, res, next) => {
    try {
      let userTier = 'anonymous';
      let user = null;

      // Get user tier
      if (req.user) {
        user = req.user;
        userTier = user.getCurrentTier();
      }

      // Check if action is allowed for this tier
      if (requiredAction && !canPerformAction(userTier, requiredAction)) {
        return res.status(403).json({
          success: false,
          message: `Tính năng này không khả dụng cho gói ${userTier}`,
          requiredTier: getRequiredTierForAction(requiredAction),
          currentTier: userTier
        });
      }

      // Add tier info to request
      req.userTier = userTier;
      req.tierRestrictions = getTierRestrictions(userTier);

      next();
    } catch (error) {
      console.error('Error in tier middleware:', error);
      res.status(500).json({
        success: false,
        message: 'Lỗi hệ thống khi kiểm tra quyền truy cập'
      });
    }
  };
};

/**
 * Middleware to check download limits (Updated: No download count limits)
 */
const checkDownloadLimits = async (req, res, next) => {
  try {
    const user = req.user;

    if (user) {
      // Only check if user account is active
      if (!user.canDownload()) {
        return res.status(403).json({
          success: false,
          message: 'Tài khoản của bạn đã bị vô hiệu hóa'
        });
      }
    }

    // No download count limits - all users can download unlimited times
    next();
  } catch (error) {
    console.error('Error checking download permissions:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi hệ thống khi kiểm tra quyền tải xuống'
    });
  }
};

/**
 * Create tier-based rate limiter
 */
const createTierRateLimiter = () => {
  return (req, res, next) => {
    const userTier = req.userTier || 'anonymous';
    const rateLimitConfig = getRateLimitConfig(userTier);
    
    // Create dynamic rate limiter based on tier
    const limiter = rateLimit({
      windowMs: 60 * 1000, // 1 minute
      max: rateLimitConfig.requestsPerMinute,
      message: {
        success: false,
        message: `Quá nhiều yêu cầu. Giới hạn ${rateLimitConfig.requestsPerMinute} yêu cầu/phút cho gói ${userTier}`,
        tier: userTier,
        limit: rateLimitConfig.requestsPerMinute
      },
      standardHeaders: true,
      legacyHeaders: false,
      keyGenerator: (req) => {
        // Use user ID for authenticated users, IP for anonymous
        return req.user ? `user_${req.user.id}` : `ip_${req.ip}`;
      }
    });

    limiter(req, res, next);
  };
};

/**
 * Middleware to check format restrictions
 */
const checkFormatRestrictions = (req, res, next) => {
  try {
    const userTier = req.userTier || 'anonymous';
    const formatId = req.body.formatId || req.params.formatId;
    
    if (formatId) {
      // Extract format from formatId (this might need adjustment based on yt-dlp format)
      const format = extractFormatFromId(formatId);
      const restrictions = getTierRestrictions(userTier);
      
      if (restrictions.allowedFormats !== 'all' && 
          !restrictions.allowedFormats.includes(format)) {
        return res.status(403).json({
          success: false,
          message: `Định dạng ${format} không được hỗ trợ cho gói ${userTier}`,
          allowedFormats: restrictions.allowedFormats,
          currentTier: userTier
        });
      }
    }

    next();
  } catch (error) {
    console.error('Error checking format restrictions:', error);
    next(); // Continue on error to avoid blocking
  }
};

/**
 * Middleware to inject ads for non-pro users
 */
const injectAds = async (req, res, next) => {
  try {
    const userTier = req.userTier || 'anonymous';
    const restrictions = getTierRestrictions(userTier);
    
    if (restrictions.showAds) {
      // Initialize ads array in response locals
      res.locals.showAds = true;
      res.locals.adConfig = {
        frequency: restrictions.adFrequency,
        preDownload: restrictions.preDownloadAds,
        banner: restrictions.bannerAds,
        popup: restrictions.popupAds
      };
    } else {
      res.locals.showAds = false;
    }

    next();
  } catch (error) {
    console.error('Error in ads middleware:', error);
    next(); // Continue on error
  }
};

/**
 * Middleware to track session downloads for anonymous users (Updated: For analytics only)
 */
const trackSessionDownloads = (req, res, next) => {
  if (!req.user) {
    // Initialize session download count for analytics only
    if (!req.session.downloadCount) {
      req.session.downloadCount = 0;
    }

    // Increment on download endpoints for analytics tracking
    if (req.path.includes('/download') || req.path.includes('/stream')) {
      req.session.downloadCount += 1;
    }
  }

  // Continue without any restrictions
  next();
};

/**
 * Middleware to check subscription expiry
 */
const checkSubscriptionExpiry = async (req, res, next) => {
  try {
    if (req.user && req.user.tier === 'pro') {
      const currentTier = req.user.getCurrentTier();
      
      // If tier changed due to expiry, update request
      if (currentTier !== 'pro') {
        req.userTier = currentTier;
        req.tierRestrictions = getTierRestrictions(currentTier);
        
        // Optionally notify user about expiry
        res.setHeader('X-Subscription-Expired', 'true');
      }
    }
    
    next();
  } catch (error) {
    console.error('Error checking subscription expiry:', error);
    next(); // Continue on error
  }
};

/**
 * Helper function to get required tier for action
 */
function getRequiredTierForAction(action) {
  const actionTierMap = {
    'download_playlist': 'pro',
    'download_subtitles': 'free',
    'batch_download': 'pro',
    'high_quality': 'pro'
  };
  
  return actionTierMap[action] || 'free';
}

/**
 * Helper function to extract format from format ID
 */
function extractFormatFromId(formatId) {
  // This is a simplified extraction - might need adjustment based on actual yt-dlp format IDs
  if (formatId.includes('mp4')) return 'mp4';
  if (formatId.includes('webm')) return 'webm';
  if (formatId.includes('mp3')) return 'mp3';
  if (formatId.includes('m4a')) return 'm4a';
  
  // Default fallback
  return 'mp4';
}

/**
 * Helper function to get next reset time
 */
function getNextResetTime() {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(0, 0, 0, 0);
  return tomorrow;
}

/**
 * Middleware to add tier info to response
 */
const addTierInfoToResponse = (req, res, next) => {
  const userTier = req.userTier || 'anonymous';
  const restrictions = req.tierRestrictions || getTierRestrictions(userTier);
  
  res.locals.userTier = userTier;
  res.locals.tierRestrictions = restrictions;
  res.locals.userId = req.user?.id || null;
  res.locals.sessionId = req.sessionID;
  
  next();
};

module.exports = {
  checkTierRestrictions,
  checkDownloadLimits,
  createTierRateLimiter,
  checkFormatRestrictions,
  injectAds,
  trackSessionDownloads,
  checkSubscriptionExpiry,
  addTierInfoToResponse
};
