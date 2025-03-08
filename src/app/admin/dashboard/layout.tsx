// src/app/admin/dashboard/layout.tsx
"use client";

import { ReactNode, useState } from "react";
import Link from "next/link";
import { AdminAuthProvider, useAdminAuth } from "../auth";
import Button from "@/components/ui/Button";

interface AdminLayoutProps {
  children: ReactNode;
}

function AdminDashboardLayout({ children }: AdminLayoutProps) {
  const { logout } = useAdminAuth();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const handleLogout = () => {
    logout();
  };

  const navigation = [
    {
      name: "Dashboard",
      href: "/admin/dashboard",
      icon: (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-6 w-6"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
          />
        </svg>
      ),
    },
    {
      name: "Membresías",
      href: "/admin/dashboard/membresias",
      icon: (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-6 w-6"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
      ),
    },
    {
      name: "Usuarios",
      href: "/admin/dashboard/usuarios",
      icon: (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-6 w-6"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"
          />
        </svg>
      ),
    },
    {
      name: "Comunicaciones",
      href: "/admin/dashboard/comunicaciones",
      icon: (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-6 w-6"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
          />
        </svg>
      ),
    },
    {
      name: "Estadísticas",
      href: "/admin/dashboard/estadisticas",
      icon: (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-6 w-6"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
          />
        </svg>
      ),
    },
    {
      name: "Configuración",
      href: "/admin/dashboard/configuracion/email",
      icon: (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-6 w-6"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
          />
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
          />
        </svg>
      ),
    },
    {
      name: "Seguridad",
      href: "/admin/dashboard/seguridad",
      icon: (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-6 w-6"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
          />
        </svg>
      ),
    },
  ];

  // Componente interno para enlaces de navegación
  const NavLink = ({ item, mobile = false }: { item: typeof navigation[0], mobile?: boolean }) => {
    return (
      <Link
        href={item.href}
        className={`text-gray-300 hover:bg-gray-700 hover:text-white group flex items-center px-2 py-2 ${mobile ? 'text-base' : 'text-sm'} font-medium rounded-md`}
        onClick={mobile ? () => setIsMobileMenuOpen(false) : undefined}
      >
        <div className={`${mobile ? 'mr-4' : 'mr-3'} text-gray-400 group-hover:text-gray-300`}>
          {item.icon}
        </div>
        {item.name}
      </Link>
    );
  };

  return (
    <div className="min-h-screen bg-gray-100">
      <div className="h-screen flex overflow-hidden bg-gray-100">
        {/* Sidebar para escritorio */}
        <div className="hidden md:flex md:flex-shrink-0">
          <div className="flex flex-col w-64">
            <div className="flex flex-col h-0 flex-1 bg-gray-800">
              <div className="flex items-center h-16 flex-shrink-0 px-4 bg-gray-900">
                <h1 className="text-xl font-bold text-white">LucrApp Admin</h1>
              </div>
              <div className="flex-1 flex flex-col overflow-y-auto">
                <nav className="flex-1 px-2 py-4 space-y-1">
                  {navigation.map((item) => (
                    <NavLink key={item.name} item={item} />
                  ))}
                </nav>
              </div>
              <div className="flex-shrink-0 flex bg-gray-700 p-4">
                <div className="flex items-center w-full">
                  <div className="w-full">
                    <Button 
                      variant="ghost" 
                      onClick={handleLogout}
                      className="w-full flex justify-between text-gray-300 hover:text-white hover:bg-gray-600"
                    >
                      <span>Cerrar sesión</span>
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="h-5 w-5"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                        />
                      </svg>
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Contenido principal */}
        <div className="flex flex-col w-0 flex-1 overflow-hidden">
          {/* Barra superior para móvil */}
          <div className="md:hidden pl-1 pt-1 sm:pl-3 sm:pt-3">
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="-ml-0.5 -mt-0.5 h-12 w-12 inline-flex items-center justify-center rounded-md text-gray-500 hover:text-gray-900"
            >
              <span className="sr-only">Abrir sidebar</span>
              <svg
                className="h-6 w-6"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M4 6h16M4 12h16M4 18h16"
                />
              </svg>
            </button>
          </div>

          {/* Menú móvil */}
          {isMobileMenuOpen && (
            <div className="md:hidden fixed inset-0 z-40 flex">
              {/* Overlay */}
              <div
                className="fixed inset-0 bg-gray-600 bg-opacity-75 transition-opacity"
                onClick={() => setIsMobileMenuOpen(false)}
              ></div>

              {/* Menú móvil */}
              <div className="relative flex-1 flex flex-col max-w-xs w-full bg-gray-800 transition ease-in-out duration-300 transform">
                <div className="absolute top-0 right-0 -mr-12 pt-2">
                  <button
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="ml-1 flex items-center justify-center h-10 w-10 rounded-full focus:outline-none focus:ring-2 focus:ring-inset focus:ring-white"
                  >
                    <span className="sr-only">Cerrar sidebar</span>
                    <svg
                      className="h-6 w-6 text-white"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      aria-hidden="true"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M6 18L18 6M6 6l12 12"
                      />
                    </svg>
                  </button>
                </div>

                {/* Contenido del menú móvil */}
                <div className="flex-1 h-0 pt-5 pb-4 overflow-y-auto">
                  <div className="flex-shrink-0 flex items-center px-4">
                    <h1 className="text-xl font-bold text-white">
                      LucrApp Admin
                    </h1>
                  </div>
                  <nav className="mt-5 px-2 space-y-1">
                    {navigation.map((item) => (
                      <NavLink key={item.name} item={item} mobile />
                    ))}
                  </nav>
                </div>
                
                {/* Botón de cerrar sesión móvil */}
                <div className="flex-shrink-0 flex bg-gray-700 p-4">
                  <Button 
                    variant="ghost" 
                    onClick={handleLogout}
                    className="w-full flex justify-between text-gray-300 hover:text-white hover:bg-gray-600"
                  >
                    <span>Cerrar sesión</span>
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-5 w-5"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                      />
                    </svg>
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* Contenido principal */}
          <main className="flex-1 relative z-0 overflow-y-auto focus:outline-none">
            <div className="py-6">
              <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8">
                {children}
              </div>
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}

// Envolvemos el componente con el proveedor de autenticación
export default function AdminLayoutWithAuth({ children }: AdminLayoutProps) {
  return (
    <AdminAuthProvider>
      <AdminDashboardLayout>
        {children}
      </AdminDashboardLayout>
    </AdminAuthProvider>
  );
}