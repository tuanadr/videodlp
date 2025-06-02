import React, { useEffect, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useLocation } from 'react-router-dom';

/**
 * AnalyticsTracker Component
 * Automatically tracks page views and user interactions
 */
const AnalyticsTracker = ({ children }) => {
  const { trackPageView, isAuthenticated, user } = useAuth();
  const location = useLocation();

  // Track page views when location changes
  useEffect(() => {
    const trackPage = async () => {
      try {
        await trackPageView(location.pathname);
      } catch (error) {
        console.error('Failed to track page view:', error);
      }
    };

    trackPage();
  }, [location.pathname, trackPageView]);

  // Track session duration
  useEffect(() => {
    const startTime = Date.now();
    
    const handleBeforeUnload = () => {
      const sessionDuration = Date.now() - startTime;
      
      // Send session duration to analytics (temporarily disabled)
      if (navigator.sendBeacon) {
        const data = {
          sessionDuration: Math.floor(sessionDuration / 1000),
          page: location.pathname,
          userId: user?.id,
          timestamp: new Date().toISOString()
        };

        console.log('Session duration tracked:', data);
        // navigator.sendBeacon('/api/analytics/track/session-duration', JSON.stringify(data));
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      handleBeforeUnload();
    };
  }, [location.pathname, user?.id]);

  return <>{children}</>;
};

/**
 * Hook for tracking specific events
 */
export const useAnalytics = () => {
  const { trackAdImpression, trackAdClick, user } = useAuth();

  const trackEvent = useCallback(async (eventType, eventData) => {
    try {
      const payload = {
        ...eventData,
        userId: user?.id,
        timestamp: new Date().toISOString(),
        userAgent: navigator.userAgent,
        url: window.location.href
      };

      switch (eventType) {
        case 'ad_impression':
          await trackAdImpression(payload);
          break;
        case 'ad_click':
          await trackAdClick(payload);
          break;
        case 'download_start':
          // Track download start
          break;
        case 'download_complete':
          // Track download completion
          break;
        default:
          console.warn('Unknown event type:', eventType);
      }
    } catch (error) {
      console.error('Failed to track event:', error);
    }
  }, [trackAdImpression, trackAdClick, user?.id]);

  const trackDownloadStart = useCallback(async (videoUrl, format) => {
    await trackEvent('download_start', {
      videoUrl,
      format,
      action: 'download_start'
    });
  }, [trackEvent]);

  const trackDownloadComplete = useCallback(async (videoUrl, format, duration) => {
    await trackEvent('download_complete', {
      videoUrl,
      format,
      duration,
      action: 'download_complete'
    });
  }, [trackEvent]);

  const trackAdInteraction = useCallback(async (adType, adPosition, action = 'impression') => {
    const eventType = action === 'click' ? 'ad_click' : 'ad_impression';
    await trackEvent(eventType, {
      adType,
      adPosition,
      action
    });
  }, [trackEvent]);

  return {
    trackEvent,
    trackDownloadStart,
    trackDownloadComplete,
    trackAdInteraction
  };
};

export default AnalyticsTracker;
