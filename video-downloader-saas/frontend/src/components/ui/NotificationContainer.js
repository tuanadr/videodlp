import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { 
  CheckCircleIcon, 
  ExclamationTriangleIcon, 
  InformationCircleIcon, 
  XCircleIcon,
  XMarkIcon 
} from '@heroicons/react/24/outline';
import useAppStore from '../../store/useAppStore';

const NotificationContainer = () => {
  const { ui, removeNotification } = useAppStore();
  const notifications = ui.notifications || [];

  const getIcon = (type) => {
    const iconClass = "h-6 w-6";
    switch (type) {
      case 'success':
        return <CheckCircleIcon className={`${iconClass} text-green-400`} />;
      case 'error':
        return <XCircleIcon className={`${iconClass} text-red-400`} />;
      case 'warning':
        return <ExclamationTriangleIcon className={`${iconClass} text-yellow-400`} />;
      case 'info':
      default:
        return <InformationCircleIcon className={`${iconClass} text-blue-400`} />;
    }
  };

  const getBackgroundColor = (type) => {
    switch (type) {
      case 'success':
        return 'bg-green-50 border-green-200';
      case 'error':
        return 'bg-red-50 border-red-200';
      case 'warning':
        return 'bg-yellow-50 border-yellow-200';
      case 'info':
      default:
        return 'bg-blue-50 border-blue-200';
    }
  };

  const getTitleColor = (type) => {
    switch (type) {
      case 'success':
        return 'text-green-800';
      case 'error':
        return 'text-red-800';
      case 'warning':
        return 'text-yellow-800';
      case 'info':
      default:
        return 'text-blue-800';
    }
  };

  const getMessageColor = (type) => {
    switch (type) {
      case 'success':
        return 'text-green-700';
      case 'error':
        return 'text-red-700';
      case 'warning':
        return 'text-yellow-700';
      case 'info':
      default:
        return 'text-blue-700';
    }
  };

  if (notifications.length === 0) return null;

  const notificationContent = (
    <div className="fixed top-4 right-4 z-50 space-y-4 max-w-sm w-full">
      {notifications.map((notification) => (
        <NotificationItem
          key={notification.id}
          notification={notification}
          onRemove={removeNotification}
          getIcon={getIcon}
          getBackgroundColor={getBackgroundColor}
          getTitleColor={getTitleColor}
          getMessageColor={getMessageColor}
        />
      ))}
    </div>
  );

  return createPortal(notificationContent, document.body);
};

const NotificationItem = ({ 
  notification, 
  onRemove, 
  getIcon, 
  getBackgroundColor, 
  getTitleColor, 
  getMessageColor 
}) => {
  const { id, type, title, message, duration = 5000 } = notification;

  // Auto remove notification after duration
  useEffect(() => {
    if (duration > 0) {
      const timer = setTimeout(() => {
        onRemove(id);
      }, duration);

      return () => clearTimeout(timer);
    }
  }, [id, duration, onRemove]);

  return (
    <div 
      className={`
        relative p-4 border rounded-lg shadow-lg backdrop-blur-sm
        transform transition-all duration-300 ease-in-out
        animate-in slide-in-from-right-full
        ${getBackgroundColor(type)}
      `}
    >
      <div className="flex items-start">
        <div className="flex-shrink-0">
          {getIcon(type)}
        </div>
        
        <div className="ml-3 flex-1">
          {title && (
            <h4 className={`text-sm font-medium ${getTitleColor(type)}`}>
              {title}
            </h4>
          )}
          {message && (
            <p className={`text-sm mt-1 ${getMessageColor(type)}`}>
              {message}
            </p>
          )}
        </div>
        
        <div className="ml-4 flex-shrink-0">
          <button
            onClick={() => onRemove(id)}
            className={`
              inline-flex rounded-md p-1.5 transition-colors duration-200
              ${type === 'success' ? 'text-green-400 hover:bg-green-100' : ''}
              ${type === 'error' ? 'text-red-400 hover:bg-red-100' : ''}
              ${type === 'warning' ? 'text-yellow-400 hover:bg-yellow-100' : ''}
              ${type === 'info' ? 'text-blue-400 hover:bg-blue-100' : ''}
            `}
            aria-label="Đóng thông báo"
          >
            <XMarkIcon className="h-5 w-5" />
          </button>
        </div>
      </div>
      
      {/* Progress bar for auto-dismiss */}
      {duration > 0 && (
        <div className="absolute bottom-0 left-0 right-0 h-1 bg-gray-200 rounded-b-lg overflow-hidden">
          <div 
            className={`h-full transition-all ease-linear ${
              type === 'success' ? 'bg-green-400' :
              type === 'error' ? 'bg-red-400' :
              type === 'warning' ? 'bg-yellow-400' : 'bg-blue-400'
            }`}
            style={{
              animation: `shrink ${duration}ms linear forwards`
            }}
          />
        </div>
      )}
    </div>
  );
};

export default NotificationContainer;
