import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import useAppStore from '../../store/useAppStore';

const MobileMenu = ({ isOpen, onClose }) => {
  const { user, logout } = useAuth();
  const { openModal } = useAppStore();
  const location = useLocation();

  const navigation = [
    { name: 'Trang chủ', href: '/', current: location.pathname === '/' },
    { name: 'Tải video', href: '/download', current: location.pathname === '/download' },
    { name: 'Bảng giá', href: '/pricing', current: location.pathname === '/pricing' },
  ];

  const handleLogin = () => {
    openModal('login');
    onClose();
  };

  const handleRegister = () => {
    openModal('register');
    onClose();
  };

  const handleLogout = () => {
    logout();
    onClose();
  };

  const getUserInitials = (name) => {
    if (!name) return 'U';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const getTierBadgeColor = (tier) => {
    switch (tier) {
      case 'pro':
        return 'bg-gradient-to-r from-yellow-400 to-orange-500 text-white';
      case 'free':
        return 'bg-gray-100 text-gray-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black bg-opacity-50 z-40 md:hidden"
        onClick={onClose}
      />
      
      {/* Mobile menu */}
      <div className="fixed inset-y-0 left-0 w-64 bg-white shadow-xl z-50 md:hidden transform transition-transform duration-300 ease-in-out">
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-gray-200">
            <div className="flex items-center space-x-2">
              <div className="h-8 w-8 bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg flex items-center justify-center">
                <svg className="h-5 w-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10" />
                </svg>
              </div>
              <span className="text-lg font-bold text-gray-900">TaiVideoNhanh</span>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100"
            >
              <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* User Info (if logged in) */}
          {user && (
            <div className="p-4 border-b border-gray-200">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center text-white font-medium">
                  {getUserInitials(user.name || user.email)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-gray-900 truncate">
                    {user.name || 'Người dùng'}
                  </div>
                  <div className="text-sm text-gray-500 truncate">
                    {user.email}
                  </div>
                  <div className="mt-1">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${getTierBadgeColor(user.tier)}`}>
                      {user.tier === 'pro' ? '⭐ Pro' : '🆓 Free'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Navigation */}
          <nav className="flex-1 px-2 py-4 space-y-1">
            {navigation.map((item) => (
              <Link
                key={item.name}
                to={item.href}
                onClick={onClose}
                className={`block px-3 py-2 rounded-md text-base font-medium transition-colors ${
                  item.current
                    ? 'text-blue-600 bg-blue-50'
                    : 'text-gray-700 hover:text-blue-600 hover:bg-gray-50'
                }`}
              >
                {item.name}
              </Link>
            ))}

            {/* User Menu Items (if logged in) */}
            {user && (
              <>
                <div className="border-t border-gray-200 my-4"></div>
                
                <Link
                  to="/profile"
                  onClick={onClose}
                  className="flex items-center px-3 py-2 text-base font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-50 rounded-md"
                >
                  <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                  Hồ sơ cá nhân
                </Link>

                <Link
                  to="/settings"
                  onClick={onClose}
                  className="flex items-center px-3 py-2 text-base font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-50 rounded-md"
                >
                  <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  Cài đặt
                </Link>

                {user.tier === 'free' && (
                  <Link
                    to="/pricing"
                    onClick={onClose}
                    className="flex items-center px-3 py-2 text-base font-medium text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-md"
                  >
                    <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                    Nâng cấp Pro
                  </Link>
                )}
              </>
            )}
          </nav>

          {/* Auth Buttons */}
          <div className="p-4 border-t border-gray-200">
            {user ? (
              <button
                onClick={handleLogout}
                className="flex items-center w-full px-3 py-2 text-base font-medium text-red-600 hover:text-red-700 hover:bg-red-50 rounded-md"
              >
                <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
                Đăng xuất
              </button>
            ) : (
              <div className="space-y-2">
                <button
                  onClick={handleLogin}
                  className="w-full px-4 py-2 text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
                >
                  Đăng nhập
                </button>
                <button
                  onClick={handleRegister}
                  className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                >
                  Đăng ký
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
};

export default MobileMenu;
