// src/app/dashboard/components/RecentLists.tsx
import Link from "next/link";

interface Lista {
  id: string;
  fecha_creacion: string;
  estado: string;
  numero_articulos?: number;
}

interface RecentListsProps {
  listas: Lista[];
}

export default function RecentLists({ listas }: RecentListsProps) {
  if (!listas || listas.length === 0) {
    return (
      <div className="bg-white shadow overflow-hidden sm:rounded-md">
        <ul className="divide-y divide-gray-200">
          <li>
            <div className="px-4 py-4 sm:px-6">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-indigo-600 truncate">
                  No hay listas de compra recientes
                </p>
              </div>
              <div className="mt-2 sm:flex sm:justify-between">
                <p className="mt-2 flex items-center text-sm text-gray-500 sm:mt-0">
                  Crea tu primera lista para empezar a gestionar tus compras
                </p>
              </div>
            </div>
          </li>
        </ul>
      </div>
    );
  }

  return (
    <div className="bg-white shadow overflow-hidden sm:rounded-md">
      <ul className="divide-y divide-gray-200">
        {listas.map((lista) => (
          <li key={lista.id}>
            <Link
              href={`/listas/${lista.id}`}
              className="block hover:bg-gray-50"
            >
              <div className="px-4 py-4 sm:px-6">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-indigo-600 truncate">
                    Lista #{lista.id.slice(0, 8)}
                  </p>
                  <div className="ml-2 flex-shrink-0 flex">
                    <p
                      className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        lista.estado === "Pendiente"
                          ? "bg-yellow-100 text-yellow-800"
                          : lista.estado === "Completada"
                          ? "bg-green-100 text-green-800"
                          : "bg-gray-100 text-gray-800"
                      }`}
                    >
                      {lista.estado}
                    </p>
                  </div>
                </div>
                <div className="mt-2 sm:flex sm:justify-between">
                  <div className="sm:flex">
                    <p className="flex items-center text-sm text-gray-500">
                      <svg
                        className="flex-shrink-0 mr-1.5 h-5 w-5 text-gray-400"
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 20 20"
                        fill="currentColor"
                        aria-hidden="true"
                      >
                        <path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z" />
                      </svg>
                      {lista.numero_articulos || 0} artículos
                    </p>
                  </div>
                  <div className="mt-2 flex items-center text-sm text-gray-500 sm:mt-0">
                    <svg
                      className="flex-shrink-0 mr-1.5 h-5 w-5 text-gray-400"
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 20 20"
                      fill="currentColor"
                      aria-hidden="true"
                    >
                      <path
                        fillRule="evenodd"
                        d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z"
                        clipRule="evenodd"
                      />
                    </svg>
                    <p>
                      Creada el{" "}
                      {new Date(lista.fecha_creacion).toLocaleDateString(
                        "es-ES",
                        {
                          day: "2-digit",
                          month: "long",
                          year: "numeric",
                        }
                      )}
                    </p>
                  </div>
                </div>
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
