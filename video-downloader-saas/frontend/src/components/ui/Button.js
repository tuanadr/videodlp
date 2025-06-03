import React from 'react';
import { cva } from 'class-variance-authority';
import { cn } from '../../utils/cn';

// Button variants using CVA for better type safety and maintainability
const buttonVariants = cva(
  // Base classes
  "inline-flex items-center justify-center font-medium rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed focus:ring-offset-white dark:focus:ring-offset-gray-900",
  {
    variants: {
      variant: {
        primary: "bg-primary-600 text-white hover:bg-primary-700 focus:ring-primary-500 dark:bg-primary-600 dark:hover:bg-primary-700",
        secondary: "bg-white text-gray-700 border border-gray-300 hover:bg-gray-50 focus:ring-primary-500 dark:bg-gray-800 dark:text-gray-200 dark:border-gray-600 dark:hover:bg-gray-700",
        success: "bg-green-600 text-white hover:bg-green-700 focus:ring-green-500 dark:bg-green-600 dark:hover:bg-green-700",
        danger: "bg-red-600 text-white hover:bg-red-700 focus:ring-red-500 dark:bg-red-600 dark:hover:bg-red-700",
        warning: "bg-yellow-600 text-white hover:bg-yellow-700 focus:ring-yellow-500 dark:bg-yellow-600 dark:hover:bg-yellow-700",
        ghost: "text-gray-700 hover:bg-gray-100 focus:ring-primary-500 dark:text-gray-200 dark:hover:bg-gray-800",
        outline: "border border-gray-300 text-gray-700 hover:bg-gray-50 focus:ring-primary-500 dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-800",
        link: "text-primary-600 hover:text-primary-700 underline-offset-4 hover:underline focus:ring-primary-500 dark:text-primary-400 dark:hover:text-primary-300",
      },
      size: {
        xs: "px-2 py-1 text-xs",
        sm: "px-3 py-1.5 text-sm",
        md: "px-4 py-2 text-sm",
        lg: "px-6 py-3 text-base",
        xl: "px-8 py-4 text-lg",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "md",
    },
  }
);

const Button = ({
  children,
  variant = 'primary',
  size = 'md',
  disabled = false,
  loading = false,
  leftIcon: LeftIcon,
  rightIcon: RightIcon,
  className = '',
  onClick,
  type = 'button',
  ...props
}) => {
  
  const LoadingSpinner = () => (
    <svg
      className={cn(
        "animate-spin",
        size === 'xs' ? 'h-3 w-3' :
        size === 'sm' ? 'h-3 w-3' :
        size === 'md' ? 'h-4 w-4' :
        size === 'lg' ? 'h-5 w-5' : 'h-6 w-6'
      )}
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      />
    </svg>
  );

  const iconSize = cn(
    size === 'xs' ? 'h-3 w-3' :
    size === 'sm' ? 'h-3 w-3' :
    size === 'md' ? 'h-4 w-4' :
    size === 'lg' ? 'h-5 w-5' : 'h-6 w-6'
  );

  return (
    <button
      type={type}
      className={cn(buttonVariants({ variant, size }), className)}
      disabled={disabled || loading}
      onClick={onClick}
      {...props}
    >
      {loading && <LoadingSpinner />}

      {!loading && LeftIcon && (
        <LeftIcon className={cn(iconSize, children ? 'mr-2' : '')} />
      )}

      {children}

      {!loading && RightIcon && (
        <RightIcon className={cn(iconSize, children ? 'ml-2' : '')} />
      )}
    </button>
  );
};

export default Button;
