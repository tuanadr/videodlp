const { spawn } = require('child_process');
const ffmpeg = require('fluent-ffmpeg');
const path = require('path');
const fs = require('fs');
const { getTierRestrictions } = require('../config/tierConfig');

class FFmpegService {
  constructor() {
    this.ffmpegPath = process.env.FFMPEG_PATH || 'ffmpeg';
    this.ffprobePath = process.env.FFPROBE_PATH || 'ffprobe';

    // Set ffmpeg paths
    ffmpeg.setFfmpegPath(this.ffmpegPath);
    ffmpeg.setFfprobePath(this.ffprobePath);

    // Performance optimization settings
    this.defaultPresets = {
      'anonymous': 'ultrafast',
      'free': 'fast',
      'pro': 'medium'
    };

    // Quality settings per tier
    this.qualitySettings = {
      'anonymous': { crf: 28, maxBitrate: '1000k' },
      'free': { crf: 25, maxBitrate: '2000k' },
      'pro': { crf: 20, maxBitrate: '5000k' }
    };

    // Concurrent transcoding limits
    this.activeTranscodings = new Map();
    this.maxConcurrentTranscodings = {
      'anonymous': 1,
      'free': 2,
      'pro': 5
    };
  }

  /**
   * Enhanced transcode stream with tier-based quality restrictions and performance optimization
   */
  async transcodeStream(inputStream, options = {}) {
    const {
      outputFormat = 'mp4',
      quality = 'medium',
      resolution = null,
      audioBitrate = '128k',
      videoBitrate = null,
      userTier = 'anonymous',
      sessionId = null,
      enableHardwareAcceleration = true,
      adaptiveBitrate = false
    } = options;

    // Check concurrent transcoding limits
    await this.checkConcurrentLimit(userTier, sessionId);

    const tierRestrictions = getTierRestrictions(userTier);
    const tierSettings = this.qualitySettings[userTier] || this.qualitySettings['anonymous'];

    // Apply tier-based restrictions
    const finalAudioBitrate = this.applyAudioBitrateRestriction(audioBitrate, tierRestrictions);
    const finalVideoBitrate = this.applyVideoBitrateRestriction(videoBitrate || tierSettings.maxBitrate, tierRestrictions);
    const finalResolution = this.applyResolutionRestriction(resolution, tierRestrictions);

    const ffmpegArgs = ['-hide_banner', '-loglevel', 'error'];

    // Hardware acceleration for Pro users
    if (enableHardwareAcceleration && userTier === 'pro') {
      ffmpegArgs.push('-hwaccel', 'auto');
    }

    ffmpegArgs.push(
      '-i', 'pipe:0', // Input from stdin
      '-f', outputFormat,
      '-movflags', 'frag_keyframe+empty_moov+faststart', // Optimized for streaming
      '-preset', this.defaultPresets[userTier] || 'fast',
      '-crf', tierSettings.crf.toString()
    );

    // Video settings with tier optimization
    if (finalResolution) {
      const scaleFilter = userTier === 'pro' ?
        `scale=${finalResolution}:flags=lanczos` :
        `scale=${finalResolution}:flags=bilinear`;
      ffmpegArgs.push('-vf', scaleFilter);
    }

    if (finalVideoBitrate) {
      ffmpegArgs.push('-b:v', finalVideoBitrate);
      ffmpegArgs.push('-maxrate', finalVideoBitrate);
      ffmpegArgs.push('-bufsize', this.calculateBufferSize(finalVideoBitrate));
    }

    // Audio settings
    ffmpegArgs.push('-acodec', 'aac', '-ab', finalAudioBitrate);

    // Output to stdout
    ffmpegArgs.push('pipe:1');

    const ffmpegProcess = spawn(this.ffmpegPath, ffmpegArgs);
    
    // Pipe input stream to ffmpeg
    inputStream.pipe(ffmpegProcess.stdin);

    // Handle errors
    ffmpegProcess.stderr.on('data', (data) => {
      console.log(`FFmpeg stderr: ${data}`);
    });

    ffmpegProcess.on('error', (error) => {
      console.error('FFmpeg process error:', error);
    });

    return ffmpegProcess;
  }

  /**
   * Get quality CRF value based on tier
   */
  getQualityCRF(quality, userTier) {
    const tierRestrictions = getTierRestrictions(userTier);
    
    const qualityMap = {
      'low': { anonymous: '28', free: '26', pro: '24' },
      'medium': { anonymous: '25', free: '23', pro: '21' },
      'high': { anonymous: '23', free: '21', pro: '18' },
      'ultra': { anonymous: '23', free: '21', pro: '15' }
    };

    return qualityMap[quality]?.[userTier] || qualityMap['medium'][userTier] || '23';
  }

  /**
   * Get encoding preset based on tier
   */
  getPresetForTier(userTier) {
    const presetMap = {
      'anonymous': 'ultrafast',
      'free': 'fast',
      'pro': 'medium'
    };

    return presetMap[userTier] || 'ultrafast';
  }

  /**
   * Apply audio bitrate restrictions based on tier
   */
  applyAudioBitrateRestriction(requestedBitrate, tierRestrictions) {
    const requested = parseInt(requestedBitrate);
    const maxAllowed = tierRestrictions.maxAudioBitrate;
    
    if (maxAllowed === Infinity) {
      return requestedBitrate;
    }
    
    return `${Math.min(requested, maxAllowed)}k`;
  }

  /**
   * Apply video bitrate restrictions based on tier
   */
  applyVideoBitrateRestriction(requestedBitrate, tierRestrictions) {
    if (!requestedBitrate) return null;
    
    const requested = parseInt(requestedBitrate);
    const maxAllowed = tierRestrictions.maxVideoBitrate;
    
    if (maxAllowed === Infinity) {
      return requestedBitrate;
    }
    
    return `${Math.min(requested, maxAllowed)}k`;
  }

  /**
   * Apply resolution restrictions based on tier
   */
  applyResolutionRestriction(requestedResolution, tierRestrictions) {
    if (!requestedResolution) return null;
    
    const maxHeight = tierRestrictions.maxResolution;
    if (maxHeight === Infinity) {
      return requestedResolution;
    }
    
    // Parse resolution (e.g., "1920x1080" or "1920:-2")
    if (requestedResolution.includes('x')) {
      const [width, height] = requestedResolution.split('x').map(Number);
      if (height > maxHeight) {
        const newWidth = Math.round((width * maxHeight) / height);
        return `${newWidth}x${maxHeight}`;
      }
    } else if (requestedResolution.includes(':')) {
      // Handle scale format like "720:-2"
      const [width, height] = requestedResolution.split(':');
      if (parseInt(width) > maxHeight) {
        return `${maxHeight}:-2`;
      }
    }
    
    return requestedResolution;
  }

  /**
   * Optimize for mobile devices
   */
  async optimizeForMobile(inputStream, userTier = 'anonymous') {
    return this.transcodeStream(inputStream, {
      resolution: '720:-2',
      quality: 'medium',
      audioBitrate: '96k',
      videoBitrate: '1000k',
      userTier
    });
  }

  /**
   * Extract audio only
   */
  async extractAudio(inputStream, options = {}) {
    const {
      format = 'mp3',
      bitrate = '128k',
      userTier = 'anonymous'
    } = options;

    const tierRestrictions = getTierRestrictions(userTier);
    const finalBitrate = this.applyAudioBitrateRestriction(bitrate, tierRestrictions);

    const ffmpegArgs = [
      '-i', 'pipe:0',
      '-vn', // No video
      '-acodec', format === 'mp3' ? 'libmp3lame' : 'aac',
      '-ab', finalBitrate,
      '-f', format,
      'pipe:1'
    ];

    const ffmpegProcess = spawn(this.ffmpegPath, ffmpegArgs);
    inputStream.pipe(ffmpegProcess.stdin);

    return ffmpegProcess;
  }

  /**
   * Get video information using ffprobe
   */
  async getVideoInfo(inputPath) {
    return new Promise((resolve, reject) => {
      ffmpeg.ffprobe(inputPath, (err, metadata) => {
        if (err) {
          reject(err);
        } else {
          resolve(metadata);
        }
      });
    });
  }

  /**
   * Check if transcoding is needed based on format and tier
   */
  needsTranscoding(formatId, userTier, originalFormat) {
    const tierRestrictions = getTierRestrictions(userTier);
    
    // Always transcode for anonymous users for quality control
    if (userTier === 'anonymous') {
      return true;
    }
    
    // Check if format is allowed
    if (tierRestrictions.allowedFormats !== 'all' && 
        !tierRestrictions.allowedFormats.includes(originalFormat)) {
      return true;
    }
    
    // Pro users might not need transcoding for supported formats
    if (userTier === 'pro' && ['mp4', 'webm'].includes(originalFormat)) {
      return false;
    }
    
    return true;
  }

  /**
   * Get transcoding options based on user tier
   */
  getTranscodingOptions(userTier, requestedQuality = 'medium') {
    const tierRestrictions = getTierRestrictions(userTier);
    
    return {
      quality: requestedQuality,
      audioBitrate: `${Math.min(256, tierRestrictions.maxAudioBitrate)}k`,
      videoBitrate: tierRestrictions.maxVideoBitrate !== Infinity 
        ? `${tierRestrictions.maxVideoBitrate}k` 
        : null,
      resolution: tierRestrictions.maxResolution !== Infinity 
        ? `${tierRestrictions.maxResolution}:-2` 
        : null,
      userTier
    };
  }

  /**
   * Create thumbnail from video stream
   */
  async createThumbnail(inputStream, options = {}) {
    const {
      time = '00:00:01',
      size = '320x240',
      format = 'jpg'
    } = options;

    const ffmpegArgs = [
      '-i', 'pipe:0',
      '-ss', time,
      '-vframes', '1',
      '-s', size,
      '-f', 'image2',
      '-c:v', format === 'jpg' ? 'mjpeg' : 'png',
      'pipe:1'
    ];

    const ffmpegProcess = spawn(this.ffmpegPath, ffmpegArgs);
    inputStream.pipe(ffmpegProcess.stdin);

    return ffmpegProcess;
  }

  /**
   * Check concurrent transcoding limits
   */
  async checkConcurrentLimit(userTier, sessionId) {
    const maxConcurrent = this.maxConcurrentTranscodings[userTier] || 1;
    const currentCount = this.activeTranscodings.size;

    if (currentCount >= maxConcurrent) {
      throw new Error(`Đã đạt giới hạn ${maxConcurrent} transcoding đồng thời cho tier ${userTier}`);
    }

    if (sessionId) {
      this.activeTranscodings.set(sessionId, {
        tier: userTier,
        startTime: Date.now()
      });
    }
  }

  /**
   * Remove transcoding session
   */
  removeTranscodingSession(sessionId) {
    if (sessionId) {
      this.activeTranscodings.delete(sessionId);
    }
  }

  /**
   * Calculate buffer size based on bitrate
   */
  calculateBufferSize(bitrate) {
    const bitrateNum = parseInt(bitrate.replace(/[^\d]/g, ''));
    return `${Math.max(bitrateNum * 2, 1000)}k`;
  }

  /**
   * Get optimal thread count for tier
   */
  getThreadCount(userTier) {
    const threadCounts = {
      'anonymous': 1,
      'free': 2,
      'pro': 4
    };
    return threadCounts[userTier] || 1;
  }

  /**
   * Enhanced adaptive bitrate streaming
   */
  async createAdaptiveBitrateStream(inputStream, options = {}) {
    const { userTier = 'anonymous', sessionId = null } = options;

    if (userTier !== 'pro') {
      throw new Error('Adaptive bitrate streaming chỉ dành cho Pro users');
    }

    await this.checkConcurrentLimit(userTier, sessionId);

    const qualities = [
      { resolution: '1920x1080', bitrate: '5000k', suffix: '1080p' },
      { resolution: '1280x720', bitrate: '2500k', suffix: '720p' },
      { resolution: '854x480', bitrate: '1000k', suffix: '480p' }
    ];

    const processes = [];

    for (const quality of qualities) {
      const ffmpegArgs = [
        '-hide_banner', '-loglevel', 'error',
        '-i', 'pipe:0',
        '-vf', `scale=${quality.resolution}:flags=lanczos`,
        '-b:v', quality.bitrate,
        '-maxrate', quality.bitrate,
        '-bufsize', this.calculateBufferSize(quality.bitrate),
        '-preset', 'fast',
        '-f', 'mp4',
        '-movflags', 'frag_keyframe+empty_moov',
        'pipe:1'
      ];

      const process = spawn(this.ffmpegPath, ffmpegArgs);
      inputStream.pipe(process.stdin);
      processes.push({
        process,
        quality: quality.suffix,
        stream: process.stdout
      });
    }

    return processes;
  }

  /**
   * Real-time quality adjustment based on network conditions
   */
  async adjustQualityRealtime(inputStream, options = {}) {
    const {
      userTier = 'anonymous',
      initialBitrate = '1000k',
      sessionId = null
    } = options;

    if (userTier === 'anonymous') {
      throw new Error('Real-time quality adjustment không khả dụng cho anonymous users');
    }

    await this.checkConcurrentLimit(userTier, sessionId);

    // Start with initial quality
    let currentBitrate = initialBitrate;
    const tierSettings = this.qualitySettings[userTier];

    const ffmpegArgs = [
      '-hide_banner', '-loglevel', 'error',
      '-i', 'pipe:0',
      '-b:v', currentBitrate,
      '-maxrate', currentBitrate,
      '-bufsize', this.calculateBufferSize(currentBitrate),
      '-preset', this.defaultPresets[userTier],
      '-crf', tierSettings.crf.toString(),
      '-f', 'mp4',
      '-movflags', 'frag_keyframe+empty_moov',
      'pipe:1'
    ];

    const ffmpegProcess = spawn(this.ffmpegPath, ffmpegArgs);
    inputStream.pipe(ffmpegProcess.stdin);

    // Monitor and adjust quality (simplified implementation)
    const qualityMonitor = setInterval(() => {
      // In a real implementation, this would monitor network conditions
      // and adjust the transcoding parameters accordingly
    }, 5000);

    ffmpegProcess.on('close', () => {
      clearInterval(qualityMonitor);
      this.removeTranscodingSession(sessionId);
    });

    return ffmpegProcess;
  }

  /**
   * Validate FFmpeg installation and capabilities
   */
  async validateInstallation() {
    return new Promise((resolve) => {
      const ffmpegProcess = spawn(this.ffmpegPath, ['-version']);
      let output = '';

      ffmpegProcess.stdout.on('data', (data) => {
        output += data.toString();
      });

      ffmpegProcess.on('close', (code) => {
        if (code === 0) {
          // Check for hardware acceleration support
          const hasHwAccel = output.includes('--enable-nvenc') ||
                           output.includes('--enable-vaapi') ||
                           output.includes('--enable-videotoolbox');

          resolve({
            installed: true,
            version: this.extractVersion(output),
            hardwareAcceleration: hasHwAccel,
            capabilities: this.parseCapabilities(output)
          });
        } else {
          resolve({ installed: false });
        }
      });

      ffmpegProcess.on('error', () => {
        resolve({ installed: false });
      });
    });
  }

  /**
   * Extract FFmpeg version from output
   */
  extractVersion(output) {
    const versionMatch = output.match(/ffmpeg version (\S+)/);
    return versionMatch ? versionMatch[1] : 'unknown';
  }

  /**
   * Parse FFmpeg capabilities
   */
  parseCapabilities(output) {
    return {
      codecs: output.includes('--enable-libx264'),
      filters: output.includes('--enable-libfreetype'),
      formats: output.includes('--enable-protocol=http')
    };
  }

  /**
   * Get transcoding statistics
   */
  getTranscodingStats() {
    const stats = {
      activeSessions: this.activeTranscodings.size,
      sessionsByTier: {},
      averageSessionDuration: 0
    };

    let totalDuration = 0;
    for (const [sessionId, session] of this.activeTranscodings) {
      const tier = session.tier;
      stats.sessionsByTier[tier] = (stats.sessionsByTier[tier] || 0) + 1;
      totalDuration += Date.now() - session.startTime;
    }

    if (this.activeTranscodings.size > 0) {
      stats.averageSessionDuration = Math.round(totalDuration / this.activeTranscodings.size / 1000);
    }

    return stats;
  }
}

module.exports = FFmpegService;
