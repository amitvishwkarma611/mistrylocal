import React from 'react';

interface SkeletonCardProps {
  count?: number;
  className?: string;
  variant?: 'default' | 'compact' | 'detailed';
}

const SkeletonCard: React.FC<SkeletonCardProps> = ({ 
  count = 3, 
  className = '',
  variant = 'default' 
}) => {
  const getVariantStyles = () => {
    switch (variant) {
      case 'compact':
        return { height: '60px', padding: '1rem' };
      case 'detailed':
        return { height: '120px', padding: '1.5rem' };
      default:
        return { height: '80px', padding: '1rem' };
    }
  };

  const variantStyles = getVariantStyles();
  
  const skeletons = Array.from({ length: count }, (_, index) => (
    <div 
      key={index}
      className={`bg-gray-100 rounded-2xl animate-pulse ${className}`}
      style={variantStyles}
    >
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-gray-200 rounded-xl flex-shrink-0"></div>
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
  showStats?: boolean;
}

const SkeletonProfile: React.FC<SkeletonProfileProps> = ({ 
  className = '',
  showStats = false 
}) => {
  return (
    <div className={`bg-gray-100 rounded-2xl p-4 animate-pulse ${className}`}>
      <div className="flex items-center gap-4">
        <div className="w-16 h-16 bg-gray-200 rounded-full flex-shrink-0"></div>
        <div className="flex-1">
          <div className="h-5 bg-gray-200 rounded mb-2 w-3/4"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2"></div>
        </div>
      </div>
      
      {showStats && (
        <div className="mt-4 pt-4 border-t border-gray-200">
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center">
              <div className="h-6 bg-gray-200 rounded mb-1"></div>
              <div className="h-3 bg-gray-200 rounded w-2/3 mx-auto"></div>
            </div>
            <div className="text-center">
              <div className="h-6 bg-gray-200 rounded mb-1"></div>
              <div className="h-3 bg-gray-200 rounded w-2/3 mx-auto"></div>
            </div>
            <div className="text-center">
              <div className="h-6 bg-gray-200 rounded mb-1"></div>
              <div className="h-3 bg-gray-200 rounded w-2/3 mx-auto"></div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

interface SkeletonStatsProps {
  count?: number;
  className?: string;
  layout?: 'horizontal' | 'vertical' | 'grid';
}

const SkeletonStats: React.FC<SkeletonStatsProps> = ({ 
  count = 3, 
  className = '',
  layout = 'horizontal' 
}) => {
  const getLayoutClass = () => {
    switch (layout) {
      case 'vertical':
        return 'flex flex-col gap-3';
      case 'grid':
        return 'grid grid-cols-2 gap-3 sm:grid-cols-3';
      default:
        return 'flex gap-3 overflow-x-auto pb-2';
    }
  };

  const stats = Array.from({ length: count }, (_, index) => (
    <div 
      key={index}
      className={`bg-gray-100 rounded-2xl p-4 animate-pulse ${className} min-w-[120px]`}
    >
      <div className="h-4 bg-gray-200 rounded mb-2 w-1/3"></div>
      <div className="h-6 bg-gray-200 rounded w-2/3"></div>
    </div>
  ));

  return <div className={getLayoutClass()}>{stats}</div>;
};

interface SkeletonListProps {
  count?: number;
  itemHeight?: string;
  className?: string;
  showAvatar?: boolean;
  showActions?: boolean;
}

const SkeletonList: React.FC<SkeletonListProps> = ({
  count = 5,
  itemHeight = '60px',
  className = '',
  showAvatar = true,
  showActions = true
}) => {
  const items = Array.from({ length: count }, (_, index) => (
    <div 
      key={index}
      className={`bg-gray-100 rounded-xl animate-pulse ${className}`}
      style={{ height: itemHeight }}
    >
      <div className="flex items-center gap-3 h-full px-4">
        {showAvatar && (
          <div className="w-8 h-8 bg-gray-200 rounded-full flex-shrink-0"></div>
        )}
        <div className="flex-1">
          <div className="h-4 bg-gray-200 rounded mb-1"></div>
          <div className="h-3 bg-gray-200 rounded w-3/4"></div>
        </div>
        {showActions && (
          <div className="w-12 h-6 bg-gray-200 rounded"></div>
        )}
      </div>
    </div>
  ));

  return <div className="space-y-2">{items}</div>;
};

interface SkeletonTextProps {
  lines?: number;
  className?: string;
  widths?: string[];
}

const SkeletonText: React.FC<SkeletonTextProps> = ({
  lines = 3,
  className = '',
  widths = []
}) => {
  const lineArray = Array.from({ length: lines }, (_, index) => {
    const width = widths[index] || (index === lines - 1 ? '3/4' : 'full');
    return (
      <div 
        key={index}
        className={`h-4 bg-gray-200 rounded ${className}`}
        style={{ width: width === 'full' ? '100%' : `${parseInt(width) / 4 * 100}%` }}
      ></div>
    );
  });

  return <div className="space-y-2">{lineArray}</div>;
};

interface SkeletonButtonProps {
  count?: number;
  className?: string;
  variant?: 'primary' | 'secondary' | 'ghost';
}

const SkeletonButton: React.FC<SkeletonButtonProps> = ({
  count = 1,
  className = '',
  variant = 'primary'
}) => {
  const getButtonClass = () => {
    switch (variant) {
      case 'secondary':
        return 'h-10 rounded-lg';
      case 'ghost':
        return 'h-8 rounded';
      default:
        return 'h-12 rounded-xl';
    }
  };

  const buttons = Array.from({ length: count }, (_, index) => (
    <div 
      key={index}
      className={`bg-gray-200 animate-pulse ${getButtonClass()} ${className}`}
    ></div>
  ));

  return <div className="flex gap-2">{buttons}</div>;
};

export { 
  SkeletonCard, 
  SkeletonProfile, 
  SkeletonStats, 
  SkeletonList,
  SkeletonText,
  SkeletonButton
};