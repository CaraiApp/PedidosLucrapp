import React, { ReactNode } from 'react';

interface CardProps {
  children: ReactNode;
  title?: string;
  footer?: ReactNode;
  className?: string;
  titleClassName?: string;
  bodyClassName?: string;
  footerClassName?: string;
}

export default function Card({
  children,
  title,
  footer,
  className = '',
  titleClassName = '',
  bodyClassName = '',
  footerClassName = '',
}: CardProps) {
  return (
    <div className={`bg-white rounded-lg shadow-md overflow-hidden ${className}`}>
      {title && (
        <div className={`p-4 border-b border-gray-200 ${titleClassName}`}>
          <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
        </div>
      )}
      
      <div className={`p-4 ${bodyClassName}`}>
        {children}
      </div>
      
      {footer && (
        <div className={`p-4 bg-gray-50 border-t border-gray-200 ${footerClassName}`}>
          {footer}
        </div>
      )}
    </div>
  );
}

// Componente Card.Stat para mostrar estadísticas
interface CardStatProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon?: ReactNode;
  className?: string;
  trend?: 'up' | 'down' | 'neutral';
  trendValue?: string;
}

Card.Stat = function CardStat({
  title,
  value,
  subtitle,
  icon,
  className = '',
  trend,
  trendValue,
}: CardStatProps) {
  const getTrendStyle = () => {
    switch (trend) {
      case 'up':
        return 'text-green-500';
      case 'down':
        return 'text-red-500';
      default:
        return 'text-gray-500';
    }
  };

  const getTrendIcon = () => {
    switch (trend) {
      case 'up':
        return (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 15l7-7 7 7"></path>
          </svg>
        );
      case 'down':
        return (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path>
          </svg>
        );
      default:
        return null;
    }
  };

  return (
    <div className={`bg-white rounded-lg shadow-md p-4 ${className}`}>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-500">{title}</p>
          <div className="mt-1">
            <p className="text-3xl font-semibold text-gray-900">{value}</p>
            {subtitle && (
              <p className="mt-1 text-sm text-gray-500">{subtitle}</p>
            )}
          </div>
          {trend && trendValue && (
            <div className={`mt-2 flex items-center text-sm ${getTrendStyle()}`}>
              {getTrendIcon()}
              <span className="ml-1">{trendValue}</span>
            </div>
          )}
        </div>
        {icon && (
          <div className="rounded-md bg-indigo-50 p-3">
            {icon}
          </div>
        )}
      </div>
    </div>
  );
};

// Componente Card.Resource para recursos (proveedores, artículos, etc.)
interface CardResourceProps {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  icon?: ReactNode;
  className?: string;
  onClick?: () => void;
}

Card.Resource = function CardResource({
  title,
  subtitle,
  actions,
  icon,
  className = '',
  onClick,
}: CardResourceProps) {
  return (
    <div 
      className={`bg-white rounded-lg shadow-md p-4 border border-gray-200 hover:shadow-lg transition-shadow ${className} ${onClick ? 'cursor-pointer' : ''}`}
      onClick={onClick}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center">
          {icon && (
            <div className="rounded-md bg-indigo-50 p-2 mr-3">
              {icon}
            </div>
          )}
          <div>
            <h3 className="text-lg font-medium text-gray-900">{title}</h3>
            {subtitle && (
              <p className="mt-1 text-sm text-gray-500">{subtitle}</p>
            )}
          </div>
        </div>
        {actions && (
          <div className="flex items-center">
            {actions}
          </div>
        )}
      </div>
    </div>
  );
};