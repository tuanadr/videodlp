import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ChevronRightIcon, HomeIcon } from '@heroicons/react/24/outline';

const Breadcrumbs = ({ customBreadcrumbs = null, className = '' }) => {
  const location = useLocation();
  
  // Define route mappings
  const routeMap = {
    '/': 'Trang chủ',
    '/download': 'Tải video',
    '/pricing': 'Bảng giá',
    '/profile': 'Hồ sơ',
    '/settings': 'Cài đặt',
    '/help': 'Trợ giúp',
    '/contact': 'Liên hệ',
    '/about': 'Về chúng tôi',
    '/terms': 'Điều khoản',
    '/privacy': 'Bảo mật',
  };

  // Generate breadcrumbs from current path
  const generateBreadcrumbs = () => {
    if (customBreadcrumbs) {
      return customBreadcrumbs;
    }

    const pathnames = location.pathname.split('/').filter((x) => x);
    
    if (pathnames.length === 0) {
      return [{ name: 'Trang chủ', href: '/', current: true }];
    }

    const breadcrumbs = [
      { name: 'Trang chủ', href: '/', current: false }
    ];

    pathnames.forEach((pathname, index) => {
      const href = `/${pathnames.slice(0, index + 1).join('/')}`;
      const name = routeMap[href] || pathname.charAt(0).toUpperCase() + pathname.slice(1);
      const current = index === pathnames.length - 1;
      
      breadcrumbs.push({ name, href, current });
    });

    return breadcrumbs;
  };

  const breadcrumbs = generateBreadcrumbs();

  // Don't show breadcrumbs on home page
  if (location.pathname === '/' && !customBreadcrumbs) {
    return null;
  }

  return (
    <nav className={`bg-gray-50 border-b border-gray-200 ${className}`} aria-label="Breadcrumb">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center space-x-4 py-4">
          <ol className="flex items-center space-x-4">
            {breadcrumbs.map((breadcrumb, index) => (
              <li key={breadcrumb.href} className="flex items-center">
                {index > 0 && (
                  <ChevronRightIcon className="h-4 w-4 text-gray-400 mr-4" />
                )}
                
                <div className="flex items-center">
                  {index === 0 && (
                    <HomeIcon className="h-4 w-4 text-gray-400 mr-2" />
                  )}
                  
                  {breadcrumb.current ? (
                    <span className="text-sm font-medium text-gray-900">
                      {breadcrumb.name}
                    </span>
                  ) : (
                    <Link
                      to={breadcrumb.href}
                      className="text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors"
                    >
                      {breadcrumb.name}
                    </Link>
                  )}
                </div>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </nav>
  );
};

export default Breadcrumbs;
