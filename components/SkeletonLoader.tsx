import React from 'react';

interface SkeletonCardProps {
  count?: number;
  className?: string;
}

const SkeletonCard: React.FC<SkeletonCardProps> = ({ count = 3, className = '' }) => {
  const skeletons = Array.from({ length: count }, (_, index) => (
    <div 
      key={index}
      className={`bg-gray-100 rounded-2xl p-4 animate-pulse ${className}`}
      style={{ height: '80px' }}
    >
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-gray-200 rounded-xl"></div>
        <div className="flex-1">
          <div className="h-4 bg-gray-200 rounded mb-2"></div>
          <div className="h-3 bg-gray-200 rounded w-2/3"></div>
        </div>
        <div className="w-16 h-8 bg-gray-200 rounded"></div>
      </div>
    </div>
  ));

  return <>{skeletons}</>;
};

interface SkeletonProfileProps {
  className?: string;
}

const SkeletonProfile: React.FC<SkeletonProfileProps> = ({ className = '' }) => {
  return (
    <div className={`bg-gray-100 rounded-2xl p-4 animate-pulse ${className}`}>
      <div className="flex items-center gap-4">
        <div className="w-16 h-16 bg-gray-200 rounded-full"></div>
        <div className="flex-1">
          <div className="h-5 bg-gray-200 rounded mb-2 w-3/4"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2"></div>
        </div>
      </div>
    </div>
  );
};

interface SkeletonStatsProps {
  count?: number;
  className?: string;
}

const SkeletonStats: React.FC<SkeletonStatsProps> = ({ count = 3, className = '' }) => {
  const stats = Array.from({ length: count }, (_, index) => (
    <div 
      key={index}
      className={`bg-gray-100 rounded-2xl p-4 animate-pulse ${className}`}
    >
      <div className="h-4 bg-gray-200 rounded mb-2 w-1/3"></div>
      <div className="h-6 bg-gray-200 rounded w-2/3"></div>
    </div>
  ));

  return <>{stats}</>;
};

export { SkeletonCard, SkeletonProfile, SkeletonStats };