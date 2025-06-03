import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  HomeIcon, 
  ArrowLeftIcon,
  MagnifyingGlassIcon 
} from '@heroicons/react/24/outline';
import SEOHead from '../components/seo/SEOHead';
import Button from '../components/ui/Button';

const NotFoundPage = () => {
  const navigate = useNavigate();

  const popularPages = [
    { name: 'Trang chủ', href: '/', description: 'Quay về trang chủ' },
    { name: 'Tải video', href: '/download', description: 'Tải video từ mọi trang web' },
    { name: 'Tải YouTube', href: '/tai-video-youtube', description: 'Tải video YouTube' },
    { name: 'Tải TikTok', href: '/tai-video-tiktok', description: 'Tải video TikTok' },
    { name: 'Bảng giá', href: '/pricing', description: 'Xem các gói dịch vụ' },
  ];

  return (
    <>
      <SEOHead 
        title="Trang không tồn tại - 404"
        description="Trang bạn đang tìm kiếm không tồn tại. Quay về trang chủ hoặc tìm kiếm nội dung khác."
        noIndex={true}
      />
      
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center px-4 sm:px-6 lg:px-8">
        <div className="max-w-lg w-full text-center">
          {/* 404 Illustration */}
          <div className="mb-8">
            <div className="mx-auto w-32 h-32 bg-gradient-to-br from-primary-100 to-blue-100 dark:from-primary-900/20 dark:to-blue-900/20 rounded-full flex items-center justify-center">
              <span className="text-6xl font-bold text-primary-600 dark:text-primary-400">
                404
              </span>
            </div>
          </div>

          {/* Error Message */}
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-gray-100 mb-4">
            Trang không tồn tại
          </h1>
          
          <p className="text-lg text-gray-600 dark:text-gray-400 mb-8 leading-relaxed">
            Xin lỗi, chúng tôi không thể tìm thấy trang bạn đang tìm kiếm. 
            Có thể trang đã được di chuyển, xóa hoặc bạn đã nhập sai địa chỉ.
          </p>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
            <Button
              onClick={() => navigate(-1)}
              variant="outline"
              size="lg"
              className="px-6 py-3"
              leftIcon={ArrowLeftIcon}
            >
              Quay lại
            </Button>
            
            <Button
              onClick={() => navigate('/')}
              size="lg"
              className="px-6 py-3 bg-primary-600 hover:bg-primary-700"
              leftIcon={HomeIcon}
            >
              Về trang chủ
            </Button>
          </div>

          {/* Popular Pages */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex items-center justify-center mb-4">
              <MagnifyingGlassIcon className="h-5 w-5 text-gray-400 mr-2" />
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                Trang phổ biến
              </h2>
            </div>
            
            <div className="space-y-3">
              {popularPages.map((page) => (
                <Link
                  key={page.href}
                  to={page.href}
                  className="block p-3 rounded-lg border border-gray-200 dark:border-gray-600 hover:border-primary-300 dark:hover:border-primary-600 hover:bg-primary-50 dark:hover:bg-primary-900/10 transition-colors group"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-medium text-gray-900 dark:text-gray-100 group-hover:text-primary-600 dark:group-hover:text-primary-400">
                        {page.name}
                      </h3>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        {page.description}
                      </p>
                    </div>
                    <svg 
                      className="h-5 w-5 text-gray-400 group-hover:text-primary-600 dark:group-hover:text-primary-400 transform group-hover:translate-x-1 transition-all" 
                      fill="none" 
                      stroke="currentColor" 
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </Link>
              ))}
            </div>
          </div>

          {/* Help Text */}
          <div className="mt-8 text-center">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Nếu bạn cho rằng đây là lỗi, vui lòng{' '}
              <Link 
                to="/contact" 
                className="text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 underline"
              >
                liên hệ với chúng tôi
              </Link>
            </p>
          </div>
        </div>
      </div>
    </>
  );
};

export default NotFoundPage;
