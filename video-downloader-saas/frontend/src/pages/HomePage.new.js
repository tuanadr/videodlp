import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import {
  PlayIcon,
  CloudArrowDownIcon,
  ShieldCheckIcon,
  BoltIcon,
  CheckIcon,
  StarIcon,
  ArrowRightIcon,
  VideoCameraIcon,
  GlobeAltIcon,
  DevicePhoneMobileIcon
} from '@heroicons/react/24/outline';
import { useAuth } from '../context/AuthContext';
import SEOHead from '../components/seo/SEOHead';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';

const HomePage = () => {
  const { isAuthenticated, user } = useAuth();
  const navigate = useNavigate();
  const [videoUrl, setVideoUrl] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleQuickDownload = async () => {
    if (!videoUrl.trim()) {
      toast.warning('Vui lòng nhập URL video hợp lệ.');
      return;
    }

    // Basic URL validation
    try {
      new URL(videoUrl);
    } catch {
      toast.error('URL không hợp lệ. Vui lòng kiểm tra lại.');
      return;
    }

    setIsLoading(true);

    try {
      if (isAuthenticated) {
        // Redirect to download page with URL
        navigate('/download', { state: { url: videoUrl } });
      } else {
        // For non-authenticated users, redirect to login with return URL
        navigate('/login', { 
          state: { 
            from: '/download',
            videoUrl: videoUrl,
            message: 'Vui lòng đăng nhập để tải video'
          } 
        });
      }
    } catch (error) {
      toast.error('Có lỗi xảy ra. Vui lòng thử lại.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGetStarted = () => {
    if (isAuthenticated) {
      navigate('/download');
    } else {
      navigate('/register');
    }
  };

  const features = [
    {
      icon: BoltIcon,
      title: 'Tốc độ siêu nhanh',
      description: 'Tải video với tốc độ cao nhất, không giới hạn băng thông',
      gradient: 'from-primary-500 to-blue-500'
    },
    {
      icon: ShieldCheckIcon,
      title: 'An toàn & Bảo mật',
      description: 'Không lưu trữ dữ liệu cá nhân, bảo vệ quyền riêng tư tuyệt đối',
      gradient: 'from-green-500 to-emerald-500'
    },
    {
      icon: CloudArrowDownIcon,
      title: 'Không giới hạn tải',
      description: 'Tải không giới hạn video từ mọi nền tảng, mọi lúc mọi nơi',
      gradient: 'from-purple-500 to-pink-500'
    },
    {
      icon: DevicePhoneMobileIcon,
      title: 'Đa nền tảng',
      description: 'Hoạt động trên mọi thiết bị: máy tính, điện thoại, tablet',
      gradient: 'from-orange-500 to-red-500'
    },
    {
      icon: StarIcon,
      title: 'Chất lượng cao',
      description: 'Hỗ trợ tải video chất lượng từ 360p đến 4K Ultra HD',
      gradient: 'from-indigo-500 to-blue-500'
    },
    {
      icon: GlobeAltIcon,
      title: '1000+ trang web',
      description: 'Hỗ trợ tải từ hơn 1000 trang web và nền tảng video',
      gradient: 'from-teal-500 to-cyan-500'
    }
  ];

  const supportedPlatforms = [
    { name: 'YouTube', icon: PlayIcon, color: 'text-red-500' },
    { name: 'TikTok', icon: VideoCameraIcon, color: 'text-black dark:text-white' },
    { name: 'Facebook', color: 'text-blue-600', isCustom: true },
    { name: 'Instagram', color: 'text-pink-500', isCustom: true },
  ];

  return (
    <>
      <SEOHead />
      
      <div className="min-h-screen bg-white dark:bg-gray-900">
        {/* Hero Section */}
        <div className="relative overflow-hidden">
          {/* Background gradient */}
          <div className="absolute inset-0 bg-gradient-to-br from-primary-50 via-blue-50 to-indigo-100 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900"></div>

          {/* Background pattern */}
          <div className="absolute inset-0 opacity-10">
            <div className="absolute inset-0" style={{
              backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23000000' fill-opacity='0.1'%3E%3Ccircle cx='30' cy='30' r='2'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
            }}></div>
          </div>

          <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-24">
            <div className="text-center">
              {/* Main heading */}
              <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold text-gray-900 dark:text-gray-100 leading-tight">
                Tải video từ{' '}
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary-600 to-blue-600">
                  1000+ trang web
                </span>
              </h1>

              {/* Subtitle */}
              <p className="mt-6 max-w-3xl mx-auto text-xl md:text-2xl text-gray-600 dark:text-gray-300 leading-relaxed">
                Dịch vụ tải video trực tuyến <strong>nhanh chóng</strong>, <strong>dễ dàng</strong> và <strong>an toàn</strong> từ
                YouTube, Facebook, TikTok, Instagram và nhiều nền tảng khác.
              </p>

              {/* Quick download form */}
              <div className="mt-10 max-w-2xl mx-auto">
                <div className="flex flex-col sm:flex-row gap-4 p-2 bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-700">
                  <div className="flex-1">
                    <Input
                      type="url"
                      placeholder="Dán URL video vào đây (YouTube, TikTok, Facebook...)"
                      value={videoUrl}
                      onChange={(e) => setVideoUrl(e.target.value)}
                      className="border-0 focus:ring-0 text-lg"
                      leftIcon={GlobeAltIcon}
                      onKeyPress={(e) => {
                        if (e.key === 'Enter') {
                          handleQuickDownload();
                        }
                      }}
                    />
                  </div>
                  <Button
                    onClick={handleQuickDownload}
                    size="lg"
                    loading={isLoading}
                    className="px-8 py-4 text-lg font-semibold bg-gradient-to-r from-primary-600 to-blue-600 hover:from-primary-700 hover:to-blue-700"
                    rightIcon={ArrowRightIcon}
                  >
                    Tải ngay
                  </Button>
                </div>

                {/* Supported platforms */}
                <div className="mt-6 flex flex-wrap justify-center items-center gap-6 text-sm text-gray-500 dark:text-gray-400">
                  <span className="font-medium">Hỗ trợ:</span>
                  {supportedPlatforms.map((platform) => (
                    <span key={platform.name} className="flex items-center gap-1">
                      {platform.isCustom ? (
                        <div className={`h-4 w-4 ${platform.name === 'Facebook' ? 'bg-blue-600' : 'bg-gradient-to-r from-purple-500 to-pink-500'} rounded`}></div>
                      ) : (
                        <platform.icon className={`h-4 w-4 ${platform.color}`} />
                      )}
                      {platform.name}
                    </span>
                  ))}
                  <span className="text-primary-600 font-medium">+1000 trang khác</span>
                </div>
              </div>

              {/* CTA Buttons */}
              {!isAuthenticated && (
                <div className="mt-12 flex flex-col sm:flex-row gap-4 justify-center">
                  <Button
                    onClick={handleGetStarted}
                    size="xl"
                    className="px-10 py-4 text-lg font-semibold bg-gradient-to-r from-primary-600 to-blue-600 hover:from-primary-700 hover:to-blue-700 shadow-lg"
                    rightIcon={ArrowRightIcon}
                  >
                    Bắt đầu miễn phí
                  </Button>
                  <Button
                    onClick={() => navigate('/login')}
                    variant="outline"
                    size="xl"
                    className="px-10 py-4 text-lg font-semibold border-2 border-primary-600 text-primary-600 hover:bg-primary-50 hover:border-primary-700 dark:border-primary-400 dark:text-primary-400 dark:hover:bg-primary-900/20 dark:hover:border-primary-300"
                  >
                    Đăng nhập
                  </Button>
                </div>
              )}

              {isAuthenticated && (
                <div className="mt-12">
                  <div className="inline-flex items-center gap-3 px-6 py-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-full">
                    <CheckIcon className="h-5 w-5 text-green-600 dark:text-green-400" />
                    <span className="text-green-800 dark:text-green-200 font-medium">
                      Chào mừng {user?.name || user?.email}!
                      {user?.tier === 'pro' ? ' (Tài khoản Pro)' : ' (Tài khoản Free)'}
                    </span>
                  </div>
                  <div className="mt-6">
                    <Button
                      onClick={() => navigate('/download')}
                      size="xl"
                      className="px-10 py-4 text-lg font-semibold bg-gradient-to-r from-primary-600 to-blue-600 hover:from-primary-700 hover:to-blue-700 shadow-lg"
                      rightIcon={ArrowRightIcon}
                    >
                      Vào trang tải video
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Features Section */}
        <div className="py-24 bg-white dark:bg-gray-900">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center">
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-gray-100">
                Tại sao chọn chúng tôi?
              </h2>
              <p className="mt-4 text-xl text-gray-600 dark:text-gray-300 max-w-3xl mx-auto">
                Trải nghiệm tải video tốt nhất với công nghệ tiên tiến và giao diện thân thiện
              </p>
            </div>

            <div className="mt-20 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {features.map((feature, index) => (
                <div key={index} className="text-center group">
                  <div className={`mx-auto h-16 w-16 bg-gradient-to-r ${feature.gradient} rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform duration-200`}>
                    <feature.icon className="h-8 w-8 text-white" />
                  </div>
                  <h3 className="mt-6 text-xl font-semibold text-gray-900 dark:text-gray-100">
                    {feature.title}
                  </h3>
                  <p className="mt-2 text-gray-600 dark:text-gray-300">
                    {feature.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default HomePage;
