import React, { useState } from 'react';
import { useAuth } from '../context/AuthContextV2';

const ProfilePage = () => {
  const { user, updateProfile, updatePassword, error } = useAuth();
  
  // State cho form thông tin cá nhân
  const [profileData, setProfileData] = useState({
    name: user?.name || '',
    email: user?.email || ''
  });
  
  // State cho form đổi mật khẩu
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  
  // State cho thông báo
  const [profileSuccess, setProfileSuccess] = useState(false);
  const [passwordSuccess, setPasswordSuccess] = useState(false);
  const [profileErrors, setProfileErrors] = useState({});
  const [passwordErrors, setPasswordErrors] = useState({});
  
  // State cho loading
  const [profileLoading, setProfileLoading] = useState(false);
  const [passwordLoading, setPasswordLoading] = useState(false);

  // Xử lý thay đổi input thông tin cá nhân
  const handleProfileChange = (e) => {
    setProfileData({
      ...profileData,
      [e.target.name]: e.target.value
    });
    
    // Xóa lỗi khi người dùng bắt đầu nhập lại
    if (profileErrors[e.target.name]) {
      setProfileErrors({
        ...profileErrors,
        [e.target.name]: null
      });
    }
    
    // Xóa thông báo thành công khi người dùng thay đổi
    if (profileSuccess) {
      setProfileSuccess(false);
    }
  };

  // Xử lý thay đổi input mật khẩu
  const handlePasswordChange = (e) => {
    setPasswordData({
      ...passwordData,
      [e.target.name]: e.target.value
    });
    
    // Xóa lỗi khi người dùng bắt đầu nhập lại
    if (passwordErrors[e.target.name]) {
      setPasswordErrors({
        ...passwordErrors,
        [e.target.name]: null
      });
    }
    
    // Xóa thông báo thành công khi người dùng thay đổi
    if (passwordSuccess) {
      setPasswordSuccess(false);
    }
  };

  // Xác thực form thông tin cá nhân
  const validateProfileForm = () => {
    const errors = {};
    
    if (!profileData.name.trim()) {
      errors.name = 'Vui lòng nhập tên';
    }
    
    if (!profileData.email.trim()) {
      errors.email = 'Vui lòng nhập email';
    } else if (!/^\S+@\S+\.\S+$/.test(profileData.email)) {
      errors.email = 'Email không hợp lệ';
    }
    
    return errors;
  };

  // Xác thực form đổi mật khẩu
  const validatePasswordForm = () => {
    const errors = {};
    
    if (!passwordData.currentPassword) {
      errors.currentPassword = 'Vui lòng nhập mật khẩu hiện tại';
    }
    
    if (!passwordData.newPassword) {
      errors.newPassword = 'Vui lòng nhập mật khẩu mới';
    } else if (passwordData.newPassword.length < 6) {
      errors.newPassword = 'Mật khẩu mới phải có ít nhất 6 ký tự';
    }
    
    if (!passwordData.confirmPassword) {
      errors.confirmPassword = 'Vui lòng xác nhận mật khẩu mới';
    } else if (passwordData.newPassword !== passwordData.confirmPassword) {
      errors.confirmPassword = 'Mật khẩu xác nhận không khớp';
    }
    
    return errors;
  };

  // Xử lý cập nhật thông tin cá nhân
  const handleProfileSubmit = async (e) => {
    e.preventDefault();
    
    // Kiểm tra form
    const errors = validateProfileForm();
    if (Object.keys(errors).length > 0) {
      setProfileErrors(errors);
      return;
    }
    
    setProfileLoading(true);
    
    try {
      await updateProfile(profileData);
      setProfileSuccess(true);
      
      // Cuộn lên đầu để hiển thị thông báo thành công
      window.scrollTo(0, 0);
    } catch (error) {
      console.error('Lỗi khi cập nhật thông tin:', error);
    } finally {
      setProfileLoading(false);
    }
  };

  // Xử lý đổi mật khẩu
  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    
    // Kiểm tra form
    const errors = validatePasswordForm();
    if (Object.keys(errors).length > 0) {
      setPasswordErrors(errors);
      return;
    }
    
    setPasswordLoading(true);
    
    try {
      await updatePassword({
        currentPassword: passwordData.currentPassword,
        newPassword: passwordData.newPassword
      });
      
      // Reset form
      setPasswordData({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      });
      
      setPasswordSuccess(true);
      
      // Cuộn đến phần đổi mật khẩu để hiển thị thông báo thành công
      document.getElementById('password-section').scrollIntoView({ behavior: 'smooth' });
    } catch (error) {
      console.error('Lỗi khi đổi mật khẩu:', error);
    } finally {
      setPasswordLoading(false);
    }
  };

  return (
    <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
      <div className="px-4 py-6 sm:px-0">
        <header className="mb-10">
          <h1 className="text-2xl font-semibold text-gray-900">Hồ sơ của tôi</h1>
          <p className="mt-1 text-sm text-gray-700">
            Quản lý thông tin cá nhân và mật khẩu của bạn.
          </p>
        </header>

        {/* Thông tin cá nhân */}
        <section className="bg-white shadow overflow-hidden sm:rounded-lg mb-8" aria-labelledby="personal-info-heading">
          <header className="px-4 py-5 sm:px-6">
            <h2 id="personal-info-heading" className="text-lg leading-6 font-medium text-gray-900">
              Thông tin cá nhân
            </h2>
            <p className="mt-1 max-w-2xl text-sm text-gray-700">
              Cập nhật thông tin cá nhân của bạn.
            </p>
          </header>
          
          <div className="border-t border-gray-200 px-4 py-5 sm:p-6">
            {profileSuccess && (
              <div className="mb-4 bg-green-50 border-l-4 border-green-400 p-4" role="alert" aria-live="polite">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <svg className="h-5 w-5 text-green-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <p className="text-sm text-green-700">
                      Thông tin cá nhân đã được cập nhật thành công.
                    </p>
                  </div>
                </div>
              </div>
            )}
            
            {error && (
              <div className="mb-4 bg-red-50 border-l-4 border-red-400 p-4" role="alert" aria-live="assertive">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <svg className="h-5 w-5 text-red-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <p className="text-sm text-red-700">{error}</p>
                  </div>
                </div>
              </div>
            )}
            
            <form onSubmit={handleProfileSubmit} className="space-y-6">
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                  Họ tên
                </label>
                <div className="mt-1">
                  <input
                    type="text"
                    name="name"
                    id="name"
                    value={profileData.name}
                    onChange={handleProfileChange}
                    className={`shadow-sm focus:ring-primary-500 focus:border-primary-500 block w-full sm:text-sm border-gray-300 rounded-md ${
                      profileErrors.name ? 'border-red-300' : ''
                    }`}
                    aria-invalid={profileErrors.name ? "true" : "false"}
                    aria-describedby={profileErrors.name ? "name-error" : undefined}
                  />
                  {profileErrors.name && (
                    <p className="mt-1 text-sm text-red-600" id="name-error">{profileErrors.name}</p>
                  )}
                </div>
              </div>

              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                  Email
                </label>
                <div className="mt-1">
                  <input
                    type="email"
                    name="email"
                    id="email"
                    value={profileData.email}
                    onChange={handleProfileChange}
                    className={`shadow-sm focus:ring-primary-500 focus:border-primary-500 block w-full sm:text-sm border-gray-300 rounded-md ${
                      profileErrors.email ? 'border-red-300' : ''
                    }`}
                    aria-invalid={profileErrors.email ? "true" : "false"}
                    aria-describedby={profileErrors.email ? "email-error" : undefined}
                  />
                  {profileErrors.email && (
                    <p className="mt-1 text-sm text-red-600" id="email-error">{profileErrors.email}</p>
                  )}
                </div>
              </div>

              <div>
                <button
                  type="submit"
                  disabled={profileLoading}
                  className={`inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 ${
                    profileLoading ? 'opacity-70 cursor-not-allowed' : ''
                  }`}
                  aria-busy={profileLoading}
                  aria-disabled={profileLoading}
                >
                  {profileLoading ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" aria-hidden="true">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      <span className="sr-only">Đang cập nhật</span>
                      Đang cập nhật...
                    </>
                  ) : (
                    'Cập nhật thông tin'
                  )}
                </button>
              </div>
            </form>
          </div>
        </section>

        {/* Đổi mật khẩu */}
        <section id="password-section" className="bg-white shadow overflow-hidden sm:rounded-lg" aria-labelledby="password-heading">
          <header className="px-4 py-5 sm:px-6">
            <h2 id="password-heading" className="text-lg leading-6 font-medium text-gray-900">
              Đổi mật khẩu
            </h2>
            <p className="mt-1 max-w-2xl text-sm text-gray-700">
              Cập nhật mật khẩu của bạn để bảo mật tài khoản.
            </p>
          </header>
          
          <div className="border-t border-gray-200 px-4 py-5 sm:p-6">
            {passwordSuccess && (
              <div className="mb-4 bg-green-50 border-l-4 border-green-400 p-4" role="alert" aria-live="polite">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <svg className="h-5 w-5 text-green-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <p className="text-sm text-green-700">
                      Mật khẩu đã được cập nhật thành công.
                    </p>
                  </div>
                </div>
              </div>
            )}
            
            <form onSubmit={handlePasswordSubmit} className="space-y-6">
              <div>
                <label htmlFor="currentPassword" className="block text-sm font-medium text-gray-700">
                  Mật khẩu hiện tại
                </label>
                <div className="mt-1">
                  <input
                    type="password"
                    name="currentPassword"
                    id="currentPassword"
                    value={passwordData.currentPassword}
                    onChange={handlePasswordChange}
                    className={`shadow-sm focus:ring-primary-500 focus:border-primary-500 block w-full sm:text-sm border-gray-300 rounded-md ${
                      passwordErrors.currentPassword ? 'border-red-300' : ''
                    }`}
                    aria-invalid={passwordErrors.currentPassword ? "true" : "false"}
                    aria-describedby={passwordErrors.currentPassword ? "currentPassword-error" : undefined}
                  />
                  {passwordErrors.currentPassword && (
                    <p className="mt-1 text-sm text-red-600" id="currentPassword-error">{passwordErrors.currentPassword}</p>
                  )}
                </div>
              </div>

              <div>
                <label htmlFor="newPassword" className="block text-sm font-medium text-gray-700">
                  Mật khẩu mới
                </label>
                <div className="mt-1">
                  <input
                    type="password"
                    name="newPassword"
                    id="newPassword"
                    value={passwordData.newPassword}
                    onChange={handlePasswordChange}
                    className={`shadow-sm focus:ring-primary-500 focus:border-primary-500 block w-full sm:text-sm border-gray-300 rounded-md ${
                      passwordErrors.newPassword ? 'border-red-300' : ''
                    }`}
                    aria-invalid={passwordErrors.newPassword ? "true" : "false"}
                    aria-describedby={passwordErrors.newPassword ? "newPassword-error" : undefined}
                  />
                  {passwordErrors.newPassword && (
                    <p className="mt-1 text-sm text-red-600" id="newPassword-error">{passwordErrors.newPassword}</p>
                  )}
                </div>
              </div>

              <div>
                <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700">
                  Xác nhận mật khẩu mới
                </label>
                <div className="mt-1">
                  <input
                    type="password"
                    name="confirmPassword"
                    id="confirmPassword"
                    value={passwordData.confirmPassword}
                    onChange={handlePasswordChange}
                    className={`shadow-sm focus:ring-primary-500 focus:border-primary-500 block w-full sm:text-sm border-gray-300 rounded-md ${
                      passwordErrors.confirmPassword ? 'border-red-300' : ''
                    }`}
                    aria-invalid={passwordErrors.confirmPassword ? "true" : "false"}
                    aria-describedby={passwordErrors.confirmPassword ? "confirmPassword-error" : undefined}
                  />
                  {passwordErrors.confirmPassword && (
                    <p className="mt-1 text-sm text-red-600" id="confirmPassword-error">{passwordErrors.confirmPassword}</p>
                  )}
                </div>
              </div>

              <div>
                <button
                  type="submit"
                  disabled={passwordLoading}
                  className={`inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 ${
                    passwordLoading ? 'opacity-70 cursor-not-allowed' : ''
                  }`}
                  aria-busy={passwordLoading}
                  aria-disabled={passwordLoading}
                >
                  {passwordLoading ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" aria-hidden="true">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      <span className="sr-only">Đang cập nhật</span>
                      Đang cập nhật...
                    </>
                  ) : (
                    'Đổi mật khẩu'
                  )}
                </button>
              </div>
            </form>
          </div>
        </section>
      </div>
    </main>
  );
};

export default ProfilePage;