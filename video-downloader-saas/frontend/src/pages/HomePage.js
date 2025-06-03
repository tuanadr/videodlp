import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
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
import useAppStore from '../store/useAppStore';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';

const HomePage = () => {
  const { isAuthenticated, user } = useAuth();
  const { openModal, addNotification } = useAppStore();
  const navigate = useNavigate();
  const [videoUrl, setVideoUrl] = useState('');

  const handleQuickDownload = () => {
    if (!videoUrl.trim()) {
      addNotification({
        type: 'warning',
        title: 'URL không hợp lệ',
        message: 'Vui lòng nhập URL video hợp lệ.',
      });
      return;
    }

    if (isAuthenticated) {
      // Redirect to download page with URL
      navigate('/download', { state: { url: videoUrl } });
    } else {
      // Show login modal for better experience
      openModal('login');
      addNotification({
        type: 'info',
        title: 'Đăng nhập để tiếp tục',
        message: 'Vui lòng đăng nhập để sử dụng dịch vụ tải video.',
      });
    }
  };

  const handleGetStarted = () => {
    if (isAuthenticated) {
      navigate('/download');
    } else {
      openModal('register');
    }
  };

  const handleLogin = () => {
    openModal('login');
  };

  return (
    <div className="min-h-screen bg-white">
      {/* Hero Section */}
      <div className="relative overflow-hidden">
        {/* Background gradient */}
        <div className="absolute inset-0 bg-gradient-to-br from-primary-50 via-blue-50 to-indigo-100"></div>

        {/* Background pattern */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute inset-0" style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23000000' fill-opacity='0.1'%3E%3Ccircle cx='30' cy='30' r='2'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
          }}></div>
        </div>

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-24">
          <div className="text-center">
            {/* Main heading */}
            <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold text-gray-900 leading-tight">
              Tải video từ{' '}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary-600 to-blue-600">
                1000+ trang web
              </span>
            </h1>

            {/* Subtitle */}
            <p className="mt-6 max-w-3xl mx-auto text-xl md:text-2xl text-gray-600 leading-relaxed">
              Dịch vụ tải video trực tuyến <strong>nhanh chóng</strong>, <strong>dễ dàng</strong> và <strong>an toàn</strong> từ
              YouTube, Facebook, TikTok, Instagram và nhiều nền tảng khác.
            </p>

            {/* Quick download form */}
            <div className="mt-10 max-w-2xl mx-auto">
              <div className="flex flex-col sm:flex-row gap-4 p-2 bg-white rounded-2xl shadow-xl border border-gray-200">
                <div className="flex-1">
                  <Input
                    type="url"
                    placeholder="Dán URL video vào đây (YouTube, TikTok, Facebook...)"
                    value={videoUrl}
                    onChange={(e) => setVideoUrl(e.target.value)}
                    className="border-0 focus:ring-0 text-lg"
                    leftIcon={<GlobeAltIcon className="h-5 w-5" />}
                  />
                </div>
                <Button
                  onClick={handleQuickDownload}
                  size="lg"
                  className="px-8 py-4 text-lg font-semibold bg-gradient-to-r from-primary-600 to-blue-600 hover:from-primary-700 hover:to-blue-700"
                  rightIcon={<ArrowRightIcon className="h-5 w-5" />}
                >
                  Tải ngay
                </Button>
              </div>

              {/* Supported platforms */}
              <div className="mt-6 flex flex-wrap justify-center items-center gap-6 text-sm text-gray-500">
                <span className="font-medium">Hỗ trợ:</span>
                <span className="flex items-center gap-1">
                  <PlayIcon className="h-4 w-4 text-red-500" />
                  YouTube
                </span>
                <span className="flex items-center gap-1">
                  <VideoCameraIcon className="h-4 w-4 text-black" />
                  TikTok
                </span>
                <span className="flex items-center gap-1">
                  <div className="h-4 w-4 bg-blue-600 rounded"></div>
                  Facebook
                </span>
                <span className="flex items-center gap-1">
                  <div className="h-4 w-4 bg-gradient-to-r from-purple-500 to-pink-500 rounded"></div>
                  Instagram
                </span>
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
                  rightIcon={<ArrowRightIcon className="h-5 w-5" />}
                >
                  Bắt đầu miễn phí
                </Button>
                <Button
                  onClick={handleLogin}
                  variant="secondary"
                  size="xl"
                  className="px-10 py-4 text-lg font-semibold border-2 border-gray-300 hover:border-primary-300"
                >
                  Đăng nhập
                </Button>
              </div>
            )}

            {isAuthenticated && (
              <div className="mt-12">
                <div className="inline-flex items-center gap-3 px-6 py-3 bg-green-50 border border-green-200 rounded-full">
                  <CheckIcon className="h-5 w-5 text-green-600" />
                  <span className="text-green-800 font-medium">
                    Chào mừng {user?.name || user?.email}!
                    {user?.tier === 'pro' ? ' (Tài khoản Pro)' : ' (Tài khoản Free)'}
                  </span>
                </div>
                <div className="mt-6">
                  <Button
                    onClick={() => navigate('/download')}
                    size="xl"
                    className="px-10 py-4 text-lg font-semibold bg-gradient-to-r from-primary-600 to-blue-600 hover:from-primary-700 hover:to-blue-700 shadow-lg"
                    rightIcon={<ArrowRightIcon className="h-5 w-5" />}
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
      <div className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900">
              Tại sao chọn chúng tôi?
            </h2>
            <p className="mt-4 text-xl text-gray-600 max-w-3xl mx-auto">
              Trải nghiệm tải video tốt nhất với công nghệ tiên tiến và giao diện thân thiện
            </p>
          </div>

          <div className="mt-20 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {/* Feature 1 */}
            <div className="text-center group">
              <div className="mx-auto h-16 w-16 bg-gradient-to-r from-primary-500 to-blue-500 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform duration-200">
                <BoltIcon className="h-8 w-8 text-white" />
              </div>
              <h3 className="mt-6 text-xl font-semibold text-gray-900">
                Tốc độ siêu nhanh
              </h3>
              <p className="mt-2 text-gray-600">
                Tải video với tốc độ cao nhất, không giới hạn băng thông
              </p>
            </div>

            {/* Feature 2 */}
            <div className="text-center group">
              <div className="mx-auto h-16 w-16 bg-gradient-to-r from-green-500 to-emerald-500 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform duration-200">
                <ShieldCheckIcon className="h-8 w-8 text-white" />
              </div>
              <h3 className="mt-6 text-xl font-semibold text-gray-900">
                An toàn & Bảo mật
              </h3>
              <p className="mt-2 text-gray-600">
                Không lưu trữ dữ liệu cá nhân, bảo vệ quyền riêng tư tuyệt đối
              </p>
            </div>

            {/* Feature 3 */}
            <div className="text-center group">
              <div className="mx-auto h-16 w-16 bg-gradient-to-r from-purple-500 to-pink-500 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform duration-200">
                <CloudArrowDownIcon className="h-8 w-8 text-white" />
              </div>
              <h3 className="mt-6 text-xl font-semibold text-gray-900">
                Không giới hạn tải
              </h3>
              <p className="mt-2 text-gray-600">
                Tải không giới hạn video từ mọi nền tảng, mọi lúc mọi nơi
              </p>
            </div>

            {/* Feature 4 */}
            <div className="text-center group">
              <div className="mx-auto h-16 w-16 bg-gradient-to-r from-orange-500 to-red-500 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform duration-200">
                <DevicePhoneMobileIcon className="h-8 w-8 text-white" />
              </div>
              <h3 className="mt-6 text-xl font-semibold text-gray-900">
                Đa nền tảng
              </h3>
              <p className="mt-2 text-gray-600">
                Hoạt động trên mọi thiết bị: máy tính, điện thoại, tablet
              </p>
            </div>

            {/* Feature 5 */}
            <div className="text-center group">
              <div className="mx-auto h-16 w-16 bg-gradient-to-r from-indigo-500 to-blue-500 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform duration-200">
                <StarIcon className="h-8 w-8 text-white" />
              </div>
              <h3 className="mt-6 text-xl font-semibold text-gray-900">
                Chất lượng cao
              </h3>
              <p className="mt-2 text-gray-600">
                Hỗ trợ tải video chất lượng từ 360p đến 4K Ultra HD
              </p>
            </div>

            {/* Feature 6 */}
            <div className="text-center group">
              <div className="mx-auto h-16 w-16 bg-gradient-to-r from-teal-500 to-cyan-500 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform duration-200">
                <GlobeAltIcon className="h-8 w-8 text-white" />
              </div>
              <h3 className="mt-6 text-xl font-semibold text-gray-900">
                1000+ trang web
              </h3>
              <p className="mt-2 text-gray-600">
                Hỗ trợ tải từ hơn 1000 trang web và nền tảng video
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Pricing Section */}
      <div className="py-24 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900">
              Chọn gói phù hợp với bạn
            </h2>
            <p className="mt-4 text-xl text-gray-600">
              Tất cả gói đều có tải không giới hạn, chỉ khác biệt về chất lượng và quảng cáo
            </p>
          </div>

          <div className="mt-20 grid grid-cols-1 lg:grid-cols-2 gap-8 max-w-4xl mx-auto">
            {/* Free Plan */}
            <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-8 relative">
              <div className="text-center">
                <h3 className="text-2xl font-bold text-gray-900">Free</h3>
                <p className="mt-2 text-gray-600">Miễn phí mãi mãi</p>
                <div className="mt-6">
                  <span className="text-4xl font-bold text-gray-900">0₫</span>
                  <span className="text-gray-600">/tháng</span>
                </div>
              </div>

              <ul className="mt-8 space-y-4">
                <li className="flex items-center">
                  <CheckIcon className="h-5 w-5 text-green-500 mr-3" />
                  <span>Tải không giới hạn video</span>
                </li>
                <li className="flex items-center">
                  <CheckIcon className="h-5 w-5 text-green-500 mr-3" />
                  <span>Chất lượng tối đa 1080p</span>
                </li>
                <li className="flex items-center">
                  <CheckIcon className="h-5 w-5 text-green-500 mr-3" />
                  <span>Hỗ trợ 1000+ trang web</span>
                </li>
                <li className="flex items-center">
                  <div className="h-5 w-5 bg-yellow-100 rounded mr-3 flex items-center justify-center">
                    <div className="h-2 w-2 bg-yellow-500 rounded"></div>
                  </div>
                  <span className="text-gray-600">Có quảng cáo</span>
                </li>
              </ul>

              <div className="mt-8">
                <Button
                  onClick={handleGetStarted}
                  variant="secondary"
                  size="lg"
                  className="w-full"
                >
                  {isAuthenticated ? 'Đang sử dụng' : 'Bắt đầu miễn phí'}
                </Button>
              </div>
            </div>

            {/* Pro Plan */}
            <div className="bg-gradient-to-br from-primary-500 to-blue-600 rounded-2xl shadow-xl p-8 relative text-white">
              <div className="absolute top-4 right-4">
                <span className="bg-yellow-400 text-yellow-900 px-3 py-1 rounded-full text-sm font-semibold">
                  Phổ biến
                </span>
              </div>

              <div className="text-center">
                <h3 className="text-2xl font-bold">Pro</h3>
                <p className="mt-2 text-blue-100">Trải nghiệm cao cấp</p>
                <div className="mt-6">
                  <span className="text-4xl font-bold">99,000₫</span>
                  <span className="text-blue-100">/tháng</span>
                </div>
              </div>

              <ul className="mt-8 space-y-4">
                <li className="flex items-center">
                  <CheckIcon className="h-5 w-5 text-green-300 mr-3" />
                  <span>Tải không giới hạn video</span>
                </li>
                <li className="flex items-center">
                  <CheckIcon className="h-5 w-5 text-green-300 mr-3" />
                  <span>Chất lượng không giới hạn (4K, 8K)</span>
                </li>
                <li className="flex items-center">
                  <CheckIcon className="h-5 w-5 text-green-300 mr-3" />
                  <span>Hỗ trợ 1000+ trang web</span>
                </li>
                <li className="flex items-center">
                  <CheckIcon className="h-5 w-5 text-green-300 mr-3" />
                  <span>Không có quảng cáo</span>
                </li>
                <li className="flex items-center">
                  <CheckIcon className="h-5 w-5 text-green-300 mr-3" />
                  <span>Hỗ trợ ưu tiên 24/7</span>
                </li>
              </ul>

              <div className="mt-8">
                <Button
                  onClick={() => navigate('/pricing')}
                  variant="secondary"
                  size="lg"
                  className="w-full bg-white text-primary-600 hover:bg-gray-50"
                >
                  Nâng cấp Pro
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <div className="py-24 bg-gradient-to-r from-primary-600 to-blue-600">
        <div className="max-w-4xl mx-auto text-center px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl md:text-4xl font-bold text-white">
            Sẵn sàng tải video yêu thích?
          </h2>
          <p className="mt-4 text-xl text-blue-100">
            Tham gia hàng triệu người dùng đã tin tưởng dịch vụ của chúng tôi
          </p>
          <div className="mt-8">
            <Button
              onClick={handleGetStarted}
              size="xl"
              className="px-10 py-4 text-lg font-semibold bg-white text-primary-600 hover:bg-gray-50 shadow-lg"
              rightIcon={<ArrowRightIcon className="h-5 w-5" />}
            >
              {isAuthenticated ? 'Bắt đầu tải video' : 'Đăng ký miễn phí'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HomePage;