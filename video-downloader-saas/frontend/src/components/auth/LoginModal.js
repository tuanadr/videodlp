import React, { useState } from 'react';
import { EnvelopeIcon, LockClosedIcon } from '@heroicons/react/24/outline';
import Modal, { ModalBody, ModalFooter } from '../ui/Modal';
import Button from '../ui/Button';
import Input from '../ui/Input';
import PasswordToggleButton from '../ui/PasswordToggleButton';
import { useAuth } from '../../context/AuthContext';
import useAppStore from '../../store/useAppStore';

const LoginModal = () => {
  const { login } = useAuth();
  const { ui, closeModal, openModal, addNotification } = useAppStore();
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const isOpen = ui.modalOpen === 'login';

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.email) {
      newErrors.email = 'Email là bắt buộc';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Email không hợp lệ';
    }

    if (!formData.password) {
      newErrors.password = 'Mật khẩu là bắt buộc';
    } else if (formData.password.length < 6) {
      newErrors.password = 'Mật khẩu phải có ít nhất 6 ký tự';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) return;

    setLoading(true);
    try {
      // Use AuthContext login which handles the API call internally
      const response = await login(formData);

      // Close modal and show success message
      closeModal();
      addNotification({
        type: 'success',
        title: 'Đăng nhập thành công',
        message: `Chào mừng ${response.user.name || response.user.email}!`,
      });

      // Reset form
      setFormData({ email: '', password: '' });
      setErrors({});
      
    } catch (error) {
      const message = error.response?.data?.message || 'Đăng nhập thất bại';
      setErrors({ submit: message });
      
      addNotification({
        type: 'error',
        title: 'Lỗi đăng nhập',
        message,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSocialLogin = async (provider) => {
    try {
      // Implement social login logic here
      addNotification({
        type: 'info',
        title: 'Tính năng đang phát triển',
        message: `Đăng nhập bằng ${provider} sẽ sớm có sẵn.`,
      });
    } catch (error) {
      addNotification({
        type: 'error',
        title: 'Lỗi đăng nhập',
        message: 'Không thể đăng nhập bằng mạng xã hội.',
      });
    }
  };

  const handleClose = () => {
    closeModal();
    setFormData({ email: '', password: '' });
    setErrors({});
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Đăng nhập"
      size="sm"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <ModalBody>
          {/* Email Input */}
          <Input
            label="Email"
            type="email"
            name="email"
            value={formData.email}
            onChange={handleInputChange}
            error={errors.email}
            leftIcon={EnvelopeIcon}
            placeholder="Nhập email của bạn"
            required
            autoComplete="email"
          />

          {/* Password Input */}
          <Input
            label="Mật khẩu"
            type={showPassword ? 'text' : 'password'}
            name="password"
            value={formData.password}
            onChange={handleInputChange}
            error={errors.password}
            leftIcon={LockClosedIcon}
            rightIcon={
              <PasswordToggleButton
                showPassword={showPassword}
                onToggle={() => setShowPassword(!showPassword)}
              />
            }
            placeholder="Nhập mật khẩu"
            required
            autoComplete="current-password"
          />

          {/* Submit Error */}
          {errors.submit && (
            <div className="text-sm text-red-600 bg-red-50 p-3 rounded-md">
              {errors.submit}
            </div>
          )}

          {/* Forgot Password Link */}
          <div className="text-right">
            <button
              type="button"
              onClick={() => openModal('forgot-password')}
              className="text-sm text-primary-600 hover:text-primary-500"
            >
              Quên mật khẩu?
            </button>
          </div>
        </ModalBody>

        <ModalFooter>
          <div className="w-full space-y-3">
            {/* Login Button */}
            <Button
              type="submit"
              variant="primary"
              size="lg"
              loading={loading}
              className="w-full"
            >
              Đăng nhập
            </Button>

            {/* Divider */}
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white text-gray-500">Hoặc</span>
              </div>
            </div>

            {/* Social Login Buttons */}
            <div className="grid grid-cols-2 gap-3">
              <Button
                type="button"
                variant="secondary"
                onClick={() => handleSocialLogin('Google')}
                className="w-full"
              >
                Google
              </Button>
              <Button
                type="button"
                variant="secondary"
                onClick={() => handleSocialLogin('Facebook')}
                className="w-full"
              >
                Facebook
              </Button>
            </div>

            {/* Register Link */}
            <div className="text-center text-sm">
              <span className="text-gray-600">Chưa có tài khoản? </span>
              <button
                type="button"
                onClick={() => openModal('register')}
                className="text-primary-600 hover:text-primary-500 font-medium"
              >
                Đăng ký ngay
              </button>
            </div>
          </div>
        </ModalFooter>
      </form>
    </Modal>
  );
};

export default LoginModal;
