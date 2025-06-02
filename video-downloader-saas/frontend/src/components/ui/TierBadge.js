import React from 'react';

const TierBadge = ({ tier, className = '' }) => {
  const getTierConfig = (tier) => {
    switch (tier) {
      case 'pro':
        return {
          label: 'Pro',
          bgColor: 'bg-gradient-to-r from-purple-500 to-pink-500',
          textColor: 'text-white',
          icon: '👑'
        };
      case 'free':
        return {
          label: 'Free',
          bgColor: 'bg-gradient-to-r from-blue-500 to-cyan-500',
          textColor: 'text-white',
          icon: '🆓'
        };
      case 'anonymous':
        return {
          label: 'Guest',
          bgColor: 'bg-gradient-to-r from-gray-400 to-gray-600',
          textColor: 'text-white',
          icon: '👤'
        };
      default:
        return {
          label: 'Unknown',
          bgColor: 'bg-gray-300',
          textColor: 'text-gray-700',
          icon: '❓'
        };
    }
  };

  const config = getTierConfig(tier);

  return (
    <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${config.bgColor} ${config.textColor} ${className}`}>
      <span className="mr-1">{config.icon}</span>
      {config.label}
    </span>
  );
};

export default TierBadge;
