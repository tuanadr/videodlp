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
   * Stream video with analytics and ads
   */
  async streamWithAnalytics(url, formatId, user, sessionId, res) {
    const userTier = this.getUserTier(user);
    const startTime = Date.now();
    
    try {
      // Check tier limits
      await this.checkTierLimits(user, userTier);
      
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
          // Send ad data in response headers for frontend to display
          res.setHeader('X-Pre-Download-Ad', JSON.stringify(preDownloadAd));
        }
      }

      // Start streaming
      const ytDlpProcess = await this.streamVideoDirectly(url, formatId);
      
      // Apply transcoding if needed
      let outputStream = ytDlpProcess.stdout;
      if (this.needsTranscoding(formatId, userTier, videoInfo)) {
        const transcodingOptions = this.getTranscodingOptions(userTier);
        const ffmpegProcess = await this.ffmpegService.transcodeStream(
          ytDlpProcess.stdout,
          transcodingOptions
        );
        outputStream = ffmpegProcess.stdout;
      }

      // Set appropriate headers
      this.setStreamingHeaders(res, videoInfo, formatId);
      
      // Pipe to response
      outputStream.pipe(res);
      
      // Track download completion
      outputStream.on('end', async () => {
        const duration = Date.now() - startTime;
        const fileSizeMb = this.estimateFileSize(videoInfo, formatId);
        const revenueGenerated = this.calculateRevenue(userTier, fileSizeMb);
        
        await this.analyticsService.trackDownloadComplete(
          user?.id,
          sessionId,
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
      });

      // Handle errors
      outputStream.on('error', async (error) => {
        await this.analyticsService.trackDownloadError(
          user?.id,
          sessionId,
          url,
          error.message
        );
      });
      
    } catch (error) {
      await this.analyticsService.trackDownloadError(
        user?.id,
        sessionId,
        url,
        error.message
      );
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
   * Check tier limits before download
   */
  async checkTierLimits(user, userTier) {
    if (!user && userTier !== 'anonymous') {
      throw new Error('User authentication required');
    }

    if (user) {
      // Check if user can download
      if (!user.canDownload()) {
        const limits = getDownloadLimits(userTier);
        throw new Error(`Đã đạt giới hạn tải xuống hàng ngày (${limits.daily} lượt)`);
      }
    }

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
