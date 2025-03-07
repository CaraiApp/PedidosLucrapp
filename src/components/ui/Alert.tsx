import React from 'react';
import { Mensaje } from '@/types';

interface AlertProps {
  mensaje: Mensaje | null;
  onClose?: () => void;
  className?: string;
}

export default function Alert({ mensaje, onClose, className = '' }: AlertProps) {
  if (!mensaje) return null;

  const getAlertStyles = () => {
    switch (mensaje.tipo) {
      case 'exito':
        return 'bg-green-100 border-green-400 text-green-700';
      case 'error':
        return 'bg-red-100 border-red-400 text-red-700';
      case 'advertencia':
        return 'bg-yellow-100 border-yellow-400 text-yellow-700';
      case 'info':
        return 'bg-blue-100 border-blue-400 text-blue-700';
      default:
        return 'bg-gray-100 border-gray-400 text-gray-700';
    }
  };

  return (
    <div
      className={`${getAlertStyles()} px-4 py-3 rounded border mb-4 relative ${className}`}
      role="alert"
    >
      <span className="block sm:inline">{mensaje.texto}</span>
      {onClose && (
        <button
          type="button"
          className="absolute top-0 bottom-0 right-0 px-4 py-3"
          onClick={onClose}
        >
          <span className="sr-only">Cerrar</span>
          <svg
            className="h-6 w-6 fill-current"
            role="button"
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 20 20"
          >
            <path
              fillRule="evenodd"
              d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
              clipRule="evenodd"
            />
          </svg>
        </button>
      )}
    </div>
  );
}