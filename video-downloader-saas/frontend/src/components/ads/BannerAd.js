import React, { useEffect, useRef } from 'react';
import { useAuth } from '../../context/AuthContextV2';
import axios from 'axios';

const BannerAd = ({ position = 'header', className = '' }) => {
  const { getUserTier } = useAuth();
  const adRef = useRef(null);
  const impressionTracked = useRef(false);
  
  const tier = getUserTier();
  
  // Don't show ads for Pro users
  if (tier === 'pro') {
    return null;
  }

  // Track ad impression
  useEffect(() => {
    if (!impressionTracked.current && adRef.current) {
      const observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting && !impressionTracked.current) {
              trackAdImpression();
              impressionTracked.current = true;
            }
          });
        },
        { threshold: 0.5 }
      );

      observer.observe(adRef.current);
      
      return () => {
        if (adRef.current) {
          observer.unobserve(adRef.current);
        }
      };
    }
  }, []);

  const trackAdImpression = async () => {
    try {
      // Temporarily disable analytics to prevent errors
      console.log('Ad impression tracked:', {
        adType: 'banner',
        adPosition: position,
        adId: `banner_${position}_${Date.now()}`
      });
      // await axios.post('/api/analytics/track/ad-impression', {
      //   adType: 'banner',
      //   adPosition: position,
      //   adId: `banner_${position}_${Date.now()}`
      // });
    } catch (error) {
      console.error('Failed to track ad impression:', error);
    }
  };

  const trackAdClick = async () => {
    try {
      // Temporarily disable analytics to prevent errors
      console.log('Ad click tracked:', {
        adType: 'banner',
        adPosition: position,
        adId: `banner_${position}_${Date.now()}`
      });
      // await axios.post('/api/analytics/track/ad-click', {
      //   adType: 'banner',
      //   adPosition: position,
      //   adId: `banner_${position}_${Date.now()}`
      // });
    } catch (error) {
      console.error('Failed to track ad click:', error);
    }
  };

  const handleAdClick = (url) => {
    trackAdClick();
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const getAdContent = () => {
    // This would typically come from your ad service
    // For now, we'll show upgrade prompts
    return {
      title: 'Nâng cấp lên Pro',
      description: 'Tải video không giới hạn, chất lượng cao, không quảng cáo!',
      ctaText: 'Nâng cấp ngay',
      ctaUrl: '/upgrade',
      imageUrl: '/images/upgrade-banner.jpg'
    };
  };

  const adContent = getAdContent();

  return (
    <div 
      ref={adRef}
      className={`bg-gradient-to-r from-purple-500 to-pink-500 rounded-lg p-4 text-white ${className}`}
    >
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <h3 className="font-semibold text-lg mb-1">{adContent.title}</h3>
          <p className="text-purple-100 text-sm mb-3">{adContent.description}</p>
          <button
            onClick={() => handleAdClick(adContent.ctaUrl)}
            className="bg-white text-purple-600 px-4 py-2 rounded-lg font-medium hover:bg-purple-50 transition-colors duration-200"
          >
            {adContent.ctaText}
          </button>
        </div>
        <div className="ml-4">
          <div className="text-4xl">👑</div>
        </div>
      </div>
      
      <div className="text-xs text-purple-200 mt-2 text-right">
        Quảng cáo
      </div>
    </div>
  );
};

export default BannerAd;
