const EnhancedVideoService = require('../services/enhancedVideoService');
const StreamingMonitorService = require('../services/streamingMonitorService');
const { User } = require('../models');
const { generateSessionId } = require('../utils/sessionUtils');

// Initialize services
const enhancedVideoService = new EnhancedVideoService();
const streamingMonitor = new StreamingMonitorService();

// Start monitoring
streamingMonitor.startMonitoring();

// Make services globally available for monitoring
global.streamingService = enhancedVideoService;
global.ffmpegService = enhancedVideoService.ffmpegService;

/**
 * Stream video with adaptive bitrate (Pro users only)
 */
const streamAdaptiveBitrate = async (req, res) => {
  try {
    const { url, formatId } = req.body;
    const user = req.user;
    const sessionId = req.sessionId || generateSessionId();
    
    // Verify Pro tier
    const userTier = user ? user.getTier() : 'anonymous';
    if (userTier !== 'pro') {
      return res.status(403).json({
        success: false,
        message: 'Adaptive bitrate streaming chỉ dành cho Pro users'
      });
    }

    // Set response headers for streaming
    res.setHeader('Content-Type', 'video/mp4');
    res.setHeader('Transfer-Encoding', 'chunked');
    res.setHeader('X-Streaming-Type', 'adaptive-bitrate');
    
    // Start adaptive bitrate streaming
    await enhancedVideoService.streamWithAnalytics(
      url, 
      formatId, 
      user, 
      sessionId, 
      res,
      { adaptiveBitrate: true }
    );

  } catch (error) {
    console.error('Adaptive bitrate streaming error:', error);
    
    if (!res.headersSent) {
      res.status(500).json({
        success: false,
        message: 'Lỗi khi streaming adaptive bitrate',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }
};

/**
 * Stream video with real-time quality adjustment
 */
const streamWithQualityAdjustment = async (req, res) => {
  try {
    const { url, formatId, initialQuality } = req.body;
    const user = req.user;
    const sessionId = req.sessionId || generateSessionId();
    
    // Verify tier (Free and Pro)
    const userTier = user ? user.getTier() : 'anonymous';
    if (userTier === 'anonymous') {
      return res.status(403).json({
        success: false,
        message: 'Real-time quality adjustment không khả dụng cho anonymous users'
      });
    }

    // Set response headers for streaming
    res.setHeader('Content-Type', 'video/mp4');
    res.setHeader('Transfer-Encoding', 'chunked');
    res.setHeader('X-Streaming-Type', 'quality-adjustable');
    res.setHeader('X-Initial-Quality', initialQuality || 'auto');
    
    // Start quality adjustable streaming
    await enhancedVideoService.streamWithAnalytics(
      url, 
      formatId, 
      user, 
      sessionId, 
      res,
      { 
        qualityAdjustment: true,
        initialQuality: initialQuality || 'medium'
      }
    );

  } catch (error) {
    console.error('Quality adjustment streaming error:', error);
    
    if (!res.headersSent) {
      res.status(500).json({
        success: false,
        message: 'Lỗi khi streaming với quality adjustment',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }
};

/**
 * Get streaming statistics
 */
const getStreamingStats = async (req, res) => {
  try {
    const user = req.user;
    const userTier = user ? user.getTier() : 'anonymous';
    
    // Get basic streaming stats
    const streamingStats = enhancedVideoService.getStreamingStats();
    
    // Get performance summary
    const performanceSummary = streamingMonitor.getPerformanceSummary();
    
    // Filter stats based on user tier
    let filteredStats = {
      activeStreams: streamingStats.activeStreams,
      userTier: userTier
    };
    
    // Add more details for authenticated users
    if (user) {
      filteredStats = {
        ...filteredStats,
        totalStreams: streamingStats.totalStreams,
        successfulStreams: streamingStats.successfulStreams,
        averageStreamDuration: streamingStats.averageStreamDuration
      };
    }
    
    // Add admin-level stats for Pro users
    if (userTier === 'pro') {
      filteredStats = {
        ...filteredStats,
        streamsByTier: streamingStats.streamsByTier,
        totalDataTransferred: streamingStats.totalDataTransferred,
        performance: performanceSummary
      };
    }

    res.json({
      success: true,
      data: filteredStats
    });

  } catch (error) {
    console.error('Error getting streaming stats:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi khi lấy thống kê streaming',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Get streaming monitor data (Admin only)
 */
const getStreamingMonitor = async (req, res) => {
  try {
    const user = req.user;
    
    // Check if user is admin (you might have different admin check logic)
    if (!user || user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Chỉ admin mới có thể truy cập monitoring data'
      });
    }

    // Get comprehensive monitoring data
    const currentMetrics = streamingMonitor.getCurrentMetrics();
    const performanceHistory = streamingMonitor.getPerformanceHistory(60); // Last hour
    const performanceSummary = streamingMonitor.getPerformanceSummary();
    const streamingStats = enhancedVideoService.getStreamingStats();
    const ffmpegStats = enhancedVideoService.ffmpegService.getTranscodingStats();

    res.json({
      success: true,
      data: {
        currentMetrics,
        performanceHistory,
        performanceSummary,
        streamingStats,
        ffmpegStats,
        timestamp: Date.now()
      }
    });

  } catch (error) {
    console.error('Error getting streaming monitor data:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi khi lấy dữ liệu monitoring',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Get enhanced video info with tier-specific optimizations
 */
const getEnhancedVideoInfo = async (req, res) => {
  try {
    const { url } = req.body;
    const user = req.user;
    const sessionId = req.sessionId || generateSessionId();

    // Get enhanced video info
    const videoInfo = await enhancedVideoService.getVideoInfoWithTierRestrictions(
      url, 
      user, 
      sessionId
    );

    // Add streaming capabilities based on tier
    const userTier = user ? user.getTier() : 'anonymous';
    const streamingCapabilities = {
      adaptiveBitrate: userTier === 'pro',
      qualityAdjustment: userTier !== 'anonymous',
      concurrentStreams: enhancedVideoService.concurrentLimits[userTier] || 1,
      hardwareAcceleration: userTier === 'pro' && enhancedVideoService.qualityOptimization.enableHardwareAcceleration
    };

    res.json({
      success: true,
      data: {
        ...videoInfo,
        streamingCapabilities
      }
    });

  } catch (error) {
    console.error('Error getting enhanced video info:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi khi lấy thông tin video',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Health check for streaming services
 */
const getStreamingHealth = async (req, res) => {
  try {
    // Check FFmpeg installation
    const ffmpegHealth = await enhancedVideoService.ffmpegService.validateInstallation();
    
    // Get current system metrics
    const systemMetrics = streamingMonitor.getCurrentMetrics();
    
    // Check streaming service health
    const streamingHealth = {
      activeStreams: enhancedVideoService.activeStreams.size,
      isMonitoring: streamingMonitor.isMonitoring,
      qualityOptimization: enhancedVideoService.qualityOptimization
    };

    const overallHealth = {
      status: 'healthy',
      ffmpeg: ffmpegHealth,
      system: {
        cpu: systemMetrics.system.cpuUsage,
        memory: systemMetrics.system.memoryUsage
      },
      streaming: streamingHealth,
      timestamp: Date.now()
    };

    // Determine overall status
    if (systemMetrics.system.cpuUsage > 90 || systemMetrics.system.memoryUsage > 90) {
      overallHealth.status = 'degraded';
    }
    
    if (!ffmpegHealth.installed) {
      overallHealth.status = 'unhealthy';
    }

    res.json({
      success: true,
      data: overallHealth
    });

  } catch (error) {
    console.error('Error checking streaming health:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi khi kiểm tra health của streaming services',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

module.exports = {
  streamAdaptiveBitrate,
  streamWithQualityAdjustment,
  getStreamingStats,
  getStreamingMonitor,
  getEnhancedVideoInfo,
  getStreamingHealth
};
