import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useSettings } from '../context/SettingsContext';
import { useAuth } from '../context/AuthContext';
import SEO from '../components/seo/SEO';
import BannerAd from '../components/ads/BannerAd';
import TierBadge from '../components/ui/TierBadge';
import Button from '../components/ui/Button';
import Card, { CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/Card';
import {
  ArrowDownTrayIcon,
  CubeIcon,
  InformationCircleIcon,
  CheckIcon,
  XMarkIcon,
  SparklesIcon
} from '@heroicons/react/24/outline';

const HomePage = () => {
  const { settings } = useSettings();
  const { getUserTier, trackPageView, isAuthenticated } = useAuth();

  const currentTier = getUserTier();

  // Track page view
  useEffect(() => {
    trackPageView('home');
  }, [trackPageView]);
  
  // Structured data cho trang chủ
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "name": "VideoDownloader - Tải video từ nhiều nguồn",
    "url": "https://viddown.vn",
    "potentialAction": {
      "@type": "SearchAction",
      "target": "https://viddown.vn/dashboard/download?url={search_term_string}",
      "query-input": "required name=search_term_string"
    }
  };
  
  // Structured data cho ứng dụng phần mềm
  const appStructuredData = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    "name": "VideoDownloader",
    "applicationCategory": "MultimediaApplication",
    "offers": {
      "@type": "Offer",
      "price": "0",
      "priceCurrency": "VND"
    },
    "aggregateRating": {
      "@type": "AggregateRating",
      "ratingValue": "4.8",
      "ratingCount": "1024"
    }
  };
  
  return (
    <div>
      <SEO
        title="Tải video từ mọi nền tảng - YouTube, Facebook, TikTok"
        description="Dịch vụ tải video trực tuyến nhanh chóng, dễ dàng và an toàn từ YouTube, Facebook, Twitter và nhiều nguồn khác."
        keywords="tải video, download video, youtube downloader, facebook downloader, tiktok downloader"
        structuredData={[structuredData, appStructuredData]}
      />
      {/* Banner Ad for non-Pro users */}
      {currentTier !== 'pro' && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <BannerAd position="header" />
        </div>
      )}

      {/* Hero Section */}
      <div className="relative bg-gradient-to-br from-primary-600 via-primary-700 to-secondary-800 text-white overflow-hidden">
        {/* Background Pattern */}
        <div className="absolute inset-0 bg-black opacity-10">
          <div className="absolute inset-0" style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.1'%3E%3Ccircle cx='30' cy='30' r='2'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
          }} />
        </div>

        <div className="relative max-w-7xl mx-auto py-20 px-4 sm:py-28 sm:px-6 lg:px-8">
          <div className="text-center">
            <h1 className="text-4xl font-bold tracking-tight sm:text-5xl md:text-6xl lg:text-7xl">
              <span className="block">Tải video từ</span>
              <span className="block bg-gradient-to-r from-yellow-400 to-orange-500 bg-clip-text text-transparent">
                mọi nền tảng
              </span>
            </h1>
            <p className="mt-6 max-w-3xl mx-auto text-xl sm:text-2xl text-primary-100 leading-relaxed">
              Dịch vụ tải video trực tuyến nhanh chóng, dễ dàng và an toàn từ YouTube, Facebook, TikTok và hơn 1000+ nguồn khác.
            </p>



            <div className="mt-10 flex flex-col sm:flex-row gap-4 justify-center items-center">
              {!isAuthenticated ? (
                <>
                  <Link
                    to="/register"
                    className="inline-flex items-center justify-center px-8 py-4 text-lg font-medium rounded-lg bg-gradient-to-r from-green-500 to-blue-600 hover:from-green-600 hover:to-blue-700 text-white shadow-lg transform hover:scale-105 transition-all duration-200"
                  >
                    <SparklesIcon className="h-5 w-5 mr-2" />
                    Bắt đầu miễn phí
                  </Link>
                  <Link
                    to="/dashboard/download"
                    className="inline-flex items-center justify-center px-8 py-4 text-lg font-medium rounded-lg bg-white text-primary-700 hover:bg-gray-50 shadow-lg transition-all duration-200"
                  >
                    <ArrowDownTrayIcon className="h-5 w-5 mr-2" />
                    Tải video ngay
                  </Link>
                </>
              ) : (
                <>
                  <Link
                    to="/dashboard/download"
                    className="inline-flex items-center justify-center px-8 py-4 text-lg font-medium rounded-lg bg-gradient-to-r from-green-500 to-blue-600 hover:from-green-600 hover:to-blue-700 text-white shadow-lg transform hover:scale-105 transition-all duration-200"
                  >
                    <ArrowDownTrayIcon className="h-5 w-5 mr-2" />
                    Tải video ngay
                  </Link>
                  {currentTier !== 'pro' && (
                    <Link
                      to="/upgrade"
                      className="inline-flex items-center justify-center px-8 py-4 text-lg font-medium rounded-lg bg-gradient-to-r from-purple-500 to-pink-500 text-white hover:from-purple-600 hover:to-pink-600 shadow-lg transition-all duration-200"
                    >
                      <SparklesIcon className="h-5 w-5 mr-2" />
                      Nâng cấp Pro
                    </Link>
                  )}
                </>
              )}
            </div>

            {/* Stats */}
            <div className="mt-16 grid grid-cols-1 gap-8 sm:grid-cols-3">
              <div className="text-center">
                <div className="text-3xl font-bold text-white">1000+</div>
                <div className="text-primary-200">Trang web hỗ trợ</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-white">50K+</div>
                <div className="text-primary-200">Video đã tải</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-white">99.9%</div>
                <div className="text-primary-200">Thời gian hoạt động</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h2 className="text-3xl font-bold text-gray-900 sm:text-4xl lg:text-5xl">
              Tính năng nổi bật
            </h2>
            <p className="mt-4 max-w-3xl mx-auto text-xl text-gray-600 leading-relaxed">
              Trải nghiệm dịch vụ tải video tốt nhất với các tính năng hàng đầu được thiết kế cho mọi nhu cầu
            </p>
          </div>

          <div className="mt-16 grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-3">
            <Card variant="elevated" className="relative group hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1">
              <div className="absolute -top-4 left-6">
                <div className="inline-flex items-center justify-center p-3 bg-gradient-to-r from-blue-500 to-purple-600 rounded-xl shadow-lg">
                  <ArrowDownTrayIcon className="h-6 w-6 text-white" />
                </div>
              </div>
              <CardHeader className="pt-8">
                <CardTitle className="text-xl">Tải video đa nguồn</CardTitle>
                <CardDescription className="text-base">
                  Hỗ trợ tải video từ hơn 1000+ nền tảng khác nhau như YouTube, Facebook, TikTok, Instagram và nhiều trang web khác.
                </CardDescription>
              </CardHeader>
            </Card>

            <Card variant="elevated" className="relative group hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1">
              <div className="absolute -top-4 left-6">
                <div className="inline-flex items-center justify-center p-3 bg-gradient-to-r from-green-500 to-teal-600 rounded-xl shadow-lg">
                  <CubeIcon className="h-6 w-6 text-white" />
                </div>
              </div>
              <CardHeader className="pt-8">
                <CardTitle className="text-xl">Lựa chọn chất lượng</CardTitle>
                <CardDescription className="text-base">
                  Người dùng Pro có thể chọn định dạng và chất lượng video mong muốn để tải về, từ 144p đến 8K Ultra HD.
                </CardDescription>
              </CardHeader>
            </Card>

            <Card variant="elevated" className="relative group hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1">
              <div className="absolute -top-4 left-6">
                <div className="inline-flex items-center justify-center p-3 bg-gradient-to-r from-orange-500 to-red-600 rounded-xl shadow-lg">
                  <InformationCircleIcon className="h-6 w-6 text-white" />
                </div>
              </div>
              <CardHeader className="pt-8">
                <CardTitle className="text-xl">Xem trước thông tin</CardTitle>
                <CardDescription className="text-base">
                  Xem trước thông tin video như tiêu đề, thumbnail, thời lượng và các định dạng có sẵn trước khi tải.
                </CardDescription>
              </CardHeader>
            </Card>
          </div>
        </div>
      </div>

      {/* Pricing Section */}
      <div className="bg-white py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h2 className="text-3xl font-bold text-gray-900 sm:text-4xl lg:text-5xl">
              Gói dịch vụ
            </h2>
            <p className="mt-4 max-w-3xl mx-auto text-xl text-gray-600 leading-relaxed">
              Chọn gói dịch vụ phù hợp với nhu cầu của bạn - từ dùng thử miễn phí đến trải nghiệm premium
            </p>
          </div>

          <div className="mt-16 grid grid-cols-1 gap-8 lg:grid-cols-3">
            {/* Anonymous Tier */}
            <Card className="relative group hover:shadow-lg transition-all duration-300">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-2xl">Khách</CardTitle>
                  <TierBadge tier="anonymous" />
                </div>
                <div className="mt-4 flex items-baseline">
                  <span className="text-4xl font-bold text-gray-900">0đ</span>
                  <span className="ml-2 text-lg text-gray-500">/ngày</span>
                </div>
                <CardDescription className="text-base mt-4">
                  Dùng thử ngay không cần đăng ký.
                </CardDescription>
              </CardHeader>

              <CardContent>
                <ul className="space-y-3">
                  <li className="flex items-center space-x-3">
                    <CheckIcon className="h-5 w-5 text-green-500 flex-shrink-0" />
                    <span className="text-gray-600">Tải không giới hạn</span>
                  </li>
                  <li className="flex items-center space-x-3">
                    <CheckIcon className="h-5 w-5 text-green-500 flex-shrink-0" />
                    <span className="text-gray-600">Chất lượng tối đa 1080p</span>
                  </li>
                  <li className="flex items-center space-x-3">
                    <XMarkIcon className="h-5 w-5 text-red-500 flex-shrink-0" />
                    <span className="text-gray-600">Có quảng cáo</span>
                  </li>
                  <li className="flex items-center space-x-3">
                    <XMarkIcon className="h-5 w-5 text-red-500 flex-shrink-0" />
                    <span className="text-gray-600">Không lưu lịch sử</span>
                  </li>
                </ul>
              </CardContent>

              <div className="p-6 pt-0">
                <Link
                  to="/dashboard/download"
                  className="block w-full bg-gray-600 hover:bg-gray-700 text-white text-center font-medium py-3 px-6 rounded-lg transition-colors duration-200"
                >
                  Dùng thử ngay
                </Link>
              </div>
            </Card>

            {/* Free Tier */}
            <Card className="relative group hover:shadow-lg transition-all duration-300">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-2xl">Miễn phí</CardTitle>
                  <TierBadge tier="free" />
                </div>
                <div className="mt-4 flex items-baseline">
                  <span className="text-4xl font-bold text-gray-900">0đ</span>
                  <span className="ml-2 text-lg text-gray-500">/tháng</span>
                </div>
                <CardDescription className="text-base mt-4">
                  Đăng ký miễn phí để có thêm tính năng.
                </CardDescription>
              </CardHeader>

              <CardContent>
                <ul className="space-y-3">
                  <li className="flex items-center space-x-3">
                    <CheckIcon className="h-5 w-5 text-green-500 flex-shrink-0" />
                    <span className="text-gray-600">Tải không giới hạn</span>
                  </li>
                  <li className="flex items-center space-x-3">
                    <CheckIcon className="h-5 w-5 text-green-500 flex-shrink-0" />
                    <span className="text-gray-600">Chất lượng tối đa 1080p</span>
                  </li>
                  <li className="flex items-center space-x-3">
                    <XMarkIcon className="h-5 w-5 text-red-500 flex-shrink-0" />
                    <span className="text-gray-600">Không lưu lịch sử</span>
                  </li>
                  <li className="flex items-center space-x-3">
                    <XMarkIcon className="h-5 w-5 text-red-500 flex-shrink-0" />
                    <span className="text-gray-600">Có quảng cáo</span>
                  </li>
                </ul>
              </CardContent>

              <div className="p-6 pt-0">
                <Link
                  to="/register"
                  className="block w-full bg-blue-600 hover:bg-blue-700 text-white text-center font-medium py-3 px-6 rounded-lg transition-colors duration-200"
                >
                  Đăng ký miễn phí
                </Link>
              </div>
            </Card>

            {/* Pro Tier */}
            <Card className="relative group hover:shadow-xl transition-all duration-300 border-2 border-purple-500 transform hover:-translate-y-1">
              <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                <span className="bg-gradient-to-r from-purple-500 to-pink-500 text-white px-4 py-1 rounded-full text-sm font-medium shadow-lg">
                  Phổ biến nhất
                </span>
              </div>

              <CardHeader className="pt-8">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-2xl">Pro</CardTitle>
                  <TierBadge tier="pro" />
                </div>
                <div className="mt-4 flex items-baseline">
                  <span className="text-4xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">99.000đ</span>
                  <span className="ml-2 text-lg text-gray-500">/tháng</span>
                </div>
                <CardDescription className="text-base mt-4">
                  Trải nghiệm đầy đủ tính năng premium.
                </CardDescription>
              </CardHeader>

              <CardContent>
                <ul className="space-y-3">
                  <li className="flex items-center space-x-3">
                    <CheckIcon className="h-5 w-5 text-green-500 flex-shrink-0" />
                    <span className="text-gray-600">Tải không giới hạn</span>
                  </li>
                  <li className="flex items-center space-x-3">
                    <CheckIcon className="h-5 w-5 text-green-500 flex-shrink-0" />
                    <span className="text-gray-600">Chất lượng 4K, 8K</span>
                  </li>
                  <li className="flex items-center space-x-3">
                    <CheckIcon className="h-5 w-5 text-green-500 flex-shrink-0" />
                    <span className="text-gray-600">Không có quảng cáo</span>
                  </li>
                  <li className="flex items-center space-x-3">
                    <CheckIcon className="h-5 w-5 text-green-500 flex-shrink-0" />
                    <span className="text-gray-600">Tải playlist & phụ đề</span>
                  </li>
                </ul>
              </CardContent>

              <div className="p-6 pt-0">
                <Link
                  to="/upgrade"
                  className="block w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white text-center font-medium py-3 px-6 rounded-lg transition-all duration-200 transform hover:scale-105 shadow-lg"
                >
                  Nâng cấp Pro
                </Link>
              </div>
            </Card>
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <div className="relative bg-gradient-to-r from-primary-600 via-purple-600 to-pink-600 overflow-hidden">
        {/* Background Pattern */}
        <div className="absolute inset-0 bg-black opacity-10">
          <div className="absolute inset-0" style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='40' height='40' viewBox='0 0 40 40' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='%23ffffff' fill-opacity='0.1'%3E%3Cpath d='M20 20c0 11.046-8.954 20-20 20v20h40V20H20z'/%3E%3C/g%3E%3C/svg%3E")`,
          }} />
        </div>

        <div className="relative max-w-4xl mx-auto text-center py-20 px-4 sm:py-24 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-white sm:text-4xl lg:text-5xl">
            <span className="block">Bắt đầu tải video</span>
            <span className="block bg-gradient-to-r from-yellow-400 to-orange-400 bg-clip-text text-transparent">
              ngay hôm nay
            </span>
          </h2>
          <p className="mt-6 text-xl text-primary-100 leading-relaxed max-w-2xl mx-auto">
            Đăng ký miễn phí và trải nghiệm dịch vụ tải video tốt nhất với hơn 1000+ trang web được hỗ trợ.
          </p>

          <div className="mt-10 flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Link
              to="/register"
              className="inline-flex items-center justify-center px-8 py-4 text-lg font-medium rounded-lg bg-white text-primary-700 hover:bg-gray-50 shadow-lg transform hover:scale-105 transition-all duration-200"
            >
              <SparklesIcon className="h-5 w-5 mr-2" />
              Đăng ký miễn phí
            </Link>
            <Link
              to="/dashboard/download"
              className="inline-flex items-center justify-center px-8 py-4 text-lg font-medium rounded-lg border-2 border-white text-white hover:bg-white hover:text-primary-700 transition-all duration-200"
            >
              <ArrowDownTrayIcon className="h-5 w-5 mr-2" />
              Dùng thử ngay
            </Link>
          </div>

          {/* Trust indicators */}
          <div className="mt-12 flex flex-col sm:flex-row items-center justify-center space-y-4 sm:space-y-0 sm:space-x-8 text-primary-200">
            <div className="flex items-center space-x-2">
              <CheckIcon className="h-5 w-5" />
              <span>Không cần thẻ tín dụng</span>
            </div>
            <div className="flex items-center space-x-2">
              <CheckIcon className="h-5 w-5" />
              <span>Thiết lập trong 30 giây</span>
            </div>
            <div className="flex items-center space-x-2">
              <CheckIcon className="h-5 w-5" />
              <span>Hủy bất cứ lúc nào</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HomePage;