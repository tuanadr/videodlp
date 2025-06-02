import React from 'react';
import { useAuth } from '../../context/AuthContextV2';
import TierBadge from './TierBadge';

const DownloadLimits = ({ className = '' }) => {
  const { user, getUserTier, getRemainingDownloads, canDownload } = useAuth();
  
  const tier = getUserTier();
  const remaining = getRemainingDownloads();
  const canUserDownload = canDownload();
  
  const tierRestrictions = user?.tierRestrictions;
  
  if (!tierRestrictions && tier !== 'anonymous') {
    return null;
  }

  const getProgressColor = () => {
    if (tier === 'pro') return 'bg-purple-500';
    if (remaining === 'Unlimited') return 'bg-green-500';
    
    const currentCount = user?.monthlyDownloadCount || 0;
    const totalLimit = tierRestrictions?.dailyDownloads || 5;
    const percentage = (currentCount / totalLimit) * 100;
    
    if (percentage >= 90) return 'bg-red-500';
    if (percentage >= 70) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  const getProgressPercentage = () => {
    if (tier === 'pro' || remaining === 'Unlimited') return 100;
    
    const currentCount = user?.monthlyDownloadCount || 0;
    const totalLimit = tierRestrictions?.dailyDownloads || 5;
    return Math.min((currentCount / totalLimit) * 100, 100);
  };

  return (
    <div className={`bg-white rounded-lg shadow-sm border p-4 ${className}`}>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-medium text-gray-900">Download Limits</h3>
        <TierBadge tier={tier} />
      </div>
      
      {tier === 'pro' ? (
        <div className="text-center py-2">
          <div className="text-2xl font-bold text-purple-600">∞</div>
          <div className="text-sm text-gray-600">Unlimited Downloads</div>
        </div>
      ) : (
        <div>
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm text-gray-600">
              {typeof remaining === 'number' ? `${remaining} remaining` : remaining}
            </span>
            <span className="text-sm text-gray-600">
              {user?.monthlyDownloadCount || 0} / {tierRestrictions?.dailyDownloads || 5}
            </span>
          </div>
          
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className={`h-2 rounded-full transition-all duration-300 ${getProgressColor()}`}
              style={{ width: `${getProgressPercentage()}%` }}
            ></div>
          </div>
          
          {!canUserDownload && (
            <div className="mt-2 text-xs text-red-600 bg-red-50 p-2 rounded">
              ⚠️ Download limit reached. Upgrade to Pro for unlimited downloads!
            </div>
          )}
        </div>
      )}
      
      {tier !== 'pro' && (
        <div className="mt-3 pt-3 border-t border-gray-100">
          <button 
            className="w-full bg-gradient-to-r from-purple-500 to-pink-500 text-white text-sm font-medium py-2 px-4 rounded-lg hover:from-purple-600 hover:to-pink-600 transition-all duration-200"
            onClick={() => window.location.href = '/upgrade'}
          >
            Upgrade to Pro
          </button>
        </div>
      )}
    </div>
  );
};

export default DownloadLimits;
