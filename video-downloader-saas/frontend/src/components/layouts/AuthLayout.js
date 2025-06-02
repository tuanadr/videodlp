import React from 'react';
import { Link } from 'react-router-dom';

const AuthLayout = ({ children }) => {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8" role="document">
      <header className="sm:mx-auto sm:w-full sm:max-w-md">
        <Link to="/" aria-label="Về trang chủ">
          <h1 className="text-center text-3xl font-extrabold text-gray-900">
            VideoDownloader
          </h1>
        </Link>
        <p className="mt-2 text-center text-sm text-gray-700">
          Tải video từ nhiều nguồn khác nhau
        </p>
      </header>

      <main className="mt-8 sm:mx-auto sm:w-full sm:max-w-md" id="auth-content">
        <section className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
          {children}
        </section>
      </main>
    </div>
  );
};

export default AuthLayout;