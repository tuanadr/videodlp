/**
 * User Tier Configuration
 * Defines restrictions and features for each user tier
 * Updated for new business model: Unlimited downloads for all tiers
 */

const TIER_RESTRICTIONS = {
  anonymous: {
    // Quality restrictions only
    maxResolution: 1080,
    allowedFormats: ['mp4', 'mp3'],
    maxFileSize: 500, // MB

    // Features
    showAds: true,
    concurrentDownloads: 1,
    priority: 'low',
    canDownloadPlaylist: false,
    canDownloadSubtitles: false,
    canBatchDownload: false,
    saveHistory: false, // Updated: No history saving for anonymous users (streaming only)

    // Quality restrictions
    maxVideoBitrate: 2000, // kbps
    maxAudioBitrate: 128,  // kbps

    // Ad configuration
    adFrequency: 'high', // high, medium, low
    preDownloadAds: true,
    bannerAds: true,
    popupAds: true,

    // Rate limiting
    requestsPerMinute: 10,
    requestsPerHour: 100
  },

  free: {
    // Quality restrictions only
    maxResolution: 1080,
    allowedFormats: ['mp4', 'mp3', 'webm'],
    maxFileSize: 1000, // MB

    // Features
    showAds: true,
    concurrentDownloads: 2,
    priority: 'normal',
    canDownloadPlaylist: false,
    canDownloadSubtitles: false, // Updated: No subtitles for free users
    canBatchDownload: false,
    saveHistory: false, // Updated: No history saving for free users (streaming only)

    // Quality restrictions
    maxVideoBitrate: 5000, // kbps
    maxAudioBitrate: 256,  // kbps

    // Ad configuration
    adFrequency: 'medium',
    preDownloadAds: true,
    bannerAds: true,
    popupAds: false,

    // Rate limiting
    requestsPerMinute: 20,
    requestsPerHour: 300
  },

  pro: {
    // No quality restrictions
    maxResolution: Infinity, // 4K, 8K unlimited
    allowedFormats: 'all',
    maxFileSize: Infinity,

    // Features
    showAds: false,
    concurrentDownloads: 5,
    priority: 'high',
    canDownloadPlaylist: true,
    canDownloadSubtitles: true,
    canBatchDownload: true,
    saveHistory: true, // Pro users can save download history

    // Quality restrictions
    maxVideoBitrate: Infinity,
    maxAudioBitrate: Infinity,

    // Ad configuration
    adFrequency: 'none',
    preDownloadAds: false,
    bannerAds: false,
    popupAds: false,

    // Rate limiting
    requestsPerMinute: 100,
    requestsPerHour: 1000,

    // Exclusive features
    features: [
      'batch_download',
      'playlist_download',
      'subtitle_download',
      'high_quality_audio',
      'priority_support',
      'api_access'
    ]
  }
};

/**
 * Pricing configuration for Pro tier
 */
const PRICING_CONFIG = {
  pro: {
    monthly: {
      price: 99000, // VND
      currency: 'VND',
      duration: 1 // months
    },
    quarterly: {
      price: 270000, // VND (10% discount)
      currency: 'VND', 
      duration: 3 // months
    },
    yearly: {
      price: 990000, // VND (15% discount)
      currency: 'VND',
      duration: 12 // months
    }
  }
};

/**
 * Ad revenue configuration
 */
const AD_CONFIG = {
  banner: {
    cpm: 0.5, // USD per 1000 impressions
    positions: ['header', 'sidebar', 'footer'],
    minDisplayTime: 3000 // ms
  },
  video: {
    cpm: 2.0,
    positions: ['pre-download', 'post-download'],
    minDisplayTime: 5000
  },
  popup: {
    cpm: 1.5,
    positions: ['modal'],
    minDisplayTime: 2000,
    maxPerSession: 2
  },
  affiliate: {
    commission: 0.1, // 10%
    categories: ['vpn', 'hosting', 'software'],
    minDisplayTime: 1000
  }
};

/**
 * Get tier restrictions for a user
 */
function getTierRestrictions(tier) {
  return TIER_RESTRICTIONS[tier] || TIER_RESTRICTIONS.anonymous;
}

/**
 * Check if user can perform action based on tier
 */
function canPerformAction(tier, action) {
  const restrictions = getTierRestrictions(tier);
  
  switch (action) {
    case 'download_playlist':
      return restrictions.canDownloadPlaylist;
    case 'download_subtitles':
      return restrictions.canDownloadSubtitles;
    case 'batch_download':
      return restrictions.canBatchDownload;
    case 'high_quality':
      return tier === 'pro';
    default:
      return true;
  }
}

/**
 * Check if format is allowed for tier
 */
function isFormatAllowed(tier, format) {
  const restrictions = getTierRestrictions(tier);
  
  if (restrictions.allowedFormats === 'all') {
    return true;
  }
  
  return restrictions.allowedFormats.includes(format);
}

/**
 * Check if resolution is allowed for tier
 */
function isResolutionAllowed(tier, height) {
  const restrictions = getTierRestrictions(tier);
  return height <= restrictions.maxResolution;
}

/**
 * Get download limits for tier (Updated: No download count limits)
 */
function getDownloadLimits(tier) {
  const restrictions = getTierRestrictions(tier);
  return {
    concurrent: restrictions.concurrentDownloads,
    maxFileSize: restrictions.maxFileSize,
    maxResolution: restrictions.maxResolution
  };
}

/**
 * Get ad configuration for tier
 */
function getAdConfig(tier) {
  const restrictions = getTierRestrictions(tier);
  return {
    showAds: restrictions.showAds,
    frequency: restrictions.adFrequency,
    preDownload: restrictions.preDownloadAds,
    banner: restrictions.bannerAds,
    popup: restrictions.popupAds
  };
}

/**
 * Get rate limiting config for tier
 */
function getRateLimitConfig(tier) {
  const restrictions = getTierRestrictions(tier);
  return {
    requestsPerMinute: restrictions.requestsPerMinute,
    requestsPerHour: restrictions.requestsPerHour
  };
}

/**
 * Calculate tier upgrade benefits (Updated: No download count benefits)
 */
function getTierUpgradeBenefits(fromTier, toTier) {
  const fromRestrictions = getTierRestrictions(fromTier);
  const toRestrictions = getTierRestrictions(toTier);

  return {
    qualityImprovement: toRestrictions.maxResolution > fromRestrictions.maxResolution,
    adRemoval: fromRestrictions.showAds && !toRestrictions.showAds,
    newFeatures: toRestrictions.features || [],
    concurrentIncrease: toRestrictions.concurrentDownloads - fromRestrictions.concurrentDownloads,
    fileSizeIncrease: toRestrictions.maxFileSize > fromRestrictions.maxFileSize
  };
}

module.exports = {
  TIER_RESTRICTIONS,
  PRICING_CONFIG,
  AD_CONFIG,
  getTierRestrictions,
  canPerformAction,
  isFormatAllowed,
  isResolutionAllowed,
  getDownloadLimits,
  getAdConfig,
  getRateLimitConfig,
  getTierUpgradeBenefits
};
