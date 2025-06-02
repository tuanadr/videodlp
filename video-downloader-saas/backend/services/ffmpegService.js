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
  }

  /**
   * Transcode stream with tier-based quality restrictions
   */
  async transcodeStream(inputStream, options = {}) {
    const {
      outputFormat = 'mp4',
      quality = 'medium',
      resolution = null,
      audioBitrate = '128k',
      videoBitrate = null,
      userTier = 'anonymous'
    } = options;

    const tierRestrictions = getTierRestrictions(userTier);
    
    // Apply tier-based restrictions
    const finalAudioBitrate = this.applyAudioBitrateRestriction(audioBitrate, tierRestrictions);
    const finalVideoBitrate = this.applyVideoBitrateRestriction(videoBitrate, tierRestrictions);
    const finalResolution = this.applyResolutionRestriction(resolution, tierRestrictions);

    const ffmpegArgs = [
      '-i', 'pipe:0', // Input from stdin
      '-f', outputFormat,
      '-movflags', 'frag_keyframe+empty_moov', // For streaming
      '-preset', this.getPresetForTier(userTier),
      '-crf', this.getQualityCRF(quality, userTier)
    ];

    // Video settings
    if (finalResolution) {
      ffmpegArgs.push('-vf', `scale=${finalResolution}`);
    }
    
    if (finalVideoBitrate) {
      ffmpegArgs.push('-b:v', finalVideoBitrate);
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
   * Validate FFmpeg installation
   */
  async validateInstallation() {
    return new Promise((resolve) => {
      const ffmpegProcess = spawn(this.ffmpegPath, ['-version']);
      
      ffmpegProcess.on('close', (code) => {
        resolve(code === 0);
      });
      
      ffmpegProcess.on('error', () => {
        resolve(false);
      });
    });
  }
}

module.exports = FFmpegService;
