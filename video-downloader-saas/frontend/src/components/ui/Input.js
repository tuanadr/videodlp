import React from 'react';
import { cva } from 'class-variance-authority';
import { cn } from '../../utils/cn';

// Input variants using CVA
const inputVariants = cva(
  "block w-full rounded-lg shadow-sm transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-0 disabled:opacity-50 disabled:cursor-not-allowed",
  {
    variants: {
      size: {
        sm: "px-3 py-1.5 text-sm",
        md: "px-3 py-2 text-sm",
        lg: "px-4 py-3 text-base",
      },
      variant: {
        default: "border border-gray-300 focus:border-primary-500 focus:ring-primary-500 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200 dark:focus:border-primary-500",
        error: "border border-red-300 focus:border-red-500 focus:ring-red-500 dark:border-red-600 dark:bg-gray-800 dark:text-gray-200",
      }
    },
    defaultVariants: {
      size: "md",
      variant: "default",
    },
  }
);

const Input = ({
  label,
  error,
  helperText,
  required = false,
  size = 'md',
  leftIcon: LeftIcon,
  rightIcon: RightIcon,
  className = '',
  id,
  ...props
}) => {
  const inputId = id || `input-${Math.random().toString(36).substr(2, 9)}`;

  const iconSize = cn(
    size === 'sm' ? 'h-4 w-4' :
    size === 'md' ? 'h-5 w-5' : 'h-6 w-6'
  );

  return (
    <div className={cn("space-y-1", className)}>
      {label && (
        <label
          htmlFor={inputId}
          className="block text-sm font-medium text-gray-700 dark:text-gray-300"
        >
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}

      <div className="relative">
        {LeftIcon && (
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            {typeof LeftIcon === 'function' ? (
              <LeftIcon className={cn(iconSize, "text-gray-400 dark:text-gray-500")} />
            ) : (
              LeftIcon
            )}
          </div>
        )}

        <input
          id={inputId}
          className={cn(
            inputVariants({
              size,
              variant: error ? 'error' : 'default'
            }),
            LeftIcon && 'pl-10',
            RightIcon && 'pr-10'
          )}
          {...props}
        />

        {RightIcon && (
          <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
            {typeof RightIcon === 'function' ? (
              <RightIcon className={cn(iconSize, "text-gray-400 dark:text-gray-500")} />
            ) : (
              RightIcon
            )}
          </div>
        )}
      </div>

      {error && (
        <p className="text-sm text-red-600 dark:text-red-400" role="alert">
          {error}
        </p>
      )}

      {helperText && !error && (
        <p className="text-sm text-gray-500 dark:text-gray-400">
          {helperText}
        </p>
      )}
    </div>
  );
};

export default Input;
