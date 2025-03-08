'use client';

import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center">
      <h2 className="text-2xl font-bold mb-4">Página no encontrada</h2>
      <p className="mb-4">No se encontró la página que estás buscando.</p>
      <Link 
        href="/admin"
        className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
      >
        Volver al panel de administración
      </Link>
    </div>
  );
}