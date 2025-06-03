import { useEffect, useRef, useState, useCallback } from 'react';

/**
 * Hook for managing focus trap within a component
 * @param {boolean} isActive - Whether the focus trap is active
 * @returns {object} - Object containing ref and focus management functions
 */
export const useFocusTrap = (isActive = false) => {
  const containerRef = useRef(null);
  const previousActiveElement = useRef(null);

  const getFocusableElements = useCallback(() => {
    if (!containerRef.current) return [];
    
    const focusableSelectors = [
      'button:not([disabled])',
      'input:not([disabled])',
      'select:not([disabled])',
      'textarea:not([disabled])',
      'a[href]',
      '[tabindex]:not([tabindex="-1"])',
      '[contenteditable="true"]'
    ].join(', ');

    return Array.from(containerRef.current.querySelectorAll(focusableSelectors));
  }, []);

  const handleKeyDown = useCallback((e) => {
    if (!isActive || e.key !== 'Tab') return;

    const focusableElements = getFocusableElements();
    if (focusableElements.length === 0) return;

    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];

    if (e.shiftKey) {
      if (document.activeElement === firstElement) {
        e.preventDefault();
        lastElement.focus();
      }
    } else {
      if (document.activeElement === lastElement) {
        e.preventDefault();
        firstElement.focus();
      }
    }
  }, [isActive, getFocusableElements]);

  useEffect(() => {
    if (isActive) {
      previousActiveElement.current = document.activeElement;
      const focusableElements = getFocusableElements();
      if (focusableElements.length > 0) {
        focusableElements[0].focus();
      }
    } else if (previousActiveElement.current) {
      previousActiveElement.current.focus();
      previousActiveElement.current = null;
    }
  }, [isActive, getFocusableElements]);

  useEffect(() => {
    if (isActive) {
      document.addEventListener('keydown', handleKeyDown);
      return () => document.removeEventListener('keydown', handleKeyDown);
    }
  }, [isActive, handleKeyDown]);

  return {
    containerRef,
    focusFirst: () => {
      const focusableElements = getFocusableElements();
      if (focusableElements.length > 0) {
        focusableElements[0].focus();
      }
    },
    focusLast: () => {
      const focusableElements = getFocusableElements();
      if (focusableElements.length > 0) {
        focusableElements[focusableElements.length - 1].focus();
      }
    }
  };
};

/**
 * Hook for managing keyboard navigation
 * @param {Array} items - Array of items to navigate
 * @param {object} options - Navigation options
 * @returns {object} - Object containing current index and navigation functions
 */
export const useKeyboardNavigation = (items = [], options = {}) => {
  const {
    loop = true,
    orientation = 'vertical', // 'vertical' | 'horizontal' | 'both'
    onSelect,
    initialIndex = -1
  } = options;

  const [currentIndex, setCurrentIndex] = useState(initialIndex);

  const navigate = useCallback((direction) => {
    if (items.length === 0) return;

    let newIndex = currentIndex;

    switch (direction) {
      case 'next':
        newIndex = currentIndex + 1;
        if (newIndex >= items.length) {
          newIndex = loop ? 0 : items.length - 1;
        }
        break;
      case 'previous':
        newIndex = currentIndex - 1;
        if (newIndex < 0) {
          newIndex = loop ? items.length - 1 : 0;
        }
        break;
      case 'first':
        newIndex = 0;
        break;
      case 'last':
        newIndex = items.length - 1;
        break;
      default:
        return;
    }

    setCurrentIndex(newIndex);
  }, [currentIndex, items.length, loop]);

  const handleKeyDown = useCallback((e) => {
    const { key } = e;

    switch (key) {
      case 'ArrowDown':
        if (orientation === 'vertical' || orientation === 'both') {
          e.preventDefault();
          navigate('next');
        }
        break;
      case 'ArrowUp':
        if (orientation === 'vertical' || orientation === 'both') {
          e.preventDefault();
          navigate('previous');
        }
        break;
      case 'ArrowRight':
        if (orientation === 'horizontal' || orientation === 'both') {
          e.preventDefault();
          navigate('next');
        }
        break;
      case 'ArrowLeft':
        if (orientation === 'horizontal' || orientation === 'both') {
          e.preventDefault();
          navigate('previous');
        }
        break;
      case 'Home':
        e.preventDefault();
        navigate('first');
        break;
      case 'End':
        e.preventDefault();
        navigate('last');
        break;
      case 'Enter':
      case ' ':
        if (currentIndex >= 0 && currentIndex < items.length) {
          e.preventDefault();
          onSelect?.(items[currentIndex], currentIndex);
        }
        break;
      default:
        break;
    }
  }, [navigate, currentIndex, items, onSelect, orientation]);

  return {
    currentIndex,
    setCurrentIndex,
    navigate,
    handleKeyDown,
    isSelected: (index) => index === currentIndex,
  };
};

/**
 * Hook for managing announcements to screen readers
 * @returns {function} - Function to announce messages
 */
export const useScreenReader = () => {
  const announce = useCallback((message, priority = 'polite') => {
    const announcement = document.createElement('div');
    announcement.setAttribute('aria-live', priority);
    announcement.setAttribute('aria-atomic', 'true');
    announcement.setAttribute('class', 'sr-only');
    announcement.textContent = message;

    document.body.appendChild(announcement);

    setTimeout(() => {
      document.body.removeChild(announcement);
    }, 1000);
  }, []);

  return { announce };
};

/**
 * Hook for detecting reduced motion preference
 * @returns {boolean} - Whether user prefers reduced motion
 */
export const usePrefersReducedMotion = () => {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setPrefersReducedMotion(mediaQuery.matches);

    const handleChange = (e) => setPrefersReducedMotion(e.matches);
    mediaQuery.addEventListener('change', handleChange);

    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  return prefersReducedMotion;
};
