const { AdImpression } = require('../models');
const { getAdConfig, AD_CONFIG } = require('../config/tierConfig');
const AnalyticsService = require('./analyticsService');

class AdService {
  constructor() {
    this.analyticsService = new AnalyticsService();
    this.adProviders = {
      google: {
        enabled: process.env.GOOGLE_ADSENSE_ENABLED === 'true',
        publisherId: process.env.GOOGLE_ADSENSE_PUBLISHER_ID
      },
      custom: {
        enabled: true
      }
    };
  }

  /**
   * Inject banner ad into response
   */
  async injectBannerAd(response, userTier, position = 'header') {
    try {
      const adConfig = getAdConfig(userTier);
      
      if (!adConfig.showAds || !adConfig.banner) {
        return null;
      }

      const adContent = await this.getAdContent('banner', position, userTier);
      
      if (adContent) {
        // Store ad in response locals for template rendering
        response.locals.ads = response.locals.ads || [];
        response.locals.ads.push({
          position,
          html: adContent.html,
          type: 'banner',
          id: adContent.id
        });

        // Track impression
        await this.trackAdImpression(
          response.locals.userId,
          response.locals.sessionId,
          'banner',
          position
        );

        return adContent;
      }

      return null;
    } catch (error) {
      console.error('Error injecting banner ad:', error);
      return null;
    }
  }

  /**
   * Show pre-download ad
   */
  async showPreDownloadAd(userTier, userId = null, sessionId = null) {
    try {
      const adConfig = getAdConfig(userTier);
      
      if (!adConfig.showAds || !adConfig.preDownload) {
        return null;
      }

      // Determine ad type based on tier and frequency
      const adType = this.selectAdType(userTier, 'pre-download');
      const adContent = await this.getAdContent(adType, 'pre-download', userTier);

      if (adContent) {
        // Track impression
        await this.trackAdImpression(userId, sessionId, adType, 'pre-download');
        
        return {
          type: adType,
          content: adContent,
          displayTime: AD_CONFIG[adType]?.minDisplayTime || 3000,
          skippable: userTier === 'free' // Free users can skip after minimum time
        };
      }

      return null;
    } catch (error) {
      console.error('Error showing pre-download ad:', error);
      return null;
    }
  }

  /**
   * Inject affiliate popup
   */
  async injectAffiliatePopup(userTier, downloadUrl, userId = null, sessionId = null) {
    try {
      const adConfig = getAdConfig(userTier);
      
      if (!adConfig.showAds) {
        return null;
      }

      // Check if user has seen too many popups in this session
      const sessionPopupCount = await this.getSessionPopupCount(sessionId);
      if (sessionPopupCount >= AD_CONFIG.popup.maxPerSession) {
        return null;
      }

      const affiliateOffers = await this.getAffiliateOffers();
      const selectedOffer = this.selectBestOffer(affiliateOffers, userTier);

      if (selectedOffer) {
        // Track impression
        await this.trackAdImpression(userId, sessionId, 'affiliate', 'modal');

        return {
          type: 'affiliate_popup',
          title: 'Tăng tốc độ tải xuống!',
          description: selectedOffer.description,
          ctaText: selectedOffer.ctaText,
          ctaUrl: selectedOffer.url,
          imageUrl: selectedOffer.imageUrl,
          revenue: selectedOffer.commission,
          displayTime: AD_CONFIG.affiliate.minDisplayTime
        };
      }

      return null;
    } catch (error) {
      console.error('Error injecting affiliate popup:', error);
      return null;
    }
  }

  /**
   * Get ad content based on type and position
   */
  async getAdContent(adType, position, userTier) {
    try {
      switch (adType) {
        case 'banner':
          return await this.getBannerAdContent(position, userTier);
        case 'video':
          return await this.getVideoAdContent(position, userTier);
        case 'popup':
          return await this.getPopupAdContent(position, userTier);
        case 'affiliate':
          return await this.getAffiliateAdContent(position, userTier);
        default:
          return null;
      }
    } catch (error) {
      console.error('Error getting ad content:', error);
      return null;
    }
  }

  /**
   * Get banner ad content
   */
  async getBannerAdContent(position, userTier) {
    // This would integrate with Google AdSense or other ad networks
    if (this.adProviders.google.enabled) {
      return {
        id: `banner_${Date.now()}`,
        html: `
          <div class="ad-banner ad-${position}" data-ad-type="banner" data-position="${position}">
            <script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js"></script>
            <ins class="adsbygoogle"
                 style="display:block"
                 data-ad-client="${this.adProviders.google.publisherId}"
                 data-ad-slot="1234567890"
                 data-ad-format="auto"></ins>
            <script>
                 (adsbygoogle = window.adsbygoogle || []).push({});
            </script>
          </div>
        `,
        revenue: AD_CONFIG.banner.cpm / 1000 // Revenue per impression
      };
    }

    // Fallback to custom ads
    return {
      id: `custom_banner_${Date.now()}`,
      html: `
        <div class="ad-banner ad-${position} custom-ad" data-ad-type="banner" data-position="${position}">
          <div class="ad-content">
            <h3>Nâng cấp lên Pro</h3>
            <p>Tải video không giới hạn, chất lượng cao, không quảng cáo!</p>
            <a href="/upgrade" class="btn btn-primary">Nâng cấp ngay</a>
          </div>
        </div>
      `,
      revenue: 0.001 // Small revenue for internal ads
    };
  }

  /**
   * Get video ad content
   */
  async getVideoAdContent(position, userTier) {
    return {
      id: `video_${Date.now()}`,
      html: `
        <div class="ad-video" data-ad-type="video" data-position="${position}">
          <video width="100%" height="auto" controls autoplay muted>
            <source src="/ads/sample-video-ad.mp4" type="video/mp4">
            Your browser does not support the video tag.
          </video>
          <div class="ad-overlay">
            <span class="ad-label">Quảng cáo</span>
            <button class="skip-ad" style="display:none;">Bỏ qua (5s)</button>
          </div>
        </div>
      `,
      revenue: AD_CONFIG.video.cpm / 1000
    };
  }

  /**
   * Get popup ad content
   */
  async getPopupAdContent(position, userTier) {
    return {
      id: `popup_${Date.now()}`,
      html: `
        <div class="ad-popup-modal" data-ad-type="popup" data-position="${position}">
          <div class="modal-content">
            <span class="close-ad">&times;</span>
            <h2>Ưu đãi đặc biệt!</h2>
            <p>Nâng cấp lên Pro chỉ với 99.000đ/tháng</p>
            <a href="/upgrade" class="btn btn-primary">Nâng cấp ngay</a>
          </div>
        </div>
      `,
      revenue: AD_CONFIG.popup.cpm / 1000
    };
  }

  /**
   * Get affiliate ad content
   */
  async getAffiliateAdContent(position, userTier) {
    const offers = await this.getAffiliateOffers();
    const selectedOffer = this.selectBestOffer(offers, userTier);

    if (!selectedOffer) return null;

    return {
      id: `affiliate_${Date.now()}`,
      html: `
        <div class="ad-affiliate" data-ad-type="affiliate" data-position="${position}">
          <img src="${selectedOffer.imageUrl}" alt="${selectedOffer.title}">
          <h3>${selectedOffer.title}</h3>
          <p>${selectedOffer.description}</p>
          <a href="${selectedOffer.url}" target="_blank" class="btn btn-secondary">${selectedOffer.ctaText}</a>
        </div>
      `,
      revenue: selectedOffer.commission
    };
  }

  /**
   * Select ad type based on tier and position
   */
  selectAdType(userTier, position) {
    const adConfig = getAdConfig(userTier);
    
    if (position === 'pre-download') {
      // Prioritize video ads for better revenue
      if (Math.random() < 0.3) return 'video';
      if (Math.random() < 0.5) return 'affiliate';
      return 'banner';
    }
    
    return 'banner';
  }

  /**
   * Get affiliate offers
   */
  async getAffiliateOffers() {
    // This would typically come from a database or external API
    return [
      {
        id: 'vpn_offer_1',
        title: 'NordVPN - Bảo mật tuyệt đối',
        description: 'Tải video an toàn với VPN tốc độ cao. Giảm 70% cho năm đầu!',
        ctaText: 'Nhận ưu đãi',
        url: 'https://nordvpn.com/ref/your-ref-code',
        imageUrl: '/images/ads/nordvpn.jpg',
        commission: 0.15,
        category: 'vpn',
        priority: 1
      },
      {
        id: 'hosting_offer_1',
        title: 'Hostinger - Web Hosting giá rẻ',
        description: 'Tạo website của bạn chỉ từ 29.000đ/tháng. Miễn phí domain!',
        ctaText: 'Đăng ký ngay',
        url: 'https://hostinger.com/ref/your-ref-code',
        imageUrl: '/images/ads/hostinger.jpg',
        commission: 0.20,
        category: 'hosting',
        priority: 2
      }
    ];
  }

  /**
   * Select best offer based on user tier and performance
   */
  selectBestOffer(offers, userTier) {
    if (!offers || offers.length === 0) return null;
    
    // Sort by priority and commission
    const sortedOffers = offers.sort((a, b) => {
      return (b.priority * b.commission) - (a.priority * a.commission);
    });
    
    return sortedOffers[0];
  }

  /**
   * Track ad impression
   */
  async trackAdImpression(userId, sessionId, adType, position) {
    try {
      const revenue = AD_CONFIG[adType]?.cpm / 1000 || 0;
      await this.analyticsService.trackAdImpression(userId, sessionId, adType, position, revenue);
      return true;
    } catch (error) {
      console.error('Error tracking ad impression:', error);
      return false;
    }
  }

  /**
   * Track ad click
   */
  async trackAdClick(userId, sessionId, adType, position, adId) {
    try {
      const revenue = (AD_CONFIG[adType]?.cpm / 1000) * 10; // Clicks worth 10x impressions
      await this.analyticsService.trackAdClick(userId, sessionId, adType, position, revenue);
      return true;
    } catch (error) {
      console.error('Error tracking ad click:', error);
      return false;
    }
  }

  /**
   * Get session popup count
   */
  async getSessionPopupCount(sessionId) {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const count = await AdImpression.count({
        where: {
          session_id: sessionId,
          ad_type: 'popup',
          created_at: {
            [require('sequelize').Op.gte]: today
          }
        }
      });
      
      return count;
    } catch (error) {
      console.error('Error getting session popup count:', error);
      return 0;
    }
  }

  /**
   * Get ad performance metrics
   */
  async getAdPerformance(startDate, endDate, adType = null) {
    try {
      return await AdImpression.getAdStats(startDate, endDate, adType);
    } catch (error) {
      console.error('Error getting ad performance:', error);
      return [];
    }
  }
}

module.exports = AdService;
