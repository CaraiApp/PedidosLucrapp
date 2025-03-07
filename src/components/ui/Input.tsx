import React, { InputHTMLAttributes, forwardRef } from 'react';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helpText?: string;
  className?: string;
  labelClassName?: string;
  inputClassName?: string;
  fullWidth?: boolean;
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  (
    {
      label,
      error,
      helpText,
      className = '',
      labelClassName = '',
      inputClassName = '',
      fullWidth = false,
      ...props
    },
    ref
  ) => {
    const baseInputStyles = 'px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500';
    const errorInputStyles = error
      ? 'border-red-300 text-red-900 placeholder-red-300 focus:ring-red-500 focus:border-red-500'
      : 'border-gray-300';
    const widthStyles = fullWidth ? 'w-full' : '';

    return (
      <div className={`${className} ${fullWidth ? 'w-full' : ''}`}>
        {label && (
          <label
            htmlFor={props.id || ''}
            className={`block text-sm font-medium text-gray-700 mb-1 ${labelClassName}`}
          >
            {label}
          </label>
        )}
        <input
          ref={ref}
          className={`${baseInputStyles} ${errorInputStyles} ${widthStyles} ${inputClassName}`}
          {...props}
        />
        {error && (
          <p className="mt-1 text-sm text-red-600">{error}</p>
        )}
        {helpText && !error && (
          <p className="mt-1 text-sm text-gray-500">{helpText}</p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';

export default Input;