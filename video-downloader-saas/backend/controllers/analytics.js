const AnalyticsService = require('../services/analyticsService');
const AdService = require('../services/adService');
const { DownloadHistory, UserAnalytics, AdImpression, PaymentTransaction } = require('../models');
const { catchAsync } = require('../utils/errorHandler');

// Initialize services
const analyticsService = new AnalyticsService();
const adService = new AdService();

/**
 * @desc    Lấy thống kê dashboard tổng quan
 * @route   GET /api/analytics/dashboard
 * @access  Private/Admin
 */
exports.getDashboardStats = catchAsync(async (req, res, next) => {
  const { startDate, endDate } = req.query;
  
  const start = startDate ? new Date(startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const end = endDate ? new Date(endDate) : new Date();

  const stats = await analyticsService.generateDashboardStats(start, end);

  res.status(200).json({
    success: true,
    data: stats
  });
});

/**
 * @desc    Lấy thống kê người dùng cá nhân
 * @route   GET /api/analytics/user/stats
 * @access  Private
 */
exports.getUserAnalytics = catchAsync(async (req, res, next) => {
  const userId = req.user.id;
  const { days = 30 } = req.query;

  const analytics = await analyticsService.getUserBehaviorAnalytics(userId, parseInt(days));

  res.status(200).json({
    success: true,
    data: analytics
  });
});

/**
 * @desc    Lấy thống kê download
 * @route   GET /api/analytics/downloads
 * @access  Private/Admin
 */
exports.getDownloadStats = catchAsync(async (req, res, next) => {
  const { startDate, endDate, userTier } = req.query;
  
  const start = startDate ? new Date(startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const end = endDate ? new Date(endDate) : new Date();

  const [stats, trends, topVideos, popularFormats, tierConversion] = await Promise.all([
    DownloadHistory.getDownloadStats(start, end, userTier),
    DownloadHistory.getDailyTrends(start, end),
    DownloadHistory.getTopVideos(start, end, 10),
    DownloadHistory.getPopularFormats(start, end, 10),
    DownloadHistory.getTierConversionFunnel(start, end)
  ]);

  res.status(200).json({
    success: true,
    data: {
      period: { startDate: start, endDate: end },
      summary: stats,
      trends,
      topVideos,
      popularFormats,
      tierConversion
    }
  });
});

/**
 * @desc    Lấy thống kê doanh thu
 * @route   GET /api/analytics/revenue
 * @access  Private/Admin
 */
exports.getRevenueStats = catchAsync(async (req, res, next) => {
  const { startDate, endDate } = req.query;
  
  const start = startDate ? new Date(startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const end = endDate ? new Date(endDate) : new Date();

  const [paymentStats, adStats, dailyPayments, dailyAds] = await Promise.all([
    PaymentTransaction.getRevenueStats(start, end),
    AdImpression.getDailyRevenue(start, end),
    PaymentTransaction.getDailyRevenue(start, end),
    AdImpression.getDailyRevenue(start, end)
  ]);

  res.status(200).json({
    success: true,
    data: {
      period: { startDate: start, endDate: end },
      payments: paymentStats,
      ads: adStats,
      dailyPayments,
      dailyAds
    }
  });
});

/**
 * @desc    Lấy thống kê quảng cáo
 * @route   GET /api/analytics/ads
 * @access  Private/Admin
 */
exports.getAdStats = catchAsync(async (req, res, next) => {
  const { startDate, endDate, adType } = req.query;
  
  const start = startDate ? new Date(startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const end = endDate ? new Date(endDate) : new Date();

  const stats = await adService.getAdPerformance(start, end, adType);

  res.status(200).json({
    success: true,
    data: {
      period: { startDate: start, endDate: end },
      performance: stats
    }
  });
});

/**
 * @desc    Track ad impression
 * @route   POST /api/analytics/track/ad-impression
 * @access  Public
 */
exports.trackAdImpression = catchAsync(async (req, res, next) => {
  const { adType, adPosition, adId } = req.body;
  const userId = req.user?.id;
  const sessionId = req.sessionID;

  await adService.trackAdImpression(userId, sessionId, adType, adPosition);

  res.status(200).json({
    success: true,
    message: 'Ad impression tracked successfully'
  });
});

/**
 * @desc    Track ad click
 * @route   POST /api/analytics/track/ad-click
 * @access  Public
 */
exports.trackAdClick = catchAsync(async (req, res, next) => {
  const { adType, adPosition, adId } = req.body;
  const userId = req.user?.id;
  const sessionId = req.sessionID;

  await adService.trackAdClick(userId, sessionId, adType, adPosition, adId);

  res.status(200).json({
    success: true,
    message: 'Ad click tracked successfully'
  });
});

/**
 * @desc    Lấy user behavior analytics
 * @route   GET /api/analytics/user/behavior
 * @access  Private
 */
exports.getUserBehavior = catchAsync(async (req, res, next) => {
  const userId = req.user.id;
  const { days = 7 } = req.query;

  const behavior = await analyticsService.getUserBehaviorAnalytics(userId, parseInt(days));

  res.status(200).json({
    success: true,
    data: behavior
  });
});

/**
 * @desc    Lấy top videos
 * @route   GET /api/analytics/top-videos
 * @access  Private/Admin
 */
exports.getTopVideos = catchAsync(async (req, res, next) => {
  const { startDate, endDate, limit = 10 } = req.query;
  
  const start = startDate ? new Date(startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const end = endDate ? new Date(endDate) : new Date();

  const topVideos = await DownloadHistory.getTopVideos(start, end, parseInt(limit));

  res.status(200).json({
    success: true,
    data: {
      period: { startDate: start, endDate: end },
      topVideos
    }
  });
});

/**
 * @desc    Lấy tier conversion funnel
 * @route   GET /api/analytics/tier-conversion
 * @access  Private/Admin
 */
exports.getTierConversion = catchAsync(async (req, res, next) => {
  const { startDate, endDate } = req.query;
  
  const start = startDate ? new Date(startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const end = endDate ? new Date(endDate) : new Date();

  const conversionData = await DownloadHistory.getTierConversionFunnel(start, end);

  // Calculate conversion rates
  const totalAnonymous = conversionData.find(d => d.user_tier === 'anonymous')?.unique_users || 0;
  const totalFree = conversionData.find(d => d.user_tier === 'free')?.unique_users || 0;
  const totalPro = conversionData.find(d => d.user_tier === 'pro')?.unique_users || 0;

  const conversionRates = {
    anonymousToFree: totalAnonymous > 0 ? (totalFree / totalAnonymous) * 100 : 0,
    freeToPro: totalFree > 0 ? (totalPro / totalFree) * 100 : 0,
    anonymousToPro: totalAnonymous > 0 ? (totalPro / totalAnonymous) * 100 : 0
  };

  res.status(200).json({
    success: true,
    data: {
      period: { startDate: start, endDate: end },
      tierData: conversionData,
      conversionRates
    }
  });
});
