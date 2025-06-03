import React from 'react';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'success' | 'outline';
  size?: 'sm' | 'md' | 'lg' | 'xl';
  isLoading?: boolean;
  loading?: boolean;
  fullWidth?: boolean;
  leftIcon?: React.ComponentType<any>;
  rightIcon?: React.ComponentType<any>;
  children: React.ReactNode;
}

const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  size = 'md',
  isLoading = false,
  loading = false,
  fullWidth = false,
  leftIcon: LeftIcon,
  rightIcon: RightIcon,
  children,
  className = '',
  disabled,
  ...props
}) => {
  const isLoadingState = isLoading || loading;
  // Base classes
  const baseClasses = 'inline-flex items-center justify-center font-medium rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2';
  
  // Size classes
  const sizeClasses = {
    sm: 'px-3 py-1.5 text-xs',
    md: 'px-4 py-2 text-sm',
    lg: 'px-6 py-3 text-base',
    xl: 'px-8 py-4 text-lg'
  };
  
  // Variant classes with dark mode support
  const variantClasses = {
    primary: 'bg-primary-600 hover:bg-primary-700 text-white focus:ring-primary-500 border border-transparent dark:bg-primary-600 dark:hover:bg-primary-700',
    secondary: 'bg-white hover:bg-gray-50 text-gray-900 focus:ring-primary-500 border border-gray-300 dark:bg-gray-800 dark:hover:bg-gray-700 dark:text-gray-100 dark:border-gray-600',
    danger: 'bg-red-600 hover:bg-red-700 text-white focus:ring-red-500 border border-transparent dark:bg-red-600 dark:hover:bg-red-700',
    success: 'bg-green-600 hover:bg-green-700 text-white focus:ring-green-500 border border-transparent dark:bg-green-600 dark:hover:bg-green-700',
    outline: 'bg-transparent hover:bg-gray-50 text-primary-600 focus:ring-primary-500 border border-primary-600 dark:hover:bg-gray-800 dark:text-primary-400 dark:border-primary-400'
  };
  
  // Width classes
  const widthClasses = fullWidth ? 'w-full' : '';
  
  // Disabled classes
  const disabledClasses = disabled ? 'opacity-50 cursor-not-allowed' : '';

  // Icon size based on button size
  const iconSize = size === 'sm' ? 'h-4 w-4' : size === 'md' ? 'h-5 w-5' : size === 'lg' ? 'h-5 w-5' : 'h-6 w-6';

  // Loading spinner
  const LoadingSpinner = () => (
    <svg className={`animate-spin -ml-1 mr-2 ${iconSize} text-current`} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
    </svg>
  );
  
  return (
    <button
      className={`${baseClasses} ${sizeClasses[size]} ${variantClasses[variant]} ${widthClasses} ${disabledClasses} ${className}`}
      disabled={disabled || isLoadingState}
      {...props}
    >
      {isLoadingState && <LoadingSpinner />}
      {!isLoadingState && LeftIcon && (
        <LeftIcon className={`${iconSize} ${children ? 'mr-2' : ''}`} />
      )}
      {children}
      {!isLoadingState && RightIcon && (
        <RightIcon className={`${iconSize} ${children ? 'ml-2' : ''}`} />
      )}
    </button>
  );
};

export default Button;