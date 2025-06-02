import React, { forwardRef } from 'react';
import { cva } from 'class-variance-authority';
import { cn } from '../../utils/cn';

/**
 * Accessible Button Component with proper ARIA attributes,
 * keyboard navigation, and screen reader support
 */

// Button variants using class-variance-authority for better maintainability
const buttonVariants = cva(
  // Base styles
  "inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none ring-offset-background",
  {
    variants: {
      variant: {
        default: "bg-primary-600 text-white hover:bg-primary-700 active:bg-primary-800",
        destructive: "bg-red-600 text-white hover:bg-red-700 active:bg-red-800",
        outline: "border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 active:bg-gray-100",
        secondary: "bg-gray-100 text-gray-900 hover:bg-gray-200 active:bg-gray-300",
        ghost: "text-gray-700 hover:bg-gray-100 active:bg-gray-200",
        link: "underline-offset-4 hover:underline text-primary-600 hover:text-primary-700"
      },
      size: {
        default: "h-10 py-2 px-4",
        sm: "h-9 px-3 rounded-md",
        lg: "h-11 px-8 rounded-md",
        icon: "h-10 w-10"
      }
    },
    defaultVariants: {
      variant: "default",
      size: "default"
    }
  }
);

const AccessibleButton = forwardRef(({
  className,
  variant,
  size,
  children,
  disabled = false,
  loading = false,
  loadingText = "Loading...",
  ariaLabel,
  ariaDescribedBy,
  ariaExpanded,
  ariaHaspopup,
  ariaPressed,
  role = "button",
  type = "button",
  onClick,
  onKeyDown,
  ...props
}, ref) => {
  
  // Handle keyboard navigation
  const handleKeyDown = (event) => {
    // Call custom onKeyDown if provided
    if (onKeyDown) {
      onKeyDown(event);
    }

    // Handle Enter and Space keys for button activation
    if ((event.key === 'Enter' || event.key === ' ') && !disabled && !loading) {
      event.preventDefault();
      if (onClick) {
        onClick(event);
      }
    }
  };

  // Handle click events
  const handleClick = (event) => {
    if (disabled || loading) {
      event.preventDefault();
      return;
    }
    
    if (onClick) {
      onClick(event);
    }
  };

  // Determine ARIA attributes
  const ariaAttributes = {
    'aria-label': ariaLabel,
    'aria-describedby': ariaDescribedBy,
    'aria-expanded': ariaExpanded,
    'aria-haspopup': ariaHaspopup,
    'aria-pressed': ariaPressed,
    'aria-disabled': disabled || loading,
    'aria-busy': loading
  };

  // Remove undefined attributes
  Object.keys(ariaAttributes).forEach(key => {
    if (ariaAttributes[key] === undefined) {
      delete ariaAttributes[key];
    }
  });

  return (
    <button
      ref={ref}
      type={type}
      role={role}
      className={cn(buttonVariants({ variant, size, className }))}
      disabled={disabled || loading}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      {...ariaAttributes}
      {...props}
    >
      {loading && (
        <>
          <svg
            className="animate-spin -ml-1 mr-2 h-4 w-4"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            aria-hidden="true"
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
          <span className="sr-only">{loadingText}</span>
        </>
      )}
      
      {loading ? loadingText : children}
    </button>
  );
});

AccessibleButton.displayName = 'AccessibleButton';

// Specialized button components for common use cases

export const PrimaryButton = forwardRef((props, ref) => (
  <AccessibleButton ref={ref} variant="default" {...props} />
));

export const SecondaryButton = forwardRef((props, ref) => (
  <AccessibleButton ref={ref} variant="secondary" {...props} />
));

export const DangerButton = forwardRef((props, ref) => (
  <AccessibleButton ref={ref} variant="destructive" {...props} />
));

export const OutlineButton = forwardRef((props, ref) => (
  <AccessibleButton ref={ref} variant="outline" {...props} />
));

export const GhostButton = forwardRef((props, ref) => (
  <AccessibleButton ref={ref} variant="ghost" {...props} />
));

export const LinkButton = forwardRef((props, ref) => (
  <AccessibleButton ref={ref} variant="link" {...props} />
));

export const IconButton = forwardRef(({ 
  icon: Icon, 
  ariaLabel, 
  tooltip,
  ...props 
}, ref) => (
  <AccessibleButton
    ref={ref}
    size="icon"
    ariaLabel={ariaLabel || tooltip}
    title={tooltip}
    {...props}
  >
    {Icon && <Icon className="h-4 w-4" aria-hidden="true" />}
  </AccessibleButton>
));

// Button group component for related actions
export const ButtonGroup = ({ 
  children, 
  orientation = 'horizontal',
  className = '',
  ariaLabel,
  ...props 
}) => {
  const groupClasses = cn(
    "inline-flex",
    orientation === 'horizontal' ? "flex-row" : "flex-col",
    "[&>button]:rounded-none [&>button:first-child]:rounded-l-md [&>button:last-child]:rounded-r-md",
    orientation === 'vertical' && "[&>button:first-child]:rounded-t-md [&>button:first-child]:rounded-l-none [&>button:last-child]:rounded-b-md [&>button:last-child]:rounded-r-none",
    "[&>button:not(:first-child)]:border-l-0",
    orientation === 'vertical' && "[&>button:not(:first-child)]:border-l [&>button:not(:first-child)]:border-t-0",
    className
  );

  return (
    <div
      role="group"
      aria-label={ariaLabel}
      className={groupClasses}
      {...props}
    >
      {children}
    </div>
  );
};

// Toggle button component
export const ToggleButton = forwardRef(({
  pressed = false,
  onPressedChange,
  children,
  ariaLabel,
  ...props
}, ref) => {
  const handleClick = (event) => {
    if (onPressedChange) {
      onPressedChange(!pressed);
    }
    if (props.onClick) {
      props.onClick(event);
    }
  };

  return (
    <AccessibleButton
      ref={ref}
      variant={pressed ? "default" : "outline"}
      ariaPressed={pressed}
      ariaLabel={ariaLabel}
      onClick={handleClick}
      {...props}
    >
      {children}
    </AccessibleButton>
  );
});

// Export main component and variants
export default AccessibleButton;

// Display names for better debugging
PrimaryButton.displayName = 'PrimaryButton';
SecondaryButton.displayName = 'SecondaryButton';
DangerButton.displayName = 'DangerButton';
OutlineButton.displayName = 'OutlineButton';
GhostButton.displayName = 'GhostButton';
LinkButton.displayName = 'LinkButton';
IconButton.displayName = 'IconButton';
ButtonGroup.displayName = 'ButtonGroup';
ToggleButton.displayName = 'ToggleButton';
