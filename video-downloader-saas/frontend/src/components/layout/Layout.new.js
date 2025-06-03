import React from 'react';
import { useLocation } from 'react-router-dom';
import Header from './Header';
import Footer from './Footer';
import SEOHead from '../seo/SEOHead';

const Layout = ({ children, showFooter = true, className = '' }) => {
  const location = useLocation();

  // Determine if current page should show footer
  const shouldShowFooter = showFooter && !location.pathname.includes('/admin');

  return (
    <>
      {/* SEO Head component for meta tags */}
      <SEOHead />
      
      <div className={`min-h-screen flex flex-col bg-white dark:bg-gray-900 ${className}`}>
        {/* Header */}
        <Header />
        
        {/* Main Content */}
        <main className="flex-1 relative">
          {children}
        </main>
        
        {/* Footer */}
        {shouldShowFooter && <Footer />}
      </div>
    </>
  );
};

export default Layout;
