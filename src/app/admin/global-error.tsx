'use client';
 
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html>
      <body>
        <div className="min-h-screen flex flex-col items-center justify-center p-4">
          <h2 className="text-2xl font-bold mb-4">Error en el panel de administración</h2>
          <p className="mb-4 text-red-600">
            Se ha producido un error al cargar esta página.
          </p>
          {process.env.NODE_ENV === 'development' && (
            <pre className="bg-gray-100 p-4 rounded mb-4 overflow-auto max-w-full">
              {error.message}
            </pre>
          )}
          <button
            onClick={reset}
            className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
          >
            Intentar nuevamente
          </button>
          <a 
            href="/admin" 
            className="mt-4 text-indigo-600 hover:underline"
          >
            Volver al inicio del panel
          </a>
        </div>
      </body>
    </html>
  );
}