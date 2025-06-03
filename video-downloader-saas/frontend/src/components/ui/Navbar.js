import React, { useState, useContext } from 'react'; // Import useContext
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import TierBadge from './TierBadge';
import Button from './Button';
import {
  ChevronDownIcon,
  Bars3Icon,
  XMarkIcon,
  UserIcon,
  ArrowDownTrayIcon,
  SparklesIcon
} from '@heroicons/react/24/outline';

const Navbar = () => {
  const { isAuthenticated, user, logout, getUserTier, isSubscriptionExpired } = useAuth();
  const navigate = useNavigate();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isQuickToolsOpen, setIsQuickToolsOpen] = useState(false);

  const currentTier = getUserTier();
  const isExpired = isSubscriptionExpired();

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  return (
    <nav className="bg-white shadow-lg border-b border-gray-100 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex">
            <div className="flex-shrink-0 flex items-center">
              <Link to="/" className="flex items-center space-x-2">
                <div className="h-8 w-8 bg-gradient-to-r from-primary-500 to-purple-600 rounded-lg flex items-center justify-center">
                  <ArrowDownTrayIcon className="h-5 w-5 text-white" />
                </div>
                <span className="text-xl font-bold bg-gradient-to-r from-primary-600 to-purple-600 bg-clip-text text-transparent">
                  TaiVideoNhanh
                </span>
              </Link>
            </div>
            <div className="hidden sm:ml-8 sm:flex sm:space-x-8">
              <Link
                to="/"
                className="border-transparent text-gray-600 hover:border-primary-500 hover:text-primary-700 inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium transition-colors duration-200"
              >
                Trang chủ
              </Link>
              <Link
                to="/supported-sites"
                className="border-transparent text-gray-600 hover:border-primary-500 hover:text-primary-700 inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium transition-colors duration-200"
              >
                Trang web hỗ trợ
              </Link>
              <div
                className="relative inline-flex items-center px-1 pt-1 border-b-2 border-transparent text-sm font-medium"
                onMouseEnter={() => setIsQuickToolsOpen(true)}
                onMouseLeave={() => setIsQuickToolsOpen(false)}
              >
                <button
                  type="button"
                  className="text-gray-600 inline-flex items-center text-sm font-medium hover:text-primary-700 focus:outline-none transition-colors duration-200"
                >
                  Công cụ tải nhanh
                  <ChevronDownIcon className="ml-1 h-4 w-4" />
                </button>
                {isQuickToolsOpen && (
                  <div className="origin-top-right absolute right-0 w-56 rounded-lg shadow-xl bg-white ring-1 ring-black ring-opacity-5 focus:outline-none z-10 top-full border border-gray-100">
                    <div className="py-2" role="menu" aria-orientation="vertical" aria-labelledby="options-menu">
                      <Link to="/tai-video-youtube" className="flex items-center px-4 py-3 text-sm text-gray-700 hover:bg-gradient-to-r hover:from-red-50 hover:to-red-100 hover:text-red-700 transition-all duration-200" role="menuitem">
                        <span className="mr-3 text-red-500">📺</span>
                        Tải Video YouTube
                      </Link>
                      <Link to="/tai-video-facebook" className="flex items-center px-4 py-3 text-sm text-gray-700 hover:bg-gradient-to-r hover:from-blue-50 hover:to-blue-100 hover:text-blue-700 transition-all duration-200" role="menuitem">
                        <span className="mr-3 text-blue-500">📘</span>
                        Tải Video Facebook
                      </Link>
                      <Link to="/tai-video-tiktok" className="flex items-center px-4 py-3 text-sm text-gray-700 hover:bg-gradient-to-r hover:from-pink-50 hover:to-pink-100 hover:text-pink-700 transition-all duration-200" role="menuitem">
                        <span className="mr-3 text-pink-500">🎵</span>
                        Tải Video TikTok
                      </Link>
                      <Link to="/tai-video-instagram" className="flex items-center px-4 py-3 text-sm text-gray-700 hover:bg-gradient-to-r hover:from-purple-50 hover:to-purple-100 hover:text-purple-700 transition-all duration-200" role="menuitem">
                        <span className="mr-3 text-purple-500">📷</span>
                        Tải Video Instagram
                      </Link>
                      <Link to="/tai-nhac-soundcloud" className="flex items-center px-4 py-3 text-sm text-gray-700 hover:bg-gradient-to-r hover:from-orange-50 hover:to-orange-100 hover:text-orange-700 transition-all duration-200" role="menuitem">
                        <span className="mr-3 text-orange-500">🎧</span>
                        Tải Nhạc SoundCloud
                      </Link>
                    </div>
                  </div>
                )}
              </div>
              {isAuthenticated && (
                <>
                  <Link
                    to="/dashboard"
                    className="border-transparent text-gray-500 hover:border-primary-500 hover:text-primary-700 inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium"
                  >
                    Bảng điều khiển
                  </Link>
                  <Link
                    to="/dashboard/download"
                    className="border-transparent text-gray-500 hover:border-primary-500 hover:text-primary-700 inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium"
                  >
                    Tải video
                  </Link>
                </>
              )}
            </div>
          </div>
          <div className="hidden sm:ml-6 sm:flex sm:items-center">
            {isAuthenticated ? (
              <div className="ml-3 relative">
                <div>
                  <button
                    type="button"
                    className="bg-white rounded-full flex text-sm focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
                    id="user-menu"
                    aria-expanded="false"
                    aria-haspopup="true"
                    onClick={() => setIsProfileOpen(!isProfileOpen)}
                  >
                    <span className="sr-only">Mở menu người dùng</span>
                    <div className="h-8 w-8 rounded-full bg-primary-200 flex items-center justify-center text-primary-600 font-semibold">
                      {user?.name?.charAt(0).toUpperCase() || 'U'}
                    </div>
                  </button>
                </div>
                {isProfileOpen && (
                  <div
                    className="origin-top-right absolute right-0 mt-2 w-48 rounded-md shadow-lg py-1 bg-white ring-1 ring-black ring-opacity-5 focus:outline-none"
                    role="menu"
                    aria-orientation="vertical"
                    aria-labelledby="user-menu"
                  >
                    <div className="px-4 py-2 text-sm text-gray-700 border-b">
                      <p className="font-medium">{user?.name}</p>
                      <p className="text-xs text-gray-500">{user?.email}</p>
                      <div className="mt-2 flex items-center justify-between">
                        <TierBadge tier={currentTier} className="text-xs" />
                        {currentTier === 'pro' && isExpired && (
                          <span className="text-xs text-red-600 font-medium">Hết hạn</span>
                        )}
                      </div>

                    </div>
                    <Link
                      to="/dashboard/profile"
                      className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                      role="menuitem"
                      onClick={() => setIsProfileOpen(false)}
                    >
                      Hồ sơ của tôi
                    </Link>
                    <Link
                      to="/dashboard/subscription"
                      className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                      role="menuitem"
                      onClick={() => setIsProfileOpen(false)}
                    >
                      Gói đăng ký
                    </Link>
                    <Link
                      to="/dashboard/referrals"
                      className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                      role="menuitem"
                      onClick={() => setIsProfileOpen(false)}
                    >
                      Mời bạn bè
                    </Link>
                    {currentTier !== 'pro' && (
                      <Link
                        to="/upgrade"
                        className="block px-4 py-2 text-sm text-purple-600 hover:bg-purple-50 font-medium"
                        role="menuitem"
                        onClick={() => setIsProfileOpen(false)}
                      >
                        🚀 Nâng cấp Pro
                      </Link>
                    )}
                    {currentTier === 'pro' && isExpired && (
                      <Link
                        to="/upgrade"
                        className="block px-4 py-2 text-sm text-orange-600 hover:bg-orange-50 font-medium"
                        role="menuitem"
                        onClick={() => setIsProfileOpen(false)}
                      >
                        🔄 Gia hạn Pro
                      </Link>
                    )}
                    <button
                      onClick={() => {
                        setIsProfileOpen(false);
                        handleLogout();
                      }}
                      className="w-full text-left block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                      role="menuitem"
                    >
                      Đăng xuất
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center space-x-3">
                <Link
                  to="/login"
                  className="text-gray-600 hover:text-primary-600 font-medium transition-colors duration-200"
                >
                  Đăng nhập
                </Link>
                <Link
                  to="/register"
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-lg text-white bg-gradient-to-r from-primary-600 to-purple-600 hover:from-primary-700 hover:to-purple-700 transition-all duration-200 transform hover:scale-105 shadow-md"
                >
                  <SparklesIcon className="h-4 w-4 mr-1" />
                  Đăng ký
                </Link>
              </div>
            )}
          </div>
          <div className="-mr-2 flex items-center sm:hidden">
            <button
              type="button"
              className="inline-flex items-center justify-center p-2 rounded-lg text-gray-400 hover:text-gray-500 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-primary-500 transition-all duration-200"
              aria-expanded="false"
              onClick={() => setIsMenuOpen(!isMenuOpen)}
            >
              <span className="sr-only">Mở menu chính</span>
              <Bars3Icon
                className={`${isMenuOpen ? 'hidden' : 'block'} h-6 w-6`}
                aria-hidden="true"
              />
              <XMarkIcon
                className={`${isMenuOpen ? 'block' : 'hidden'} h-6 w-6`}
                aria-hidden="true"
              />
            </button>
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      <div className={`${isMenuOpen ? 'block' : 'hidden'} sm:hidden`}>
        <div className="pt-2 pb-3 space-y-1">
          <Link
            to="/"
            className="block pl-3 pr-4 py-2 border-l-4 border-transparent text-base font-medium text-gray-600 hover:bg-gray-50 hover:border-primary-500 hover:text-primary-700"
            onClick={() => setIsMenuOpen(false)}
          >
            Trang chủ
          </Link>
          <Link
            to="/supported-sites"
            className="block pl-3 pr-4 py-2 border-l-4 border-transparent text-base font-medium text-gray-600 hover:bg-gray-50 hover:border-primary-500 hover:text-primary-700"
            onClick={() => setIsMenuOpen(false)}
          >
            Trang web hỗ trợ
          </Link>
          {/* Thêm các link tải nhanh cho mobile */}
          <div className="border-t border-gray-200 pt-2">
            <p className="pl-3 pr-4 py-2 text-xs font-semibold text-gray-500 uppercase">Công cụ tải nhanh</p>
            <Link
              to="/tai-video-youtube"
              className="block pl-3 pr-4 py-2 border-l-4 border-transparent text-base font-medium text-gray-600 hover:bg-gray-50 hover:border-primary-500 hover:text-primary-700"
              onClick={() => setIsMenuOpen(false)}
            >
              Tải Video YouTube
            </Link>
            <Link
              to="/tai-video-facebook"
              className="block pl-3 pr-4 py-2 border-l-4 border-transparent text-base font-medium text-gray-600 hover:bg-gray-50 hover:border-primary-500 hover:text-primary-700"
              onClick={() => setIsMenuOpen(false)}
            >
              Tải Video Facebook
            </Link>
            <Link
              to="/tai-video-tiktok"
              className="block pl-3 pr-4 py-2 border-l-4 border-transparent text-base font-medium text-gray-600 hover:bg-gray-50 hover:border-primary-500 hover:text-primary-700"
              onClick={() => setIsMenuOpen(false)}
            >
              Tải Video TikTok
            </Link>
            <Link
              to="/tai-video-instagram"
              className="block pl-3 pr-4 py-2 border-l-4 border-transparent text-base font-medium text-gray-600 hover:bg-gray-50 hover:border-primary-500 hover:text-primary-700"
              onClick={() => setIsMenuOpen(false)}
            >
              Tải Video Instagram
            </Link>
            <Link
              to="/tai-nhac-soundcloud"
              className="block pl-3 pr-4 py-2 border-l-4 border-transparent text-base font-medium text-gray-600 hover:bg-gray-50 hover:border-primary-500 hover:text-primary-700"
              onClick={() => setIsMenuOpen(false)}
            >
              Tải Nhạc SoundCloud
            </Link>
          </div>
          {isAuthenticated && (
            <>
              <Link
                to="/dashboard"
                className="block pl-3 pr-4 py-2 border-l-4 border-transparent text-base font-medium text-gray-600 hover:bg-gray-50 hover:border-primary-500 hover:text-primary-700"
                onClick={() => setIsMenuOpen(false)}
              >
                Bảng điều khiển
              </Link>
              <Link
                to="/dashboard/download"
                className="block pl-3 pr-4 py-2 border-l-4 border-transparent text-base font-medium text-gray-600 hover:bg-gray-50 hover:border-primary-500 hover:text-primary-700"
                onClick={() => setIsMenuOpen(false)}
              >
                Tải video
              </Link>
            </>
          )}
        </div>
        {isAuthenticated ? (
          <div className="pt-4 pb-3 border-t border-gray-200">
            <div className="flex items-center px-4">
              <div className="flex-shrink-0">
                <div className="h-10 w-10 rounded-full bg-primary-200 flex items-center justify-center text-primary-600 font-semibold">
                  {user?.name?.charAt(0).toUpperCase() || 'U'}
                </div>
              </div>
              <div className="ml-3">
                <div className="text-base font-medium text-gray-800">{user?.name}</div>
                <div className="text-sm font-medium text-gray-500">{user?.email}</div>
              </div>
            </div>
            <div className="mt-3 space-y-1">
              <Link
                to="/dashboard/profile"
                className="block px-4 py-2 text-base font-medium text-gray-500 hover:text-gray-800 hover:bg-gray-100"
                onClick={() => setIsMenuOpen(false)}
              >
                Hồ sơ của tôi
              </Link>
              <Link
                to="/dashboard/subscription"
                className="block px-4 py-2 text-base font-medium text-gray-500 hover:text-gray-800 hover:bg-gray-100"
                onClick={() => setIsMenuOpen(false)}
              >
                Gói đăng ký
              </Link>
              <Link
                to="/dashboard/referrals"
                className="block px-4 py-2 text-base font-medium text-gray-500 hover:text-gray-800 hover:bg-gray-100"
                onClick={() => setIsMenuOpen(false)}
              >
                Mời bạn bè
              </Link>
              <button
                onClick={() => {
                  setIsMenuOpen(false);
                  handleLogout();
                }}
                className="w-full text-left block px-4 py-2 text-base font-medium text-gray-500 hover:text-gray-800 hover:bg-gray-100"
              >
                Đăng xuất
              </button>
            </div>
          </div>
        ) : (
          <div className="pt-4 pb-3 border-t border-gray-200">
            <div className="space-y-1 px-4">
              <Link
                to="/login"
                className="block text-base font-medium text-gray-500 hover:text-gray-800 hover:bg-gray-100 px-4 py-2 rounded-md"
                onClick={() => setIsMenuOpen(false)}
              >
                Đăng nhập
              </Link>
              <Link
                to="/register"
                className="block text-base font-medium bg-primary-600 text-white hover:bg-primary-700 px-4 py-2 rounded-md"
                onClick={() => setIsMenuOpen(false)}
              >
                Đăng ký
              </Link>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
};

export default Navbar;
