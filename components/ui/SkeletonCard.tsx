import React from 'react';

interface SkeletonCardProps {
  variant?: 'default' | 'compact' | 'detailed';
  className?: string;
}

const SkeletonCard: React.FC<SkeletonCardProps> = ({ 
  variant = 'default',
  className = ''
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

  return (
    <div 
      className={`bg-gray-100 animate-pulse rounded-2xl ${className}`}
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
  );
};

export default SkeletonCard;