import React from 'react';

const SkeletonCard = () => {
  return (
    <div className="bg-gray-200 animate-pulse rounded-lg p-4" style={{ height: '80px' }}>
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-gray-300 rounded-xl"></div>
        <div className="flex-1">
          <div className="h-4 bg-gray-300 rounded mb-2"></div>
          <div className="h-3 bg-gray-300 rounded w-2/3"></div>
        </div>
        <div className="w-16 h-8 bg-gray-300 rounded"></div>
      </div>
    </div>
  );
};

export default SkeletonCard;