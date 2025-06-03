import React from 'react';
import { Helmet } from 'react-helmet-async';
import { useLocation } from 'react-router-dom';

const SEOHead = ({ 
  title,
  description,
  keywords,
  image,
  url,
  type = 'website',
  noIndex = false,
  canonical
}) => {
  const location = useLocation();
  
  // Default SEO data
  const defaultSEO = {
    title: 'Tải Video Nhanh - Tải video từ YouTube, TikTok, Facebook miễn phí',
    description: 'Dịch vụ tải video trực tuyến nhanh chóng, dễ dàng và an toàn từ YouTube, Facebook, TikTok, Instagram và 1000+ trang web khác. Hoàn toàn miễn phí!',
    keywords: 'tải video, download video, youtube downloader, tiktok downloader, facebook video, instagram video, video downloader online, tải video miễn phí',
    image: '/images/og-image.jpg',
    url: 'https://taivideonhanh.vn'
  };

  // Page-specific SEO data
  const pageSEO = {
    '/': {
      title: 'Tải Video Nhanh - Tải video từ YouTube, TikTok, Facebook miễn phí',
      description: 'Dịch vụ tải video trực tuyến nhanh chóng, dễ dàng và an toàn từ YouTube, Facebook, TikTok, Instagram và 1000+ trang web khác. Hoàn toàn miễn phí!',
      keywords: 'tải video, download video, youtube downloader, tiktok downloader, facebook video, instagram video'
    },
    '/tai-video-youtube': {
      title: 'Tải Video YouTube - Download video YouTube chất lượng cao miễn phí',
      description: 'Tải video YouTube nhanh chóng với chất lượng HD, Full HD, 4K. Hỗ trợ tải playlist, shorts và video dài. Hoàn toàn miễn phí và an toàn.',
      keywords: 'tải video youtube, youtube downloader, download youtube, youtube to mp4, youtube video downloader'
    },
    '/tai-video-tiktok': {
      title: 'Tải Video TikTok - Download TikTok không logo miễn phí',
      description: 'Tải video TikTok không logo, không watermark với chất lượng gốc. Nhanh chóng, dễ dàng và hoàn toàn miễn phí.',
      keywords: 'tải video tiktok, tiktok downloader, download tiktok, tiktok no watermark, tiktok video downloader'
    },
    '/tai-video-facebook': {
      title: 'Tải Video Facebook - Download video Facebook chất lượng cao',
      description: 'Tải video Facebook nhanh chóng với chất lượng HD. Hỗ trợ video công khai và riêng tư. Dễ dàng sử dụng và hoàn toàn miễn phí.',
      keywords: 'tải video facebook, facebook downloader, download facebook video, facebook video downloader'
    },
    '/tai-video-instagram': {
      title: 'Tải Video Instagram - Download Instagram Reels, IGTV miễn phí',
      description: 'Tải video Instagram, Reels, IGTV và Stories với chất lượng gốc. Nhanh chóng, an toàn và hoàn toàn miễn phí.',
      keywords: 'tải video instagram, instagram downloader, download instagram, instagram reels downloader, IGTV downloader'
    },
    '/tai-nhac-soundcloud': {
      title: 'Tải Nhạc SoundCloud - Download nhạc SoundCloud chất lượng cao',
      description: 'Tải nhạc SoundCloud với chất lượng cao, hỗ trợ playlist và track đơn lẻ. Nhanh chóng và hoàn toàn miễn phí.',
      keywords: 'tải nhạc soundcloud, soundcloud downloader, download soundcloud, soundcloud to mp3'
    },
    '/download': {
      title: 'Tải Video - Nhập URL để tải video từ mọi trang web',
      description: 'Nhập URL video để tải từ YouTube, TikTok, Facebook, Instagram và 1000+ trang web khác. Nhanh chóng và miễn phí.',
      keywords: 'tải video online, video downloader, download video from url'
    },
    '/pricing': {
      title: 'Bảng Giá - Gói Pro với tính năng cao cấp',
      description: 'Nâng cấp lên gói Pro để tải video chất lượng 4K, không quảng cáo và hỗ trợ ưu tiên 24/7. Giá cả hợp lý.',
      keywords: 'giá tải video, gói pro, premium video downloader, 4k video download'
    },
    '/login': {
      title: 'Đăng Nhập - Truy cập tài khoản Tải Video Nhanh',
      description: 'Đăng nhập để truy cập tài khoản và sử dụng đầy đủ tính năng tải video từ 1000+ trang web.',
      keywords: 'đăng nhập, login, tài khoản tải video'
    },
    '/register': {
      title: 'Đăng Ký - Tạo tài khoản miễn phí',
      description: 'Đăng ký tài khoản miễn phí để tải video không giới hạn từ YouTube, TikTok, Facebook và nhiều trang web khác.',
      keywords: 'đăng ký, register, tạo tài khoản, tài khoản miễn phí'
    }
  };

  // Get current page SEO or use provided props
  const currentPageSEO = pageSEO[location.pathname] || {};
  const finalSEO = {
    title: title || currentPageSEO.title || defaultSEO.title,
    description: description || currentPageSEO.description || defaultSEO.description,
    keywords: keywords || currentPageSEO.keywords || defaultSEO.keywords,
    image: image || defaultSEO.image,
    url: url || `${defaultSEO.url}${location.pathname}`,
  };

  const canonicalUrl = canonical || finalSEO.url;

  return (
    <Helmet>
      {/* Basic Meta Tags */}
      <title>{finalSEO.title}</title>
      <meta name="description" content={finalSEO.description} />
      <meta name="keywords" content={finalSEO.keywords} />
      <link rel="canonical" href={canonicalUrl} />
      
      {/* Robots */}
      {noIndex && <meta name="robots" content="noindex,nofollow" />}
      
      {/* Open Graph */}
      <meta property="og:type" content={type} />
      <meta property="og:title" content={finalSEO.title} />
      <meta property="og:description" content={finalSEO.description} />
      <meta property="og:image" content={finalSEO.image} />
      <meta property="og:url" content={finalSEO.url} />
      <meta property="og:site_name" content="Tải Video Nhanh" />
      <meta property="og:locale" content="vi_VN" />
      
      {/* Twitter Card */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={finalSEO.title} />
      <meta name="twitter:description" content={finalSEO.description} />
      <meta name="twitter:image" content={finalSEO.image} />
      
      {/* Additional Meta Tags */}
      <meta name="author" content="Tải Video Nhanh" />
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      <meta httpEquiv="Content-Type" content="text/html; charset=utf-8" />
      <meta name="language" content="Vietnamese" />
      <meta name="revisit-after" content="1 days" />
      
      {/* Structured Data */}
      <script type="application/ld+json">
        {JSON.stringify({
          "@context": "https://schema.org",
          "@type": "WebApplication",
          "name": "Tải Video Nhanh",
          "description": finalSEO.description,
          "url": finalSEO.url,
          "applicationCategory": "MultimediaApplication",
          "operatingSystem": "Web Browser",
          "offers": {
            "@type": "Offer",
            "price": "0",
            "priceCurrency": "VND"
          },
          "author": {
            "@type": "Organization",
            "name": "Tải Video Nhanh"
          }
        })}
      </script>
    </Helmet>
  );
};

export default SEOHead;
