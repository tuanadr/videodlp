import React, { memo, useState, useCallback } from 'react';
import { MagnifyingGlassIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { useDebounceSearch } from '../../hooks/useDebounce';
import Input from './Input';
import Button from './Button';
import { cn } from '../../utils/cn';

const SearchInput = memo(({
  onSearch,
  placeholder = "Tìm kiếm...",
  className = '',
  debounceDelay = 300,
  showClearButton = true,
  size = 'md',
  ...props
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const { debouncedSearchTerm, isSearching } = useDebounceSearch(searchTerm, debounceDelay);

  // Call onSearch when debounced value changes
  React.useEffect(() => {
    onSearch?.(debouncedSearchTerm);
  }, [debouncedSearchTerm, onSearch]);

  const handleChange = useCallback((e) => {
    setSearchTerm(e.target.value);
  }, []);

  const handleClear = useCallback(() => {
    setSearchTerm('');
  }, []);

  const handleKeyDown = useCallback((e) => {
    if (e.key === 'Escape') {
      handleClear();
    }
  }, [handleClear]);

  return (
    <div className={cn("relative", className)}>
      <Input
        type="text"
        placeholder={placeholder}
        value={searchTerm}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        leftIcon={MagnifyingGlassIcon}
        size={size}
        className={cn(
          showClearButton && searchTerm && 'pr-10'
        )}
        {...props}
      />
      
      {/* Loading indicator */}
      {isSearching && (
        <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
          <div className="animate-spin h-4 w-4 text-gray-400">
            <svg className="w-full h-full" fill="none" viewBox="0 0 24 24">
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
          </div>
        </div>
      )}

      {/* Clear button */}
      {showClearButton && searchTerm && !isSearching && (
        <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleClear}
            className="h-6 w-6 p-0 text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300"
            aria-label="Clear search"
          >
            <XMarkIcon className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  );
});

SearchInput.displayName = 'SearchInput';

export default SearchInput;
