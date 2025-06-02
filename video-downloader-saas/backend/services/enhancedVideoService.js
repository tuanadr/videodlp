const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

const FFmpegService = require('./ffmpegService');
const AnalyticsService = require('./analyticsService');
const AdService = require('./adService');
const { getTierRestrictions, isFormatAllowed, isResolutionAllowed, getDownloadLimits } = require('../config/tierConfig');
const { User } = require('../models');

class EnhancedVideoService {
  constructor() {
    this.ffmpegService = new FFmpegService();
    this.analyticsService = new AnalyticsService();
    this.adService = new AdService();
    this.ytDlpPath = process.env.YT_DLP_PATH || 'yt-dlp';

    // Performance monitoring
    this.activeStreams = new Map();
    this.streamMetrics = {
      totalStreams: 0,
      successfulStreams: 0,
      failedStreams: 0,
      averageStreamDuration: 0,
      totalDataTransferred: 0
    };

    // Quality optimization settings
    this.qualityOptimization = {
      enableAdaptiveBitrate: process.env.ENABLE_ADAPTIVE_BITRATE === 'true',
      enableHardwareAcceleration: process.env.ENABLE_HARDWARE_ACCEL === 'true',
      enableRealTimeQualityAdjustment: process.env.ENABLE_REALTIME_QUALITY === 'true',
      enableConcurrentStreaming: process.env.ENABLE_CONCURRENT_STREAMING === 'true'
    };

    // Concurrent streaming limits per tier
    this.concurrentLimits = {
      'anonymous': 1,
      'free': 2,
      'pro': 5
    };
  }

  /**
   * Get video info with tier restrictions
   */
  async getVideoInfoWithTierRestrictions(url, user, sessionId) {
    try {
      const userTier = this.getUserTier(user);
      
      // Track analytics
      await this.analyticsService.trackVideoInfo(user?.id, sessionId, url);
      
      // Get video info from yt-dlp
      const videoInfo = await this.getVideoInfo(url);
      
      // Filter formats based on tier
      const allowedFormats = this.filterFormatsByTier(videoInfo.formats, userTier);
      
      // Add tier restrictions info
      const tierRestrictions = getTierRestrictions(userTier);
      
      return {
        ...videoInfo,
        formats: allowedFormats,
        tierRestrictions: {
          maxResolution: tierRestrictions.maxResolution,
          allowedFormats: tierRestrictions.allowedFormats,
          dailyDownloads: tierRestrictions.dailyDownloads,
          showAds: tierRestrictions.showAds
        },
        userTier
      };
    } catch (error) {
      console.error('Error getting video info with tier restrictions:', error);
      throw error;
    }
  }

  /**
   * Enhanced stream video with analytics, ads, and performance optimization
   */
  async streamWithAnalytics(url, formatId, user, sessionId, res, options = {}) {
    const userTier = this.getUserTier(user);
    const startTime = Date.now();
    const streamId = `${sessionId}_${Date.now()}`;

    try {
      // Check concurrent streaming limits
      await this.checkConcurrentStreamingLimits(userTier, sessionId);

      // Check tier limits
      await this.checkTierLimits(user, userTier);

      // Register active stream
      this.registerActiveStream(streamId, userTier, sessionId, url);

      // Get video info for tracking
      const videoInfo = await this.getVideoInfo(url);

      // Track download start
      const downloadRecord = await this.analyticsService.trackDownloadStart(
        user?.id,
        sessionId,
        url,
        formatId,
        videoInfo.title,
        userTier
      );

      // Inject ads for non-pro users
      if (userTier !== 'pro') {
        const preDownloadAd = await this.adService.showPreDownloadAd(userTier, user?.id, sessionId);
        if (preDownloadAd) {
          res.setHeader('X-Pre-Download-Ad', JSON.stringify(preDownloadAd));
        }
      }

      // Determine streaming strategy based on tier and options
      let outputStream;

      if (this.qualityOptimization.enableAdaptiveBitrate && userTier === 'pro' && options.adaptiveBitrate) {
        // Adaptive bitrate streaming for Pro users
        outputStream = await this.createAdaptiveBitrateStream(url, formatId, userTier, sessionId);
      } else if (this.qualityOptimization.enableRealTimeQualityAdjustment && userTier !== 'anonymous') {
        // Real-time quality adjustment for Free and Pro users
        outputStream = await this.createQualityAdjustableStream(url, formatId, userTier, sessionId);
      } else {
        // Standard streaming with optional transcoding
        outputStream = await this.createStandardStream(url, formatId, userTier, sessionId, videoInfo);
      }

      // Set enhanced streaming headers
      this.setEnhancedStreamingHeaders(res, videoInfo, formatId, userTier);

      // Setup stream monitoring
      this.setupStreamMonitoring(outputStream, streamId, startTime);

      // Pipe to response with error handling
      outputStream.pipe(res);

      // Track download completion
      outputStream.on('end', async () => {
        const duration = Date.now() - startTime;
        const fileSizeMb = this.estimateFileSize(videoInfo, formatId);
        const revenueGenerated = this.calculateRevenue(userTier, fileSizeMb);

        await this.completeStreamTracking(
          user?.id,
          sessionId,
          streamId,
          url,
          formatId,
          duration,
          fileSizeMb,
          revenueGenerated
        );

        // Update user stats
        if (user) {
          await this.updateUserDownloadStats(user);
        }

        // Cleanup
        this.unregisterActiveStream(streamId);
      });

      // Handle errors
      outputStream.on('error', async (error) => {
        await this.handleStreamError(user?.id, sessionId, streamId, url, error);
        this.unregisterActiveStream(streamId);
      });

      // Handle client disconnect
      res.on('close', () => {
        this.handleClientDisconnect(streamId);
      });

    } catch (error) {
      await this.handleStreamError(user?.id, sessionId, streamId, url, error);
      this.unregisterActiveStream(streamId);
      throw error;
    }
  }

  /**
   * Get video info using yt-dlp
   */
  async getVideoInfo(url) {
    return new Promise((resolve, reject) => {
      const args = [
        '--dump-json',
        '--no-warnings',
        url
      ];

      const process = spawn(this.ytDlpPath, args);
      let output = '';
      let error = '';

      process.stdout.on('data', (data) => {
        output += data.toString();
      });

      process.stderr.on('data', (data) => {
        error += data.toString();
      });

      process.on('close', (code) => {
        if (code === 0) {
          try {
            const videoInfo = JSON.parse(output);
            resolve(videoInfo);
          } catch (parseError) {
            reject(new Error('Failed to parse video info'));
          }
        } else {
          reject(new Error(`yt-dlp failed: ${error}`));
        }
      });
    });
  }

  /**
   * Stream video directly using yt-dlp
   */
  async streamVideoDirectly(url, formatId) {
    const args = [
      '--format', formatId,
      '--output', '-',
      '--no-warnings',
      url
    ];

    return spawn(this.ytDlpPath, args);
  }

  /**
   * Filter formats based on user tier
   */
  filterFormatsByTier(formats, tier) {
    const restrictions = getTierRestrictions(tier);
    
    return formats.filter(format => {
      // Check resolution limits
      if (format.height && format.height > restrictions.maxResolution) {
        return false;
      }
      
      // Check format type restrictions
      if (restrictions.allowedFormats !== 'all' && 
          !restrictions.allowedFormats.includes(format.ext)) {
        return false;
      }
      
      // Check file size limits
      if (format.filesize && restrictions.maxFileSize !== Infinity) {
        const fileSizeMb = format.filesize / (1024 * 1024);
        if (fileSizeMb > restrictions.maxFileSize) {
          return false;
        }
      }
      
      return true;
    });
  }

  /**
   * Check tier limits before download (Updated: No download count limits)
   */
  async checkTierLimits(user, userTier) {
    if (user) {
      // Only check if user account is active
      if (!user.canDownload()) {
        throw new Error('Tài khoản của bạn đã bị vô hiệu hóa');
      }
    }

    // No download count limits - all users can download unlimited times
    return true;
  }

  /**
   * Get user tier
   */
  getUserTier(user) {
    if (!user) return 'anonymous';
    return user.getCurrentTier();
  }

  /**
   * Check if transcoding is needed
   */
  needsTranscoding(formatId, userTier, videoInfo) {
    return this.ffmpegService.needsTranscoding(formatId, userTier, videoInfo.ext);
  }

  /**
   * Get transcoding options for user tier
   */
  getTranscodingOptions(userTier) {
    return this.ffmpegService.getTranscodingOptions(userTier);
  }

  /**
   * Set streaming headers
   */
  setStreamingHeaders(res, videoInfo, formatId) {
    const format = videoInfo.formats.find(f => f.format_id === formatId);
    
    if (format) {
      res.setHeader('Content-Type', this.getContentType(format.ext));
      
      if (format.filesize) {
        res.setHeader('Content-Length', format.filesize);
      }
      
      // Enable range requests for video streaming
      res.setHeader('Accept-Ranges', 'bytes');
      
      // Set filename for download
      const filename = this.generateFilename(videoInfo.title, format.ext);
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    }
  }

  /**
   * Get content type for file extension
   */
  getContentType(ext) {
    const contentTypes = {
      'mp4': 'video/mp4',
      'webm': 'video/webm',
      'mkv': 'video/x-matroska',
      'avi': 'video/x-msvideo',
      'mov': 'video/quicktime',
      'mp3': 'audio/mpeg',
      'aac': 'audio/aac',
      'ogg': 'audio/ogg',
      'wav': 'audio/wav'
    };
    
    return contentTypes[ext] || 'application/octet-stream';
  }

  /**
   * Generate safe filename
   */
  generateFilename(title, ext) {
    // Remove invalid characters and limit length
    const safeTitle = title
      .replace(/[^\w\s-]/g, '')
      .replace(/\s+/g, '_')
      .substring(0, 100);
    
    return `${safeTitle}.${ext}`;
  }

  /**
   * Estimate file size
   */
  estimateFileSize(videoInfo, formatId) {
    const format = videoInfo.formats.find(f => f.format_id === formatId);
    if (format && format.filesize) {
      return format.filesize / (1024 * 1024); // Convert to MB
    }
    
    // Estimate based on duration and quality
    const duration = videoInfo.duration || 300; // Default 5 minutes
    const estimatedBitrate = this.estimateBitrate(format);
    return (duration * estimatedBitrate) / (8 * 1024 * 1024); // Convert to MB
  }

  /**
   * Estimate bitrate for format
   */
  estimateBitrate(format) {
    if (format.tbr) return format.tbr * 1000; // Convert to bps
    if (format.abr && format.vbr) return (format.abr + format.vbr) * 1000;
    
    // Default estimates based on resolution
    const height = format.height || 480;
    if (height >= 2160) return 25000000; // 4K
    if (height >= 1440) return 16000000; // 1440p
    if (height >= 1080) return 8000000;  // 1080p
    if (height >= 720) return 5000000;   // 720p
    return 2500000; // 480p or lower
  }

  /**
   * Calculate revenue generated from download
   */
  calculateRevenue(userTier, fileSizeMb) {
    // Revenue calculation based on tier and file size
    const revenueRates = {
      anonymous: 0.001, // $0.001 per MB
      free: 0.0005,     // $0.0005 per MB
      pro: 0            // No ad revenue for pro users
    };
    
    return (revenueRates[userTier] || 0) * fileSizeMb;
  }

  /**
   * Check concurrent streaming limits
   */
  async checkConcurrentStreamingLimits(userTier, sessionId) {
    if (!this.qualityOptimization.enableConcurrentStreaming) {
      return true;
    }

    const maxConcurrent = this.concurrentLimits[userTier] || 1;
    const currentStreams = Array.from(this.activeStreams.values())
      .filter(stream => stream.tier === userTier);

    if (currentStreams.length >= maxConcurrent) {
      throw new Error(`Đã đạt giới hạn ${maxConcurrent} stream đồng thời cho tier ${userTier}`);
    }

    return true;
  }

  /**
   * Register active stream
   */
  registerActiveStream(streamId, userTier, sessionId, url) {
    this.activeStreams.set(streamId, {
      tier: userTier,
      sessionId,
      url,
      startTime: Date.now(),
      bytesTransferred: 0
    });

    this.streamMetrics.totalStreams++;
  }

  /**
   * Unregister active stream
   */
  unregisterActiveStream(streamId) {
    const stream = this.activeStreams.get(streamId);
    if (stream) {
      const duration = Date.now() - stream.startTime;
      this.updateStreamMetrics(duration, stream.bytesTransferred, true);
      this.activeStreams.delete(streamId);
    }
  }

  /**
   * Create adaptive bitrate stream (Pro only)
   */
  async createAdaptiveBitrateStream(url, formatId, userTier, sessionId) {
    const ytDlpProcess = await this.streamVideoDirectly(url, formatId);

    const adaptiveStreams = await this.ffmpegService.createAdaptiveBitrateStream(
      ytDlpProcess.stdout,
      { userTier, sessionId }
    );

    // Return the highest quality stream for now
    // In a full implementation, this would handle multiple quality streams
    return adaptiveStreams[0].stream;
  }

  /**
   * Create quality adjustable stream
   */
  async createQualityAdjustableStream(url, formatId, userTier, sessionId) {
    const ytDlpProcess = await this.streamVideoDirectly(url, formatId);

    const adjustableProcess = await this.ffmpegService.adjustQualityRealtime(
      ytDlpProcess.stdout,
      { userTier, sessionId }
    );

    return adjustableProcess.stdout;
  }

  /**
   * Create standard stream with optional transcoding
   */
  async createStandardStream(url, formatId, userTier, sessionId, videoInfo) {
    const ytDlpProcess = await this.streamVideoDirectly(url, formatId);

    // Apply transcoding if needed
    if (this.needsTranscoding(formatId, userTier, videoInfo)) {
      const transcodingOptions = {
        ...this.getTranscodingOptions(userTier),
        sessionId,
        enableHardwareAcceleration: this.qualityOptimization.enableHardwareAcceleration
      };

      const ffmpegProcess = await this.ffmpegService.transcodeStream(
        ytDlpProcess.stdout,
        transcodingOptions
      );

      return ffmpegProcess.stdout;
    }

    return ytDlpProcess.stdout;
  }

  /**
   * Set enhanced streaming headers
   */
  setEnhancedStreamingHeaders(res, videoInfo, formatId, userTier) {
    // Set basic headers
    this.setStreamingHeaders(res, videoInfo, formatId);

    // Add tier-specific headers
    res.setHeader('X-User-Tier', userTier);
    res.setHeader('X-Stream-Quality', this.getStreamQuality(userTier));

    // Add performance headers
    if (userTier === 'pro') {
      res.setHeader('X-Hardware-Acceleration', this.qualityOptimization.enableHardwareAcceleration);
      res.setHeader('X-Adaptive-Bitrate', this.qualityOptimization.enableAdaptiveBitrate);
    }

    // Add caching headers
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
  }

  /**
   * Setup stream monitoring
   */
  setupStreamMonitoring(outputStream, streamId, startTime) {
    let bytesTransferred = 0;

    outputStream.on('data', (chunk) => {
      bytesTransferred += chunk.length;

      // Update active stream stats
      const stream = this.activeStreams.get(streamId);
      if (stream) {
        stream.bytesTransferred = bytesTransferred;
      }
    });

    // Monitor stream health every 10 seconds
    const healthMonitor = setInterval(() => {
      const stream = this.activeStreams.get(streamId);
      if (!stream) {
        clearInterval(healthMonitor);
        return;
      }

      const duration = Date.now() - startTime;
      const speed = bytesTransferred / (duration / 1000); // bytes per second

      // Log performance metrics
      console.log(`Stream ${streamId}: ${(bytesTransferred / 1024 / 1024).toFixed(2)}MB transferred, ${(speed / 1024 / 1024).toFixed(2)}MB/s`);
    }, 10000);

    outputStream.on('end', () => {
      clearInterval(healthMonitor);
    });

    outputStream.on('error', () => {
      clearInterval(healthMonitor);
    });
  }

  /**
   * Complete stream tracking
   */
  async completeStreamTracking(userId, sessionId, streamId, url, formatId, duration, fileSizeMb, revenueGenerated) {
    try {
      await this.analyticsService.trackDownloadComplete(
        userId,
        sessionId,
        url,
        formatId,
        duration,
        fileSizeMb,
        revenueGenerated
      );

      this.streamMetrics.successfulStreams++;
      this.streamMetrics.totalDataTransferred += fileSizeMb;

    } catch (error) {
      console.error('Error completing stream tracking:', error);
    }
  }

  /**
   * Handle stream error
   */
  async handleStreamError(userId, sessionId, streamId, url, error) {
    try {
      await this.analyticsService.trackDownloadError(
        userId,
        sessionId,
        url,
        error.message
      );

      this.streamMetrics.failedStreams++;

      console.error(`Stream ${streamId} error:`, error.message);

    } catch (trackingError) {
      console.error('Error tracking stream error:', trackingError);
    }
  }

  /**
   * Handle client disconnect
   */
  handleClientDisconnect(streamId) {
    console.log(`Client disconnected from stream ${streamId}`);
    this.unregisterActiveStream(streamId);
  }

  /**
   * Update stream metrics
   */
  updateStreamMetrics(duration, bytesTransferred, successful) {
    if (successful) {
      // Update average duration
      const totalDuration = this.streamMetrics.averageStreamDuration * this.streamMetrics.successfulStreams + duration;
      this.streamMetrics.averageStreamDuration = totalDuration / (this.streamMetrics.successfulStreams + 1);
    }
  }

  /**
   * Get stream quality for tier
   */
  getStreamQuality(userTier) {
    const qualityMap = {
      'anonymous': 'standard',
      'free': 'enhanced',
      'pro': 'premium'
    };
    return qualityMap[userTier] || 'standard';
  }

  /**
   * Get streaming statistics
   */
  getStreamingStats() {
    return {
      ...this.streamMetrics,
      activeStreams: this.activeStreams.size,
      streamsByTier: this.getStreamsByTier(),
      ffmpegStats: this.ffmpegService.getTranscodingStats()
    };
  }

  /**
   * Get active streams by tier
   */
  getStreamsByTier() {
    const streamsByTier = {};
    for (const stream of this.activeStreams.values()) {
      streamsByTier[stream.tier] = (streamsByTier[stream.tier] || 0) + 1;
    }
    return streamsByTier;
  }

  /**
   * Update user download statistics
   */
  async updateUserDownloadStats(user) {
    try {
      await user.incrementDownloadCount();
      return true;
    } catch (error) {
      console.error('Error updating user download stats:', error);
      return false;
    }
  }
}

module.exports = EnhancedVideoService;
