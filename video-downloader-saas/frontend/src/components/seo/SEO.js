import React from 'react';
import { Helmet } from 'react-helmet-async';
import { useLocation } from 'react-router-dom';
import { useSettings } from '../../context/SettingsContext';

const SEO = ({
  title,
  description,
  image,
  article = false,
  keywords = '',
  canonicalPath,
  structuredData = null
}) => {
  const { settings } = useSettings();
  const { pathname } = useLocation();
  const siteUrl = process.env.REACT_APP_SITE_URL || 'https://viddown.vn';
  
  // Lấy cài đặt SEO từ context
  const seoSettings = settings.seo || {};
  
  // Nếu không có canonicalPath được cung cấp, sử dụng pathname hiện tại
  const canonical = canonicalPath ? `${siteUrl}${canonicalPath}` : `${siteUrl}${pathname}`;
  
  // Tiêu đề mặc định nếu không được cung cấp
  const defaultTitle = seoSettings.siteName || 'VideoDownloader - Tải video từ nhiều nguồn';
  const siteTitle = title ? `${title} | ${defaultTitle.split(' - ')[0]}` : defaultTitle;
  
  // Mô tả mặc định nếu không được cung cấp
  const defaultDescription = seoSettings.siteDescription || 'Dịch vụ tải video trực tuyến từ nhiều nguồn khác nhau như YouTube, Facebook, TikTok và hơn 1000 trang web khác.';
  const siteDescription = description || defaultDescription;
  
  // Từ khóa mặc định nếu không được cung cấp
  const defaultKeywords = seoSettings.defaultKeywords || 'tải video, download video, youtube downloader, facebook downloader, tiktok downloader';
  const siteKeywords = keywords || defaultKeywords;
  
  // Hình ảnh mặc định nếu không được cung cấp
  const defaultImage = `${siteUrl}${seoSettings.defaultImage || '/logo512.png'}`;
  const siteImage = image ? (image.startsWith('http') ? image : `${siteUrl}${image}`) : defaultImage;

  // Twitter handle
  const twitterHandle = seoSettings.twitterHandle || '@videodownloader';
  
  // Facebook App ID
  const facebookAppId = seoSettings.facebookAppId || '';
  
  // Google Analytics ID
  const googleAnalyticsId = seoSettings.googleAnalyticsId || '';

  // Kiểm tra các tính năng được bật/tắt
  const enableStructuredData = seoSettings.enableStructuredData !== false;
  const enableOpenGraph = seoSettings.enableOpenGraph !== false;
  const enableTwitterCards = seoSettings.enableTwitterCards !== false;
  const enableCanonicalUrls = seoSettings.enableCanonicalUrls !== false;

  return (
    <Helmet>
      {/* Thẻ title và meta cơ bản */}
      <title>{siteTitle}</title>
      <meta name="description" content={siteDescription} />
      <meta name="keywords" content={siteKeywords} />
      
      {/* Canonical URL */}
      {enableCanonicalUrls && <link rel="canonical" href={canonical} />}
      
      {/* Open Graph / Facebook */}
      {enableOpenGraph && (
        <>
          <meta property="og:type" content={article ? 'article' : 'website'} />
          <meta property="og:url" content={canonical} />
          <meta property="og:title" content={siteTitle} />
          <meta property="og:description" content={siteDescription} />
          <meta property="og:image" content={siteImage} />
          {facebookAppId && <meta property="fb:app_id" content={facebookAppId} />}
        </>
      )}
      
      {/* Twitter */}
      {enableTwitterCards && (
        <>
          <meta name="twitter:card" content="summary_large_image" />
          <meta name="twitter:url" content={canonical} />
          <meta name="twitter:title" content={siteTitle} />
          <meta name="twitter:description" content={siteDescription} />
          <meta name="twitter:image" content={siteImage} />
          <meta name="twitter:site" content={twitterHandle} />
        </>
      )}
      
      {/* Google Analytics */}
      {googleAnalyticsId && (
        <>
          <script async src={`https://www.googletagmanager.com/gtag/js?id=${googleAnalyticsId}`}></script>
          <script>
            {`
              window.dataLayer = window.dataLayer || [];
              function gtag(){dataLayer.push(arguments);}
              gtag('js', new Date());
              gtag('config', '${googleAnalyticsId}');
            `}
          </script>
        </>
      )}
      
      {/* Structured Data / JSON-LD */}
      {enableStructuredData && structuredData && (
        <script type="application/ld+json">
          {JSON.stringify(structuredData)}
        </script>
      )}
    </Helmet>
  );
};

export default SEO;