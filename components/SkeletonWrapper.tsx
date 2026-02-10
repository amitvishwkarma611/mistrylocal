import React from 'react';
import { SkeletonCard, SkeletonProfile, SkeletonStats, SkeletonList, SkeletonText, SkeletonButton } from './SkeletonLoader';

interface SkeletonWrapperProps {
  isLoading: boolean;
  children: React.ReactNode;
  type?: 'card' | 'profile' | 'stats' | 'list' | 'text' | 'button' | 'custom';
  count?: number;
  className?: string;
  customSkeleton?: React.ReactNode;
}

const SkeletonWrapper: React.FC<SkeletonWrapperProps> = ({
  isLoading,
  children,
  type = 'card',
  count = 1,
  className = '',
  customSkeleton
}) => {
  if (!isLoading) {
    return <>{children}</>;
  }

  if (customSkeleton) {
    return <>{customSkeleton}</>;
  }

  const getSkeletonComponent = () => {
    switch (type) {
      case 'profile':
        return <SkeletonProfile className={className} />;
      case 'stats':
        return <SkeletonStats count={count} className={className} />;
      case 'list':
        return <SkeletonList count={count} className={className} />;
      case 'text':
        return <SkeletonText lines={count} className={className} />;
      case 'button':
        return <SkeletonButton count={count} className={className} />;
      case 'card':
      default:
        return <SkeletonCard count={count} className={className} />;
    }
  };

  return (
    <div className="animate-pulse">
      {getSkeletonComponent()}
    </div>
  );
};

export default SkeletonWrapper;