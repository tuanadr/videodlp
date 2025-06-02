// Design System Constants for Video Downloader SaaS
export const designSystem = {
  // Color Palette
  colors: {
    // Primary Brand Colors
    primary: {
      50: '#f0f9ff',
      100: '#e0f2fe',
      200: '#bae6fd',
      300: '#7dd3fc',
      400: '#38bdf8',
      500: '#0ea5e9', // Main brand color
      600: '#0284c7',
      700: '#0369a1',
      800: '#075985',
      900: '#0c4a6e',
    },
    
    // Secondary Colors
    secondary: {
      50: '#f8fafc',
      100: '#f1f5f9',
      200: '#e2e8f0',
      300: '#cbd5e1',
      400: '#94a3b8',
      500: '#64748b',
      600: '#475569',
      700: '#334155',
      800: '#1e293b',
      900: '#0f172a',
    },
    
    // Tier Colors
    tier: {
      anonymous: {
        bg: 'bg-gray-100',
        text: 'text-gray-800',
        border: 'border-gray-300',
        hover: 'hover:bg-gray-200'
      },
      free: {
        bg: 'bg-blue-100',
        text: 'text-blue-800',
        border: 'border-blue-300',
        hover: 'hover:bg-blue-200'
      },
      pro: {
        bg: 'bg-purple-100',
        text: 'text-purple-800',
        border: 'border-purple-300',
        hover: 'hover:bg-purple-200'
      }
    },
    
    // Status Colors
    success: {
      50: '#f0fdf4',
      100: '#dcfce7',
      500: '#22c55e',
      600: '#16a34a',
      700: '#15803d',
    },
    
    warning: {
      50: '#fffbeb',
      100: '#fef3c7',
      500: '#f59e0b',
      600: '#d97706',
      700: '#b45309',
    },
    
    error: {
      50: '#fef2f2',
      100: '#fee2e2',
      500: '#ef4444',
      600: '#dc2626',
      700: '#b91c1c',
    }
  },
  
  // Typography
  typography: {
    fontFamily: {
      sans: ['Inter', 'system-ui', 'sans-serif'],
      mono: ['JetBrains Mono', 'monospace']
    },
    
    fontSize: {
      xs: ['0.75rem', { lineHeight: '1rem' }],
      sm: ['0.875rem', { lineHeight: '1.25rem' }],
      base: ['1rem', { lineHeight: '1.5rem' }],
      lg: ['1.125rem', { lineHeight: '1.75rem' }],
      xl: ['1.25rem', { lineHeight: '1.75rem' }],
      '2xl': ['1.5rem', { lineHeight: '2rem' }],
      '3xl': ['1.875rem', { lineHeight: '2.25rem' }],
      '4xl': ['2.25rem', { lineHeight: '2.5rem' }],
    },
    
    fontWeight: {
      normal: '400',
      medium: '500',
      semibold: '600',
      bold: '700',
    }
  },
  
  // Spacing
  spacing: {
    xs: '0.5rem',    // 8px
    sm: '0.75rem',   // 12px
    md: '1rem',      // 16px
    lg: '1.5rem',    // 24px
    xl: '2rem',      // 32px
    '2xl': '3rem',   // 48px
    '3xl': '4rem',   // 64px
  },
  
  // Border Radius
  borderRadius: {
    none: '0',
    sm: '0.125rem',
    md: '0.375rem',
    lg: '0.5rem',
    xl: '0.75rem',
    '2xl': '1rem',
    full: '9999px',
  },
  
  // Shadows
  shadows: {
    sm: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
    md: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
    lg: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
    xl: '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)',
  },
  
  // Component Sizes
  components: {
    button: {
      sm: 'px-3 py-1.5 text-sm',
      md: 'px-4 py-2 text-sm',
      lg: 'px-6 py-3 text-base',
      xl: 'px-8 py-4 text-lg',
    },
    
    input: {
      sm: 'px-3 py-1.5 text-sm',
      md: 'px-3 py-2 text-sm',
      lg: 'px-4 py-3 text-base',
    },
    
    card: {
      padding: 'p-6',
      border: 'border border-gray-200',
      radius: 'rounded-lg',
      shadow: 'shadow-sm',
    }
  },
  
  // Breakpoints
  breakpoints: {
    sm: '640px',
    md: '768px',
    lg: '1024px',
    xl: '1280px',
    '2xl': '1536px',
  },
  
  // Animation
  animation: {
    transition: 'transition-all duration-200 ease-in-out',
    hover: 'transform hover:scale-105',
    focus: 'focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2',
  }
};

// Utility functions for consistent styling
export const getButtonClasses = (variant = 'primary', size = 'md', disabled = false) => {
  const baseClasses = `inline-flex items-center justify-center font-medium rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 ${designSystem.components.button[size]}`;
  
  const variants = {
    primary: `bg-primary-600 text-white hover:bg-primary-700 focus:ring-primary-500 ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`,
    secondary: `bg-white text-gray-700 border border-gray-300 hover:bg-gray-50 focus:ring-primary-500 ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`,
    success: `bg-green-600 text-white hover:bg-green-700 focus:ring-green-500 ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`,
    danger: `bg-red-600 text-white hover:bg-red-700 focus:ring-red-500 ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`,
    ghost: `text-gray-700 hover:bg-gray-100 focus:ring-primary-500 ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`,
  };
  
  return `${baseClasses} ${variants[variant]}`;
};

export const getInputClasses = (size = 'md', error = false) => {
  const baseClasses = `block w-full border rounded-lg shadow-sm transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-0 ${designSystem.components.input[size]}`;
  const errorClasses = error 
    ? 'border-red-300 focus:border-red-500 focus:ring-red-500' 
    : 'border-gray-300 focus:border-primary-500 focus:ring-primary-500';
  
  return `${baseClasses} ${errorClasses}`;
};

export const getCardClasses = (variant = 'default') => {
  const baseClasses = `${designSystem.components.card.padding} ${designSystem.components.card.border} ${designSystem.components.card.radius} ${designSystem.components.card.shadow} bg-white`;
  
  const variants = {
    default: baseClasses,
    elevated: `${baseClasses} shadow-lg`,
    bordered: `${baseClasses} border-2`,
    flat: `${designSystem.components.card.padding} bg-white`,
  };
  
  return variants[variant];
};

export const getTierClasses = (tier) => {
  return designSystem.colors.tier[tier] || designSystem.colors.tier.anonymous;
};
