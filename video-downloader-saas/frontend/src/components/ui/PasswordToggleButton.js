import React from 'react';
import { EyeIcon, EyeSlashIcon } from '@heroicons/react/24/outline';

const PasswordToggleButton = ({ 
  showPassword, 
  onToggle, 
  className = "text-gray-400 hover:text-gray-600" 
}) => {
  return (
    <button
      type="button"
      onClick={onToggle}
      className={className}
      aria-label={showPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
    >
      {showPassword ? (
        <EyeSlashIcon className="h-5 w-5" />
      ) : (
        <EyeIcon className="h-5 w-5" />
      )}
    </button>
  );
};

export default PasswordToggleButton;
