import React from 'react';

interface LoadingProps {
  size?: 'sm' | 'md' | 'lg';
  center?: boolean;
  fullScreen?: boolean;
  text?: string;
  className?: string;
}

export default function Loading({
  size = 'md',
  center = true,
  fullScreen = false,
  text,
  className = '',
}: LoadingProps) {
  const sizeClasses = {
    sm: 'h-6 w-6',
    md: 'h-12 w-12',
    lg: 'h-16 w-16',
  };

  const spinnerSize = sizeClasses[size];
  
  const containerClasses = `
    ${center ? 'flex justify-center items-center' : ''}
    ${fullScreen ? 'fixed inset-0 z-50 bg-white bg-opacity-75' : ''}
    ${className}
  `;

  return (
    <div className={containerClasses}>
      <div className="flex flex-col items-center">
        <div className={`animate-spin rounded-full border-t-2 border-b-2 border-indigo-500 ${spinnerSize}`}></div>
        {text && (
          <p className="mt-4 text-gray-600 font-medium">{text}</p>
        )}
      </div>
    </div>
  );
}