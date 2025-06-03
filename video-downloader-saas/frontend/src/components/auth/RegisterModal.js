import React, { useState } from 'react';
import { 
  EyeIcon, 
  EyeSlashIcon, 
  EnvelopeIcon, 
  LockClosedIcon, 
  UserIcon,
  CheckIcon,
  XMarkIcon
} from '@heroicons/react/24/outline';
import Modal, { ModalBody, ModalFooter } from '../ui/Modal';
import Button from '../ui/Button';
import Input from '../ui/Input';
import { useAuth } from '../../context/AuthContext';
import useAppStore from '../../store/useAppStore';
import { authService } from '../../services/authService';

const RegisterModal = () => {
  const { login } = useAuth();
  const { ui, closeModal, openModal, addNotification } = useAppStore();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    agreeToTerms: false,
  });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const isOpen = ui.modalOpen === 'register';

  // Password strength checker
  const getPasswordStrength = (password) => {
    let strength = 0;
    const checks = {
      length: password.length >= 8,
      lowercase: /[a-z]/.test(password),
      uppercase: /[A-Z]/.test(password),
      number: /\d/.test(password),
      special: /[!@#$%^&*(),.?":{}|<>]/.test(password),
    };

    strength = Object.values(checks).filter(Boolean).length;
    
    return {
      score: strength,
      checks,
      label: strength < 2 ? 'Yếu' : strength < 4 ? 'Trung bình' : 'Mạnh',
      color: strength < 2 ? 'red' : strength < 4 ? 'yellow' : 'green',
    };
  };

  const passwordStrength = getPasswordStrength(formData.password);

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({ 
      ...prev, 
      [name]: type === 'checkbox' ? checked : value 
    }));
    
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Tên là bắt buộc';
    } else if (formData.name.trim().length < 2) {
      newErrors.name = 'Tên phải có ít nhất 2 ký tự';
    }

    if (!formData.email) {
      newErrors.email = 'Email là bắt buộc';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Email không hợp lệ';
    }

    if (!formData.password) {
      newErrors.password = 'Mật khẩu là bắt buộc';
    } else if (passwordStrength.score < 3) {
      newErrors.password = 'Mật khẩu quá yếu. Vui lòng chọn mật khẩu mạnh hơn.';
    }

    if (!formData.confirmPassword) {
      newErrors.confirmPassword = 'Xác nhận mật khẩu là bắt buộc';
    } else if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Mật khẩu xác nhận không khớp';
    }

    if (!formData.agreeToTerms) {
      newErrors.agreeToTerms = 'Bạn phải đồng ý với điều khoản sử dụng';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) return;

    setLoading(true);
    try {
      const response = await authService.register({
        name: formData.name.trim(),
        email: formData.email,
        password: formData.password,
      });
      
      // Update auth context
      login(response.user, response.token);
      
      // Close modal and show success message
      closeModal();
      addNotification({
        type: 'success',
        title: 'Đăng ký thành công',
        message: `Chào mừng ${response.user.name}! Tài khoản của bạn đã được tạo.`,
      });

      // Reset form
      setFormData({
        name: '',
        email: '',
        password: '',
        confirmPassword: '',
        agreeToTerms: false,
      });
      setErrors({});
      
    } catch (error) {
      const message = error.response?.data?.message || 'Đăng ký thất bại';
      setErrors({ submit: message });
      
      addNotification({
        type: 'error',
        title: 'Lỗi đăng ký',
        message,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    closeModal();
    setFormData({
      name: '',
      email: '',
      password: '',
      confirmPassword: '',
      agreeToTerms: false,
    });
    setErrors({});
  };

  const PasswordStrengthIndicator = () => (
    <div className="mt-2">
      <div className="flex items-center space-x-2 mb-2">
        <div className="flex-1 bg-gray-200 rounded-full h-2">
          <div 
            className={`h-2 rounded-full transition-all duration-300 ${
              passwordStrength.color === 'red' ? 'bg-red-500' :
              passwordStrength.color === 'yellow' ? 'bg-yellow-500' : 'bg-green-500'
            }`}
            style={{ width: `${(passwordStrength.score / 5) * 100}%` }}
          />
        </div>
        <span className={`text-xs font-medium ${
          passwordStrength.color === 'red' ? 'text-red-600' :
          passwordStrength.color === 'yellow' ? 'text-yellow-600' : 'text-green-600'
        }`}>
          {passwordStrength.label}
        </span>
      </div>
      
      <div className="grid grid-cols-2 gap-2 text-xs">
        {Object.entries({
          'Ít nhất 8 ký tự': passwordStrength.checks.length,
          'Chữ thường': passwordStrength.checks.lowercase,
          'Chữ hoa': passwordStrength.checks.uppercase,
          'Số': passwordStrength.checks.number,
        }).map(([label, passed]) => (
          <div key={label} className="flex items-center space-x-1">
            {passed ? (
              <CheckIcon className="h-3 w-3 text-green-500" />
            ) : (
              <XMarkIcon className="h-3 w-3 text-gray-400" />
            )}
            <span className={passed ? 'text-green-600' : 'text-gray-500'}>
              {label}
            </span>
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Đăng ký tài khoản"
      size="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <ModalBody>
          {/* Name Input */}
          <Input
            label="Họ và tên"
            type="text"
            name="name"
            value={formData.name}
            onChange={handleInputChange}
            error={errors.name}
            leftIcon={<UserIcon className="h-5 w-5" />}
            placeholder="Nhập họ và tên"
            required
            autoComplete="name"
          />

          {/* Email Input */}
          <Input
            label="Email"
            type="email"
            name="email"
            value={formData.email}
            onChange={handleInputChange}
            error={errors.email}
            leftIcon={<EnvelopeIcon className="h-5 w-5" />}
            placeholder="Nhập email của bạn"
            required
            autoComplete="email"
          />

          {/* Password Input */}
          <div>
            <Input
              label="Mật khẩu"
              type={showPassword ? 'text' : 'password'}
              name="password"
              value={formData.password}
              onChange={handleInputChange}
              error={errors.password}
              leftIcon={<LockClosedIcon className="h-5 w-5" />}
              rightIcon={
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? (
                    <EyeSlashIcon className="h-5 w-5" />
                  ) : (
                    <EyeIcon className="h-5 w-5" />
                  )}
                </button>
              }
              placeholder="Tạo mật khẩu mạnh"
              required
              autoComplete="new-password"
            />
            {formData.password && <PasswordStrengthIndicator />}
          </div>

          {/* Confirm Password Input */}
          <Input
            label="Xác nhận mật khẩu"
            type={showConfirmPassword ? 'text' : 'password'}
            name="confirmPassword"
            value={formData.confirmPassword}
            onChange={handleInputChange}
            error={errors.confirmPassword}
            leftIcon={<LockClosedIcon className="h-5 w-5" />}
            rightIcon={
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="text-gray-400 hover:text-gray-600"
              >
                {showConfirmPassword ? (
                  <EyeSlashIcon className="h-5 w-5" />
                ) : (
                  <EyeIcon className="h-5 w-5" />
                )}
              </button>
            }
            placeholder="Nhập lại mật khẩu"
            required
            autoComplete="new-password"
          />

          {/* Terms Agreement */}
          <div className="flex items-start space-x-2">
            <input
              type="checkbox"
              id="agreeToTerms"
              name="agreeToTerms"
              checked={formData.agreeToTerms}
              onChange={handleInputChange}
              className="mt-1 h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
            />
            <label htmlFor="agreeToTerms" className="text-sm text-gray-700">
              Tôi đồng ý với{' '}
              <a href="/terms" className="text-primary-600 hover:text-primary-500">
                Điều khoản sử dụng
              </a>{' '}
              và{' '}
              <a href="/privacy" className="text-primary-600 hover:text-primary-500">
                Chính sách bảo mật
              </a>
            </label>
          </div>
          {errors.agreeToTerms && (
            <p className="text-sm text-red-600">{errors.agreeToTerms}</p>
          )}

          {/* Submit Error */}
          {errors.submit && (
            <div className="text-sm text-red-600 bg-red-50 p-3 rounded-md">
              {errors.submit}
            </div>
          )}
        </ModalBody>

        <ModalFooter>
          <div className="w-full space-y-3">
            {/* Register Button */}
            <Button
              type="submit"
              variant="primary"
              size="lg"
              loading={loading}
              className="w-full"
            >
              Tạo tài khoản
            </Button>

            {/* Login Link */}
            <div className="text-center text-sm">
              <span className="text-gray-600">Đã có tài khoản? </span>
              <button
                type="button"
                onClick={() => openModal('login')}
                className="text-primary-600 hover:text-primary-500 font-medium"
              >
                Đăng nhập ngay
              </button>
            </div>
          </div>
        </ModalFooter>
      </form>
    </Modal>
  );
};

export default RegisterModal;
