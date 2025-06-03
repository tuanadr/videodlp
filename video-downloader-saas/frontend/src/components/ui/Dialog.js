import React, { useEffect } from 'react';
import { Dialog as HeadlessDialog, Transition } from '@headlessui/react';
import { XMarkIcon } from '@heroicons/react/24/outline';
import { cn } from '../../utils/cn';
import { useFocusTrap, useScreenReader } from '../../hooks/useAccessibility';
import Button from './Button';
import VisuallyHidden from './VisuallyHidden';

const Dialog = ({
  isOpen,
  onClose,
  title,
  description,
  children,
  size = 'md',
  showCloseButton = true,
  closeOnOverlayClick = true,
  className = '',
  role = 'dialog',
  ariaLabelledBy,
  ariaDescribedBy,
}) => {
  const { containerRef } = useFocusTrap(isOpen);
  const { announce } = useScreenReader();

  const sizeClasses = {
    sm: 'max-w-md',
    md: 'max-w-lg',
    lg: 'max-w-2xl',
    xl: 'max-w-4xl',
    full: 'max-w-full mx-4',
  };

  // Announce dialog opening to screen readers
  useEffect(() => {
    if (isOpen && title) {
      announce(`Dialog opened: ${title}`);
    }
  }, [isOpen, title, announce]);

  // Handle escape key
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      return () => document.removeEventListener('keydown', handleEscape);
    }
  }, [isOpen, onClose]);

  return (
    <Transition appear show={isOpen} as={React.Fragment}>
      <HeadlessDialog
        as="div"
        className="relative z-50"
        onClose={closeOnOverlayClick ? onClose : () => {}}
        role={role}
        aria-labelledby={ariaLabelledBy || (title ? 'dialog-title' : undefined)}
        aria-describedby={ariaDescribedBy || (description ? 'dialog-description' : undefined)}
        aria-modal="true"
      >
        {/* Backdrop */}
        <Transition.Child
          as={React.Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black bg-opacity-25 dark:bg-opacity-50" />
        </Transition.Child>

        {/* Dialog container */}
        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4 text-center">
            <Transition.Child
              as={React.Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <HeadlessDialog.Panel
                ref={containerRef}
                className={cn(
                  "w-full transform overflow-hidden rounded-2xl bg-white dark:bg-gray-800 p-6 text-left align-middle shadow-xl transition-all",
                  sizeClasses[size],
                  className
                )}
              >
                {/* Header */}
                <div className="flex items-center justify-between mb-4">
                  <div>
                    {title && (
                      <HeadlessDialog.Title
                        as="h3"
                        id="dialog-title"
                        className="text-lg font-medium leading-6 text-gray-900 dark:text-gray-100"
                      >
                        {title}
                      </HeadlessDialog.Title>
                    )}
                    {description && (
                      <HeadlessDialog.Description
                        id="dialog-description"
                        className="mt-1 text-sm text-gray-500 dark:text-gray-400"
                      >
                        {description}
                      </HeadlessDialog.Description>
                    )}
                  </div>
                  
                  {showCloseButton && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={onClose}
                      className="text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300"
                      aria-label={`Close ${title || 'dialog'}`}
                      title={`Close ${title || 'dialog'}`}
                    >
                      <XMarkIcon className="h-5 w-5" />
                      <VisuallyHidden>Close dialog</VisuallyHidden>
                    </Button>
                  )}
                </div>

                {/* Content */}
                <div className="mt-4">
                  {children}
                </div>
              </HeadlessDialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </HeadlessDialog>
    </Transition>
  );
};

// Dialog Footer component for consistent button layouts
export const DialogFooter = ({ children, className = '' }) => (
  <div className={cn("flex items-center justify-end space-x-3 mt-6 pt-4 border-t border-gray-200 dark:border-gray-700", className)}>
    {children}
  </div>
);

// Dialog Content component for consistent spacing
export const DialogContent = ({ children, className = '' }) => (
  <div className={cn("space-y-4", className)}>
    {children}
  </div>
);

export default Dialog;
