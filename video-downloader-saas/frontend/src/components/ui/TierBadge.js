import React from 'react';
import { getTierClasses } from '../../styles/designSystem';
import {
  UserIcon,
  GiftIcon,
  StarIcon
} from '@heroicons/react/24/outline';

const TierBadge = ({ tier, size = 'md', showIcon = true, className = '' }) => {
  const tierConfig = {
    anonymous: {
      label: 'Khách',
      icon: UserIcon
    },
    free: {
      label: 'Miễn phí',
      icon: GiftIcon
    },
    pro: {
      label: 'Pro',
      icon: StarIcon
    }
  };

  const sizeConfig = {
    sm: {
      padding: 'px-2 py-1',
      text: 'text-xs',
      iconSize: 'h-3 w-3'
    },
    md: {
      padding: 'px-3 py-1',
      text: 'text-sm',
      iconSize: 'h-4 w-4'
    },
    lg: {
      padding: 'px-4 py-2',
      text: 'text-base',
      iconSize: 'h-5 w-5'
    }
  };

  const config = tierConfig[tier] || tierConfig.anonymous;
  const sizeStyles = sizeConfig[size];
  const tierStyles = getTierClasses(tier);
  const Icon = config.icon;

  return (
    <span
      className={`
        inline-flex items-center font-medium rounded-full border transition-colors duration-200
        ${tierStyles.bg} ${tierStyles.text} ${tierStyles.border}
        ${sizeStyles.padding} ${sizeStyles.text}
        ${className}
      `}
    >
      {showIcon && Icon && (
        <Icon className={`mr-1.5 ${sizeStyles.iconSize}`} />
      )}
      {config.label}
    </span>
  );
};

export default TierBadge;
