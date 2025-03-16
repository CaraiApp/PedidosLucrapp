"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase, verificarLimiteAlcanzado } from "@/lib/supabase";
import AppLayout from "../../components/AppLayout";
import { Proveedor, Articulo, Unidad } from "@/types";

interface ArticuloConCantidad extends Articulo {
  cantidad: number;
  cantidad_personalizada?: number; // Para cantidades mayores a 6
}

interface ProveedorConArticulos extends Proveedor {
  articulos: ArticuloConCantidad[];
}

export default function NuevaListaCompraPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [enviando, setEnviando] = useState(false);
  const [nombre, setNombre] = useState("");
  const [notas, setNotas] = useState("");
  const [proveedores, setProveedores] = useState<ProveedorConArticulos[]>([]);
  const [unidades, setUnidades] = useState<Unidad[]>([]);
  const [nextListaId, setNextListaId] = useState("001");
  const [error, setError] = useState<string | null>(null);
  const [limiteAlcanzado, setLimiteAlcanzado] = useState(false);
  const [expandedArticulos, setExpandedArticulos] = useState<Record<string, boolean>>({});
  const [expandedCantidades, setExpandedCantidades] = useState<Record<string, boolean>>({});
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [filteredProveedores, setFilteredProveedores] = useState<ProveedorConArticulos[]>([]);

  useEffect(() => {
    const cargarDatos = async () => {
      try {
        setLoading(true);

        // Verificar sesión
        const { data: sessionData } = await supabase.auth.getSession();
        if (!sessionData.session) {
          router.push("/login");
          return;
        }

        // Verificar si se ha alcanzado el límite de listas
        const limiteExcedido = await verificarLimiteAlcanzado(
          "listas",
          sessionData.session.user.id
        );

        console.log("Límite de listas alcanzado:", limiteExcedido);
        setLimiteAlcanzado(limiteExcedido);

        if (limiteExcedido) {
          setError(
            "Has alcanzado el límite de listas de compra permitido en tu plan. Por favor, actualiza tu membresía para añadir más listas."
          );
        }

        // Obtener el último ID de lista para generar el siguiente
        const { data: lastListasData, error: lastListasError } = await supabase
          .from("listas_compra")
          .select("id, title")
          .eq("usuario_id", sessionData.session.user.id)
          .order("fecha_creacion", { ascending: false })
          .limit(1);
        
        let newNextListaId = "001"; // Valor predeterminado

        if (!lastListasError && lastListasData && lastListasData.length > 0) {
          // Intentar extraer el número de pedido del nombre si tiene el formato "Pedido XXX"
          const lastTitle = lastListasData[0].title || "";
          const match = lastTitle.match(/Pedido (\d+)/);
          
          if (match && match[1]) {
            // Incrementar el número encontrado
            const lastNumber = parseInt(match[1], 10);
            const nextNumber = lastNumber + 1;
            newNextListaId = nextNumber.toString().padStart(3, '0');
          }
        }
        
        // Actualizar el estado con el nuevo ID
        setNextListaId(newNextListaId);
        
        // Generar el nombre por defecto simplemente como "Pedido XXX"
        setNombre(`Pedido ${newNextListaId}`);

        // Cargar proveedores
        const { data: proveedoresData, error: proveedoresError } = await supabase
          .from("proveedores")
          .select("*")
          .eq("usuario_id", sessionData.session.user.id)
          .order("nombre");

        if (proveedoresError) throw proveedoresError;

        // Cargar unidades
        const { data: unidadesData, error: unidadesError } = await supabase
          .from("unidades")
          .select("*")
          .order("nombre");

        if (unidadesError) throw unidadesError;
        setUnidades(unidadesData || []);

        // Cargar artículos para cada proveedor
        const proveedoresConArticulos: ProveedorConArticulos[] = [];

        for (const proveedor of proveedoresData || []) {
          const { data: articulosData, error: articulosError } = await supabase
            .from("articulos")
            .select(`
              *,
              unidad:unidad_id(id, nombre, abreviatura)
            `)
            .eq("usuario_id", sessionData.session.user.id)
            .eq("proveedor_id", proveedor.id)
            .order("nombre");

          if (articulosError) throw articulosError;

          proveedoresConArticulos.push({
            ...proveedor,
            articulos: (articulosData || []).map(articulo => ({
              ...articulo,
              cantidad: 0,
            })),
          });
        }

        setProveedores(proveedoresConArticulos);
        setFilteredProveedores(proveedoresConArticulos);
      } catch (err: any) {
        console.error("Error al cargar datos:", err.message);
        setError("No se pudieron cargar los datos. Por favor, intenta nuevamente.");
      } finally {
        setLoading(false);
      }
    };

    cargarDatos();
  }, [router]); // Quitamos nextListaId de las dependencias para evitar bucles
  
  // Efecto para filtrar proveedores y artículos cuando cambia el término de búsqueda
  useEffect(() => {
    if (searchTerm.trim() === "") {
      setFilteredProveedores(proveedores);
      return;
    }
    
    const searchTermLower = searchTerm.toLowerCase();
    
    const filtered = proveedores.map(proveedor => {
      // Filtrar artículos que coincidan con la búsqueda
      const filteredArticulos = proveedor.articulos.filter(articulo => 
        articulo.nombre.toLowerCase().includes(searchTermLower) ||
        (articulo.descripcion && articulo.descripcion.toLowerCase().includes(searchTermLower))
      );
      
      // Solo retornar proveedores que tengan artículos coincidentes
      if (filteredArticulos.length > 0) {
        return {
          ...proveedor,
          articulos: filteredArticulos
        };
      }
      return null;
    }).filter(Boolean) as ProveedorConArticulos[];
    
    setFilteredProveedores(filtered);
  }, [searchTerm, proveedores]);

  const toggleArticuloExpanded = (articuloId: string) => {
    setExpandedArticulos(prev => ({
      ...prev,
      [articuloId]: !prev[articuloId]
    }));
  };

  const toggleCantidadExpanded = (articuloId: string) => {
    setExpandedCantidades(prev => ({
      ...prev,
      [articuloId]: !prev[articuloId]
    }));
  };

  const handleSetCantidad = (proveedorId: string, articuloId: string, cantidad: number) => {
    setProveedores(prevProveedores => 
      prevProveedores.map(proveedor => 
        proveedor.id === proveedorId
          ? {
              ...proveedor,
              articulos: proveedor.articulos.map(articulo => 
                articulo.id === articuloId
                  ? { ...articulo, cantidad }
                  : articulo
              )
            }
          : proveedor
      )
    );
  };

  const handleSetCantidadPersonalizada = (proveedorId: string, articuloId: string, cantidad: number) => {
    setProveedores(prevProveedores => 
      prevProveedores.map(proveedor => 
        proveedor.id === proveedorId
          ? {
              ...proveedor,
              articulos: proveedor.articulos.map(articulo => 
                articulo.id === articuloId
                  ? { 
                      ...articulo, 
                      cantidad: cantidad > 6 ? 7 : cantidad,
                      cantidad_personalizada: cantidad > 6 ? cantidad : undefined
                    }
                  : articulo
              )
            }
          : proveedor
      )
    );
    
    // Ocultar el selector de cantidad personalizada
    if (cantidad <= 6) {
      toggleCantidadExpanded(articuloId);
    }
  };

  const guardarLista = async () => {
    // Verificar si se ha alcanzado el límite de listas - hacemos doble verificación para estar seguros
    const { data: sessionData } = await supabase.auth.getSession();
    if (sessionData?.session) {
      const limiteExcedido = await verificarLimiteAlcanzado(
        "listas",
        sessionData.session.user.id
      );
      
      if (limiteExcedido) {
        setLimiteAlcanzado(true);
        setError("Has alcanzado el límite de listas de compra permitido en tu plan. Por favor, actualiza tu membresía para añadir más listas.");
        router.push("/membresias");
        return;
      }
    }
    
    // También verificamos el estado local por si acaso
    if (limiteAlcanzado) {
      setError("Has alcanzado el límite de listas de compra permitido en tu plan. Por favor, actualiza tu membresía para añadir más listas.");
      router.push("/membresias");
      return;
    }

    if (!nombre.trim()) {
      setError("Debes asignar un nombre a la lista");
      return;
    }

    // Verificar si hay artículos seleccionados
    const hayArticulosSeleccionados = proveedores.some(proveedor => 
      proveedor.articulos.some(articulo => articulo.cantidad > 0)
    );

    if (!hayArticulosSeleccionados) {
      setError("Debes seleccionar al menos un artículo");
      return;
    }

    try {
      setEnviando(true);
      setError(null);

      // Verificar sesión
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session) {
        router.push("/login");
        return;
      }

      // 1. Crear la lista de compra - versión simplificada para evitar error de columna
      const { data: listaData, error: listaError } = await supabase
        .from("listas_compra")
        .insert({
          usuario_id: sessionData.session.user.id,
          title: nombre,           // Campo title
          // Omitimos el campo nombre que parece causar problemas
          estado: 'borrador',
          fecha_creacion: new Date().toISOString(),
          notas: notas || null
        })
        .select()
        .single();

      if (listaError) throw listaError;

      // 2. Crear los items de la lista
      const items = [];
      for (const proveedor of proveedores) {
        for (const articulo of proveedor.articulos) {
          if (articulo.cantidad > 0) {
            // Usar la cantidad personalizada si existe y es mayor a 6
            const cantidadFinal = articulo.cantidad === 7 && articulo.cantidad_personalizada 
              ? articulo.cantidad_personalizada 
              : articulo.cantidad;
              
            items.push({
              lista_id: listaData.id,
              articulo_id: articulo.id,
              cantidad: cantidadFinal,
              precio_unitario: articulo.precio || 0,
              unidad: articulo.unidad?.nombre || "",
              completado: false
            });
          }
        }
      }

      if (items.length > 0) {
        const { error: itemsError } = await supabase
          .from("items_lista_compra")
          .insert(items);

        if (itemsError) throw itemsError;
      }

      // Redirigir a la página de la lista de listas
      router.push("/listas-compra");
      
      // Limpiamos el estado para que la próxima vez se calcule correctamente el siguiente ID
      setNombre("");
      setNextListaId("");
    } catch (err: any) {
      console.error("Error al guardar la lista:", err.message);
      setError("No se pudo guardar la lista. Por favor, intenta nuevamente.");
    } finally {
      setEnviando(false);
    }
  };

  return (
    <AppLayout>
      <div className="py-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold">Nueva Lista de Compra</h1>
        </div>

        {error && (
          <div className="mb-4 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
            {error}
          </div>
        )}

        {limiteAlcanzado && (
          <div className="mb-4 bg-yellow-100 border border-yellow-400 text-yellow-700 px-4 py-3 rounded">
            Has alcanzado el límite de listas de compra permitido en tu plan.
            <Link href="/membresias" className="ml-1 font-bold underline">
              Actualiza tu membresía
            </Link> para añadir más listas.
          </div>
        )}

        <div className="bg-white shadow rounded-lg p-6 mb-6">
          <div className="mb-4">
            <label htmlFor="nombre" className="block text-sm font-medium text-gray-700 mb-1">
              Nombre de la lista
            </label>
            <input
              type="text"
              id="nombre"
              className="w-full p-2 border border-gray-300 rounded-md"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              placeholder="Ej: Pedido 001 - 7 de marzo de 2025"
              disabled
            />
            <p className="mt-1 text-xs text-gray-500">El nombre del pedido se genera automáticamente</p>
          </div>
          
          <div className="mb-4">
            <label htmlFor="notas" className="block text-sm font-medium text-gray-700 mb-1">
              Notas (opcional)
            </label>
            <textarea
              id="notas"
              className="w-full p-2 border border-gray-300 rounded-md"
              value={notas}
              onChange={(e) => setNotas(e.target.value)}
              rows={3}
              placeholder="Notas adicionales para esta lista"
            />
          </div>
          
          <div className="mb-2">
            <label htmlFor="buscar" className="block text-sm font-medium text-gray-700 mb-1">
              Buscar artículos
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
                </svg>
              </div>
              <input
                type="text"
                id="buscar"
                className="w-full pl-10 p-2 border border-gray-300 rounded-md"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Buscar por nombre o descripción"
              />
              {searchTerm && (
                <button 
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                  onClick={() => setSearchTerm("")}
                >
                  <svg className="h-5 w-5 text-gray-400 hover:text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
                  </svg>
                </button>
              )}
            </div>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center my-10">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
          </div>
        ) : proveedores.length === 0 ? (
          <div className="bg-white shadow rounded-lg p-6 text-center">
            <p className="text-gray-500 mb-4">
              No tienes proveedores registrados.
            </p>
            <Link
              href="/proveedores/nuevo"
              className="text-indigo-600 hover:text-indigo-800 font-medium"
            >
              Añade tu primer proveedor
            </Link>
          </div>
        ) : filteredProveedores.length === 0 && searchTerm ? (
          <div className="bg-white shadow rounded-lg p-6 text-center">
            <p className="text-gray-500 mb-4">
              No se encontraron artículos que coincidan con "{searchTerm}".
            </p>
            <button 
              onClick={() => setSearchTerm("")}
              className="text-indigo-600 hover:text-indigo-800 font-medium"
            >
              Mostrar todos los artículos
            </button>
          </div>
        ) : (
          <>
            <div className="space-y-6">
              {filteredProveedores.map((proveedor) => (
                <div key={proveedor.id} className="bg-white shadow rounded-lg overflow-hidden">
                  <div className="bg-gray-50 px-6 py-4 border-b">
                    <h2 className="text-xl font-semibold text-gray-800">{proveedor.nombre}</h2>
                  </div>
                  
                  {proveedor.articulos.length === 0 ? (
                    <div className="p-6 text-center">
                      <p className="text-gray-500">
                        No hay artículos para este proveedor.
                      </p>
                      <Link
                        href={`/articulos/nuevo?proveedor=${proveedor.id}`}
                        className="text-indigo-600 hover:text-indigo-800 font-medium mt-2 inline-block"
                      >
                        Añadir artículos
                      </Link>
                    </div>
                  ) : (
                    <ul className="divide-y divide-gray-200">
                      {proveedor.articulos.map((articulo) => (
                        <li key={articulo.id} className="p-4">
                          <div
                            className="flex items-center justify-between cursor-pointer p-2 hover:bg-gray-50 rounded"
                            onClick={() => toggleArticuloExpanded(articulo.id)}
                          >
                            <div className="flex items-center">
                              <span className="font-medium">{articulo.nombre}</span>
                              {articulo.cantidad > 0 && (
                                <span className="ml-3 bg-indigo-100 text-indigo-800 px-2 py-1 rounded-full text-xs font-semibold">
                                  {articulo.cantidad_personalizada || articulo.cantidad} {articulo.unidad?.nombre || "unid."}
                                </span>
                              )}
                            </div>
                            <svg
                              className={`h-5 w-5 text-gray-500 transform transition-transform ${
                                expandedArticulos[articulo.id] ? "rotate-180" : ""
                              }`}
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                              xmlns="http://www.w3.org/2000/svg"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth="2"
                                d="M19 9l-7 7-7-7"
                              ></path>
                            </svg>
                          </div>

                          {expandedArticulos[articulo.id] && (
                            <div className="mt-3 pl-2">
                              <div className="mb-2">
                                <div className="text-sm text-gray-500 mb-2">
                                  {articulo.precio && (
                                    <p>
                                      Precio: {new Intl.NumberFormat("es-ES", {
                                        style: "currency",
                                        currency: "EUR",
                                      }).format(articulo.precio)}{" "}
                                      / {articulo.unidad?.nombre || "unidad"}
                                    </p>
                                  )}
                                  {articulo.descripcion && (
                                    <p className="mt-1">{articulo.descripcion}</p>
                                  )}
                                </div>
                                
                                <div className="flex flex-wrap gap-2 mb-2">
                                  {/* Botones del 0 al 6 */}
                                  {[0, 1, 2, 3, 4, 5, 6].map((cantidad) => (
                                    <button
                                      key={cantidad}
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleSetCantidad(proveedor.id, articulo.id, cantidad);
                                      }}
                                      className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-medium transition-colors 
                                        ${
                                          articulo.cantidad === cantidad
                                            ? "bg-indigo-600 text-white"
                                            : "bg-gray-100 text-gray-800 hover:bg-gray-200"
                                        }`}
                                    >
                                      {cantidad}
                                    </button>
                                  ))}
                                  
                                  {/* Botón para cantidades personalizadas (7+) */}
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      if (articulo.cantidad >= 7) {
                                        // Si ya está en modo personalizado, solo togglamos el expandido
                                        toggleCantidadExpanded(articulo.id);
                                      } else {
                                        // Si no está en modo personalizado, establecemos a 7 y expandimos
                                        handleSetCantidad(proveedor.id, articulo.id, 7);
                                        setExpandedCantidades(prev => ({
                                          ...prev,
                                          [articulo.id]: true
                                        }));
                                      }
                                    }}
                                    className={`px-3 h-10 rounded-full flex items-center justify-center text-sm font-medium transition-colors
                                      ${
                                        articulo.cantidad >= 7
                                          ? "bg-indigo-600 text-white"
                                          : "bg-gray-100 text-gray-800 hover:bg-gray-200"
                                      }`}
                                  >
                                    {articulo.cantidad === 7 ? 
                                      (articulo.cantidad_personalizada || "7+") : 
                                      "7+"}
                                  </button>
                                </div>
                                
                                {/* Selector para cantidades personalizadas (7-15) */}
                                {expandedCantidades[articulo.id] && (
                                  <div className="mt-3 bg-gray-50 p-3 rounded">
                                    <div className="flex flex-wrap gap-2">
                                      {[7, 8, 9, 10, 11, 12, 13, 14, 15].map((cantidad) => (
                                        <button
                                          key={cantidad}
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            handleSetCantidadPersonalizada(proveedor.id, articulo.id, cantidad);
                                          }}
                                          className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-medium transition-colors
                                            ${
                                              articulo.cantidad_personalizada === cantidad
                                                ? "bg-indigo-500 text-white"
                                                : "bg-white text-gray-800 hover:bg-gray-200"
                                            }`}
                                        >
                                          {cantidad}
                                        </button>
                                      ))}
                                      
                                      {/* Entrada para cantidades mayores a 15 */}
                                      <div className="flex items-center">
                                        <input 
                                          type="number"
                                          min="16"
                                          placeholder="16+"
                                          value={articulo.cantidad_personalizada && articulo.cantidad_personalizada > 15 
                                            ? articulo.cantidad_personalizada 
                                            : ""}
                                          onChange={(e) => {
                                            const valor = parseInt(e.target.value);
                                            if (!isNaN(valor) && valor >= 16) {
                                              handleSetCantidadPersonalizada(proveedor.id, articulo.id, valor);
                                            } else if (e.target.value === "") {
                                              // Si se borra el campo, establecemos a 7 (modo personalizado, pero sin valor específico)
                                              handleSetCantidadPersonalizada(proveedor.id, articulo.id, 7);
                                            }
                                          }}
                                          className="w-16 h-10 border border-gray-300 rounded text-center"
                                        />
                                      </div>
                                    </div>
                                  </div>
                                )}
                              </div>
                            </div>
                          )}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              ))}
            </div>
            
            <div className="mt-8 flex justify-end space-x-4">
              <Link
                href="/listas-compra"
                className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                Cancelar
              </Link>
              {limiteAlcanzado ? (
                <Link
                  href="/membresias"
                  className="px-4 py-2 bg-yellow-600 text-white rounded-md hover:bg-yellow-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-500"
                >
                  Actualizar Membresía
                </Link>
              ) : (
                <button
                  onClick={guardarLista}
                  disabled={enviando || limiteAlcanzado} // Aseguramos que el botón está deshabilitado si se llegó al límite
                  className={`px-4 py-2 ${limiteAlcanzado ? 'bg-gray-400' : 'bg-indigo-600'} text-white rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 ${
                    (enviando || limiteAlcanzado) ? "opacity-75 cursor-not-allowed" : ""
                  }`}
                >
                  {enviando ? "Guardando..." : limiteAlcanzado ? "Límite Alcanzado" : "Guardar Lista"}
                </button>
              )}
            </div>
          </>
        )}
      </div>
    </AppLayout>
  );
}