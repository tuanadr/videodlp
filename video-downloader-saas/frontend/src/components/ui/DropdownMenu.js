import React from 'react';
import { Menu, Transition } from '@headlessui/react';
import { ChevronDownIcon } from '@heroicons/react/24/outline';
import { cn } from '../../utils/cn';
import Button from './Button';

const DropdownMenu = ({
  trigger,
  children,
  align = 'right',
  width = 'w-56',
  className = '',
}) => {
  const alignmentClasses = {
    left: 'origin-top-left left-0',
    right: 'origin-top-right right-0',
    center: 'origin-top left-1/2 transform -translate-x-1/2',
  };

  return (
    <Menu as="div" className="relative inline-block text-left">
      <Menu.Button as={React.Fragment}>
        {trigger}
      </Menu.Button>

      <Transition
        as={React.Fragment}
        enter="transition ease-out duration-100"
        enterFrom="transform opacity-0 scale-95"
        enterTo="transform opacity-100 scale-100"
        leave="transition ease-in duration-75"
        leaveFrom="transform opacity-100 scale-100"
        leaveTo="transform opacity-0 scale-95"
      >
        <Menu.Items 
          className={cn(
            "absolute z-50 mt-2 rounded-md bg-white dark:bg-gray-800 shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none",
            width,
            alignmentClasses[align],
            className
          )}
        >
          <div className="py-1">
            {children}
          </div>
        </Menu.Items>
      </Transition>
    </Menu>
  );
};

// Menu Item component
export const DropdownMenuItem = ({
  children,
  onClick,
  disabled = false,
  className = '',
  icon: Icon,
  ...props
}) => {
  return (
    <Menu.Item disabled={disabled}>
      {({ active }) => (
        <button
          onClick={onClick}
          className={cn(
            "group flex w-full items-center px-4 py-2 text-sm transition-colors",
            active 
              ? "bg-gray-100 text-gray-900 dark:bg-gray-700 dark:text-gray-100" 
              : "text-gray-700 dark:text-gray-300",
            disabled && "opacity-50 cursor-not-allowed",
            className
          )}
          disabled={disabled}
          {...props}
        >
          {Icon && (
            <Icon className="mr-3 h-4 w-4 text-gray-400 group-hover:text-gray-500 dark:text-gray-500 dark:group-hover:text-gray-400" />
          )}
          {children}
        </button>
      )}
    </Menu.Item>
  );
};

// Menu Separator component
export const DropdownMenuSeparator = ({ className = '' }) => (
  <div className={cn("my-1 h-px bg-gray-200 dark:bg-gray-700", className)} />
);

// Menu Label component
export const DropdownMenuLabel = ({ children, className = '' }) => (
  <div className={cn("px-4 py-2 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider", className)}>
    {children}
  </div>
);

// Trigger Button component for common use case
export const DropdownTrigger = ({
  children,
  variant = 'secondary',
  size = 'md',
  showChevron = true,
  className = '',
  ...props
}) => (
  <Button
    variant={variant}
    size={size}
    rightIcon={showChevron ? ChevronDownIcon : undefined}
    className={cn("ui-open:bg-gray-100 dark:ui-open:bg-gray-700", className)}
    {...props}
  >
    {children}
  </Button>
);

export default DropdownMenu;
