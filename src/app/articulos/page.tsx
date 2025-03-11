// src/app/articulos/page.tsx
"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import AppLayout from "../components/AppLayout";
import { verificarLimiteAlcanzado } from "@/lib/supabase";

interface Articulo {
  id: string;
  nombre: string;
  precio: number;
  unidad_id?: string;
  unidad?: {
    id: string;
    nombre: string;
    abreviatura?: string;
  };
  sku?: string;
  created_at: string;
  proveedor: {
    id: string;
    nombre: string;
  };
}

interface SupabaseError {
  message: string;
  details?: string;
  hint?: string;
  code?: string;
}

export default function ArticulosPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [articulos, setArticulos] = useState<Articulo[]>([]);
  const [filtro, setFiltro] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [mensaje, setMensaje] = useState<string | null>(null);
  const [limiteAlcanzado, setLimiteAlcanzado] = useState(false);
  const [articulosDuplicados, setArticulosDuplicados] = useState<{[key: string]: Articulo[]}>({});
  const [mostrarAlertaDuplicados, setMostrarAlertaDuplicados] = useState(false);

  useEffect(() => {
    const cargarArticulos = async () => {
      try {
        setLoading(true);

        // Verificar sesión
        const { data: sessionData } = await supabase.auth.getSession();
        if (!sessionData.session) {
          router.push("/login");
          return;
        }

        // Verificar si se ha alcanzado el límite de artículos
        const limiteExcedido = await verificarLimiteAlcanzado(
          "articulos",
          sessionData.session.user.id
        );

        setLimiteAlcanzado(limiteExcedido);

        // Cargar artículos con información del proveedor y unidad
        const { data, error } = await supabase
          .from("articulos")
          .select(
            `
            *,
            proveedor:proveedor_id(id, nombre),
            unidad:unidad_id(id, nombre, abreviatura)
          `
          )
          .eq("usuario_id", sessionData.session.user.id)
          .order("nombre");

        if (error) throw error;

        // Guardar los artículos
        setArticulos(data || []);
        
        // Detectar artículos duplicados o muy similares
        if (data && data.length > 0) {
          detectarDuplicados(data);
        }
      } catch (err: unknown) {
        const error = err as SupabaseError;
        console.error("Error al cargar artículos:", error.message);
        setError(
          "No se pudieron cargar los artículos. Por favor, intenta nuevamente."
        );
      } finally {
        setLoading(false);
      }
    };

    cargarArticulos();
  }, [router]);
  
  // Función para detectar artículos duplicados o muy similares
  const detectarDuplicados = (articulosData: Articulo[]) => {
    const duplicados: {[key: string]: Articulo[]} = {};
    const gruposSKU: {[key: string]: Articulo[]} = {};
    const gruposNombre: {[key: string]: Articulo[]} = {};
    
    // 1. Agrupar por SKU (si existe)
    articulosData.forEach(articulo => {
      if (articulo.sku && articulo.sku.trim() !== '') {
        const skuNormalizado = articulo.sku.toLowerCase().trim().replace(/[-\s.,;]/g, '');
        if (!gruposSKU[skuNormalizado]) {
          gruposSKU[skuNormalizado] = [];
        }
        gruposSKU[skuNormalizado].push(articulo);
      }
    });
    
    // Identificar duplicados por SKU (2 o más con el mismo SKU)
    Object.keys(gruposSKU).forEach(sku => {
      if (gruposSKU[sku].length >= 2) {
        duplicados[`sku_${sku}`] = gruposSKU[sku];
      }
    });
    
    // 2. Agrupar por nombre similar
    articulosData.forEach(articulo => {
      if (articulo.nombre) {
        // Normalizar nombre (minúsculas, quitar espacios extra, etc.)
        const nombreBase = articulo.nombre.toLowerCase().trim();
        
        // Crear clave para agrupar (primeras 10 letras o todo si es más corto)
        const claveNombre = nombreBase.substring(0, Math.min(10, nombreBase.length));
        
        if (!gruposNombre[claveNombre]) {
          gruposNombre[claveNombre] = [];
        }
        
        // Antes de añadir, verificar si ya está por SKU
        const yaExisteEnDuplicados = Object.values(duplicados).some(
          grupo => grupo.some(art => art.id === articulo.id)
        );
        
        if (!yaExisteEnDuplicados) {
          gruposNombre[claveNombre].push(articulo);
        }
      }
    });
    
    // Filtrar grupos de nombre que tengan artículos muy similares
    Object.keys(gruposNombre).forEach(clave => {
      const grupo = gruposNombre[clave];
      
      if (grupo.length >= 2) {
        // Verificar si los nombres son realmente similares
        const articulosSimilares: Articulo[] = [];
        
        // Comparar cada par de artículos en el grupo
        for (let i = 0; i < grupo.length; i++) {
          for (let j = i + 1; j < grupo.length; j++) {
            const a = grupo[i];
            const b = grupo[j];
            
            // Si son del mismo proveedor, mayor probabilidad de ser duplicados
            const mismoProveedor = a.proveedor && b.proveedor && 
                                  a.proveedor.id === b.proveedor.id;
            
            // Calcular similitud entre nombres
            const nombreA = a.nombre.toLowerCase();
            const nombreB = b.nombre.toLowerCase();
            
            // Comprobar si uno contiene al otro
            const unoContieneOtro = nombreA.includes(nombreB) || nombreB.includes(nombreA);
            
            // Comprobar palabras clave comunes
            const palabrasA = nombreA.split(/\s+/).filter(p => p.length > 3);
            const palabrasB = nombreB.split(/\s+/).filter(p => p.length > 3);
            
            let palabrasComunes = 0;
            for (const palabra of palabrasA) {
              if (palabrasB.some(p => p.includes(palabra) || palabra.includes(p))) {
                palabrasComunes++;
              }
            }
            
            // Si tienen suficiente similitud, añadir ambos a la lista
            if ((mismoProveedor && unoContieneOtro) || 
                (palabrasComunes >= 2) || 
                (mismoProveedor && palabrasComunes >= 1)) {
              
              if (!articulosSimilares.includes(a)) articulosSimilares.push(a);
              if (!articulosSimilares.includes(b)) articulosSimilares.push(b);
            }
          }
        }
        
        // Si encontramos similares, añadir al grupo de duplicados
        if (articulosSimilares.length >= 2) {
          duplicados[`nombre_${clave}`] = articulosSimilares;
        }
      }
    });
    
    // Actualizar estado con los duplicados encontrados
    setArticulosDuplicados(duplicados);
    setMostrarAlertaDuplicados(Object.keys(duplicados).length > 0);
  };

  const handleEliminarArticulo = async (id: string) => {
    if (
      !window.confirm(
        "¿Estás seguro de que quieres eliminar este artículo? Esta acción no se puede deshacer."
      )
    ) {
      return;
    }

    try {
      setLoading(true);

      // Eliminar artículo
      const { error } = await supabase.from("articulos").delete().eq("id", id);

      if (error) throw error;

      // Actualizar la lista de artículos
      setArticulos(articulos.filter((a) => a.id !== id));

      setMensaje("Artículo eliminado correctamente");

      // Limpiar el mensaje después de 3 segundos
      setTimeout(() => {
        setMensaje(null);
      }, 3000);
    } catch (err: unknown) {
      const error = err as SupabaseError;
      console.error("Error al eliminar artículo:", error.message);
      setError(
        "No se pudo eliminar el artículo. Por favor, intenta nuevamente."
      );
    } finally {
      setLoading(false);
    }
  };

  // Función para formatear precio
  const formatearPrecio = (precio: number) => {
    return new Intl.NumberFormat("es-ES", {
      style: "currency",
      currency: "EUR",
    }).format(precio);
  };

  // Filtrar artículos
  const articulosFiltrados = articulos.filter(
    (articulo) =>
      articulo.nombre.toLowerCase().includes(filtro.toLowerCase()) ||
      (articulo.sku &&
        articulo.sku.toLowerCase().includes(filtro.toLowerCase())) ||
      (articulo.proveedor &&
        articulo.proveedor.nombre.toLowerCase().includes(filtro.toLowerCase())) ||
      (articulo.unidad && 
        articulo.unidad.nombre.toLowerCase().includes(filtro.toLowerCase()))
  );

  return (
    <AppLayout>
      <div className="py-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6">
          <h1 className="text-2xl font-bold">Artículos</h1>

          <div className="mt-4 sm:mt-0 flex space-x-2">
            <Link
              href="/articulos/nuevo"
              className={`px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 ${
                limiteAlcanzado ? "opacity-50 cursor-not-allowed" : ""
              }`}
              onClick={(e) => {
                if (limiteAlcanzado) {
                  e.preventDefault();
                  alert(
                    "Has alcanzado el límite de artículos permitido en tu plan. Por favor, actualiza tu membresía para añadir más artículos."
                  );
                }
              }}
            >
              Nuevo Artículo
            </Link>
            
            <Link
              href="/articulos/escanear-factura"
              className="px-4 py-2 bg-indigo-500 text-white rounded-md hover:bg-indigo-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 flex items-center"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M4 5a2 2 0 00-2 2v8a2 2 0 002 2h12a2 2 0 002-2V7a2 2 0 00-2-2h-1.586a1 1 0 01-.707-.293l-1.121-1.121A2 2 0 0011.172 3H8.828a2 2 0 00-1.414.586L6.293 4.707A1 1 0 015.586 5H4zm6 9a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd" />
              </svg>
              Escanear Factura
            </Link>
          </div>
        </div>
        

        {error && (
          <div className="mb-4 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
            {error}
          </div>
        )}

        {mensaje && (
          <div className="mb-4 bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded">
            {mensaje}
          </div>
        )}

        {limiteAlcanzado && (
          <div className="mb-4 bg-yellow-100 border border-yellow-400 text-yellow-700 px-4 py-3 rounded">
            Has alcanzado el límite de artículos permitido en tu plan.
            <Link href="/membresias" className="underline ml-1">
              Actualiza tu membresía
            </Link>{" "}
            para añadir más artículos.
          </div>
        )}
        
        {/* Alerta de duplicados */}
        {mostrarAlertaDuplicados && (
          <div className="mb-6 bg-red-50 border-l-4 border-red-500 p-4 rounded shadow-md">
            <div className="flex items-start">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-red-500" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800">
                  Se han detectado artículos posiblemente duplicados ({Object.keys(articulosDuplicados).length} grupos)
                </h3>
                <div className="mt-2">
                  <button 
                    className="text-sm text-red-700 font-medium underline focus:outline-none"
                    onClick={() => document.getElementById('modal-duplicados')?.classList.remove('hidden')}
                  >
                    Ver y gestionar duplicados
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
        
        {/* Modal de duplicados (oculto por defecto) */}
        <div id="modal-duplicados" className="hidden fixed inset-0 bg-gray-600 bg-opacity-75 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
            <div className="p-4 border-b border-gray-200 flex justify-between items-center">
              <h2 className="text-lg font-semibold">Artículos posiblemente duplicados</h2>
              <button 
                onClick={() => document.getElementById('modal-duplicados')?.classList.add('hidden')}
                className="text-gray-400 hover:text-gray-500 focus:outline-none"
              >
                <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="p-6 overflow-y-auto flex-grow">
              {Object.keys(articulosDuplicados).length === 0 ? (
                <p className="text-gray-500">No se encontraron artículos duplicados.</p>
              ) : (
                <div className="space-y-6">
                  {Object.entries(articulosDuplicados).map(([key, grupo], index) => (
                    <div key={key} className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                      <h3 className="font-medium text-gray-800 mb-2">
                        Grupo {index + 1}: {key.startsWith('sku') ? 'Misma referencia' : 'Nombres similares'}
                      </h3>
                      <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                          <thead className="bg-gray-100">
                            <tr>
                              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nombre</th>
                              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Referencia</th>
                              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Proveedor</th>
                              <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Precio</th>
                              <th className="px-3 py-2 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Acciones</th>
                            </tr>
                          </thead>
                          <tbody className="bg-white divide-y divide-gray-200">
                            {grupo.map(articulo => (
                              <tr key={articulo.id} className="hover:bg-blue-50">
                                <td className="px-3 py-2 whitespace-nowrap">
                                  <Link href={`/articulos/${articulo.id}`} className="text-indigo-600 hover:text-indigo-900">
                                    {articulo.nombre}
                                  </Link>
                                </td>
                                <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-500">
                                  {articulo.sku || "-"}
                                </td>
                                <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-500">
                                  {articulo.proveedor ? (
                                    <Link href={`/proveedores/${articulo.proveedor.id}`} className="text-gray-900 hover:text-indigo-600">
                                      {articulo.proveedor.nombre}
                                    </Link>
                                  ) : (
                                    <span className="text-gray-500">-</span>
                                  )}
                                </td>
                                <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-900 text-right">
                                  {formatearPrecio(articulo.precio)}
                                </td>
                                <td className="px-3 py-2 whitespace-nowrap text-sm text-right space-x-2 flex justify-center">
                                  <Link href={`/articulos/editar/${articulo.id}`} className="text-indigo-600 hover:text-indigo-900">
                                    Editar
                                  </Link>
                                  <button
                                    onClick={() => handleEliminarArticulo(articulo.id)}
                                    className="text-red-600 hover:text-red-900"
                                  >
                                    Eliminar
                                  </button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                      <div className="mt-3 flex justify-end">
                        <Link 
                          href={`/articulos/editar/${grupo[0].id}`}
                          className="text-xs text-blue-600 hover:text-blue-800 font-medium"
                        >
                          Editar principal para unificar
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="px-4 py-3 bg-gray-100 text-right">
              <button 
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                onClick={() => document.getElementById('modal-duplicados')?.classList.add('hidden')}
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>

        {/* Buscador */}
        <div className="mb-6">
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <svg
                className="h-5 w-5 text-gray-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                ></path>
              </svg>
            </div>
            <input
              type="text"
              placeholder="Buscar artículos..."
              className="pl-10 p-2 border border-gray-300 rounded-md w-full sm:max-w-xs"
              value={filtro}
              onChange={(e) => setFiltro(e.target.value)}
            />
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
          </div>
        ) : articulos.length === 0 ? (
          <div className="bg-white shadow rounded-lg p-6 text-center">
            <p className="text-gray-500 mb-4">
              No tienes artículos registrados.
            </p>
            {!limiteAlcanzado && (
              <Link
                href="/articulos/nuevo"
                className="text-indigo-600 hover:text-indigo-800 font-medium"
              >
                Añade tu primer artículo
              </Link>
            )}
          </div>
        ) : articulosFiltrados.length === 0 ? (
          <div className="bg-white shadow rounded-lg p-6 text-center">
            <p className="text-gray-500">
              No se encontraron artículos que coincidan con tu búsqueda.
            </p>
          </div>
        ) : (
          <div className="bg-white shadow overflow-hidden rounded-lg">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Nombre
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Proveedor
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      SKU/Referencia
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Precio
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Unidad de Compra
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Acciones
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {articulosFiltrados.map((articulo) => (
                    <tr key={articulo.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <Link
                          href={`/articulos/${articulo.id}`}
                          className="text-indigo-600 hover:text-indigo-900"
                        >
                          {articulo.nombre}
                        </Link>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {articulo.proveedor ? (
                          <Link
                            href={`/proveedores/${articulo.proveedor.id}`}
                            className="text-gray-900 hover:text-indigo-600"
                          >
                            {articulo.proveedor.nombre}
                          </Link>
                        ) : (
                          <span className="text-gray-500">No asignado</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {articulo.sku || "-"}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {formatearPrecio(articulo.precio)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {articulo.unidad ? 
                          `${articulo.unidad.nombre}${articulo.unidad.abreviatura ? ` (${articulo.unidad.abreviatura})` : ''}` 
                          : "-"}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <Link
                          href={`/articulos/editar/${articulo.id}`}
                          className="text-indigo-600 hover:text-indigo-900 mr-3"
                        >
                          Editar
                        </Link>
                        <button
                          onClick={() => handleEliminarArticulo(articulo.id)}
                          className="text-red-600 hover:text-red-900"
                        >
                          Eliminar
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
        
        {/* Guía de Uso (Desplegable en el pie de página) */}
        <div className="mt-12">
          <button 
            className="w-full flex items-center justify-center p-4 bg-green-50 hover:bg-green-100 rounded-lg shadow-sm transition-colors"
            onClick={() => {
              const guiaCompleta = document.getElementById('guia-completa-articulos');
              if (guiaCompleta) guiaCompleta.style.display = guiaCompleta.style.display === 'none' ? 'block' : 'none';
            }}
          >
            <span className="text-green-700 font-medium mr-2">¿Nuevo por aquí? Ver guía de uso</span>
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-green-600" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </button>
          
          <div id="guia-completa-articulos" className="mt-4 hidden bg-green-50 border-l-4 border-green-500 p-4 rounded shadow-sm">
            <h2 className="text-lg font-semibold text-green-800 mb-2">Gestión de Artículos</h2>
            <p className="text-sm text-green-700 mb-2">
              En esta sección puedes crear y administrar tu catálogo completo de productos. Un catálogo bien organizado simplificará enormemente la creación de pedidos.
            </p>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-3 text-sm">
              <div className="bg-white p-3 rounded shadow-sm border border-green-100">
                <h3 className="font-medium text-green-800 mb-1">Añadir artículos manualmente</h3>
                <p className="text-gray-600 mb-2">Crea tus artículos uno a uno con toda la información:</p>
                <ul className="list-disc pl-5 text-gray-600 space-y-1">
                  <li>Nombre descriptivo del producto</li>
                  <li>Precio actual (puedes actualizarlo después)</li>
                  <li>Unidad de compra (kg, unidad, caja, etc.)</li>
                  <li>Proveedor asociado</li>
                  <li>SKU o código de referencia (opcional)</li>
                </ul>
              </div>
              
              <div className="bg-white p-3 rounded shadow-sm border border-green-100">
                <h3 className="font-medium text-green-800 mb-1">Escanear facturas (¡Recomendado!)</h3>
                <p className="text-gray-600 mb-2">Utiliza nuestra tecnología de escaneo para importar artículos rápidamente:</p>
                <ol className="list-decimal pl-5 text-gray-600 space-y-1">
                  <li>Haz clic en "Escanear Factura"</li>
                  <li>Sube una foto o escaneo de tu factura</li>
                  <li>Verifica los artículos detectados</li>
                  <li>Confirma para añadirlos a tu catálogo</li>
                </ol>
                <p className="text-green-700 text-xs mt-2">La función de escaneo puede detectar nombres, precios y cantidades automáticamente.</p>
              </div>
            </div>
            
            <button 
              className="text-green-600 hover:text-green-800 text-sm font-medium mt-3 flex items-center"
              onClick={() => {
                const guia = document.getElementById('guia-articulos');
                if (guia) guia.style.display = guia.style.display === 'none' ? 'block' : 'none';
              }}
            >
              Ver consejos útiles
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 ml-1" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </button>
            
            <div id="guia-articulos" className="mt-3 hidden">
              <h3 className="font-medium text-green-800 mb-1">Consejos para gestionar artículos:</h3>
              <ul className="list-disc pl-5 text-sm text-gray-700 space-y-1">
                <li>Utiliza nombres descriptivos y consistentes (ej. "Aceite Oliva Virgen 5L" en lugar de "Aceite")</li>
                <li>Mantén los precios actualizados para tener presupuestos precisos</li>
                <li>Asigna cada artículo a su proveedor correspondiente para facilitar los pedidos</li>
                <li>Utiliza la función de escaneo para ahorrar tiempo con grandes catálogos</li>
                <li>Revisa y actualiza periódicamente los artículos poco usados</li>
                <li>Aprovecha el campo SKU para incluir códigos de referencia del proveedor</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
