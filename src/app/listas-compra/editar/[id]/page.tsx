"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import AppLayout from "../../../components/AppLayout";
import { ListaCompra, Articulo, Proveedor } from "@/types";

interface ArticuloConCantidad extends Articulo {
  cantidad: number;
  cantidad_personalizada?: number;
  item_id?: string; // ID del item existente en la lista
}

interface ProveedorConArticulos extends Proveedor {
  articulos: ArticuloConCantidad[];
}

export default function EditarListaCompraPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;
  const [loading, setLoading] = useState(true);
  const [enviando, setEnviando] = useState(false);
  const [nombre, setNombre] = useState("");
  const [notas, setNotas] = useState("");
  const [proveedores, setProveedores] = useState<ProveedorConArticulos[]>([]);
  const [listaEstado, setListaEstado] = useState<ListaCompra['estado']>('borrador');
  const [error, setError] = useState<string | null>(null);
  const [expandedArticulos, setExpandedArticulos] = useState<Record<string, boolean>>({});
  const [expandedCantidades, setExpandedCantidades] = useState<Record<string, boolean>>({});
  const [itemsEliminados, setItemsEliminados] = useState<string[]>([]);

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

        // Cargar lista
        const { data: listaData, error: listaError } = await supabase
          .from("listas_compra")
          .select("*")
          .eq("id", id)
          .eq("usuario_id", sessionData.session.user.id)
          .single();

        if (listaError) throw listaError;

        // Establecer datos básicos de la lista
        // Intentar usar todas las variantes de nombre disponibles
        setNombre(listaData.nombre_lista || listaData.title || listaData.nombre || "");
        setNotas(listaData.notas || "");
        setListaEstado(listaData.estado);

        // Cargar items de la lista
        const { data: itemsData, error: itemsError } = await supabase
          .from("items_lista_compra")
          .select(`
            *,
            articulo:articulo_id(
              *,
              unidad:unidad_id(id, nombre, abreviatura),
              proveedor:proveedor_id(*)
            )
          `)
          .eq("lista_id", id);

        if (itemsError) throw itemsError;

        // Cargar todos los proveedores
        const { data: proveedoresData, error: proveedoresError } = await supabase
          .from("proveedores")
          .select("*")
          .eq("usuario_id", sessionData.session.user.id)
          .order("nombre");

        if (proveedoresError) throw proveedoresError;

        // Crear mapa de todos los proveedores con sus artículos
        const proveedoresMap = new Map<string, ProveedorConArticulos>();

        // Inicializar todos los proveedores
        for (const proveedor of proveedoresData) {
          proveedoresMap.set(proveedor.id, {
            ...proveedor,
            articulos: []
          });
        }

        // Cargar artículos para cada proveedor
        for (const proveedor of proveedoresData) {
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

          // Inicializar todos los artículos con cantidad 0
          const articulos = (articulosData || []).map(articulo => ({
            ...articulo,
            cantidad: 0,
            cantidad_personalizada: undefined
          }));

          proveedoresMap.get(proveedor.id)!.articulos = articulos;
        }

        // Actualizar cantidades con los items existentes en la lista
        for (const item of itemsData || []) {
          const articulo = item.articulo;
          if (articulo && articulo.proveedor_id) {
            const proveedor = proveedoresMap.get(articulo.proveedor_id);
            if (proveedor) {
              // Buscar el artículo en el proveedor
              const articuloIndex = proveedor.articulos.findIndex(a => a.id === articulo.id);
              if (articuloIndex >= 0) {
                // Artículo encontrado, actualizar su cantidad
                const cantidad = item.cantidad;
                proveedor.articulos[articuloIndex] = {
                  ...proveedor.articulos[articuloIndex],
                  cantidad: cantidad <= 6 ? cantidad : 7,
                  cantidad_personalizada: cantidad > 6 ? cantidad : undefined,
                  item_id: item.id
                };
              } else {
                // Artículo no existe en la lista actual (pudo haber sido eliminado)
                // Pero lo mantenemos porque está en la lista de compra
                const articuloConCantidad: ArticuloConCantidad = {
                  ...articulo,
                  cantidad: item.cantidad <= 6 ? item.cantidad : 7,
                  cantidad_personalizada: item.cantidad > 6 ? item.cantidad : undefined,
                  item_id: item.id
                };
                proveedor.articulos.push(articuloConCantidad);
              }
            }
          }
        }

        // Convertir el mapa a array
        setProveedores(Array.from(proveedoresMap.values()));
      } catch (err: any) {
        console.error("Error al cargar datos:", err.message);
        setError("No se pudieron cargar los datos. Por favor, intenta nuevamente.");
      } finally {
        setLoading(false);
      }
    };

    cargarDatos();
  }, [id, router]);

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

  const handleEliminarItem = (articuloId: string, itemId?: string) => {
    // Si existe un item_id (es un item existente), añadirlo a la lista de items a eliminar
    if (itemId) {
      setItemsEliminados(prev => [...prev, itemId]);
    }

    // Poner la cantidad a 0
    setProveedores(prevProveedores => 
      prevProveedores.map(proveedor => ({
        ...proveedor,
        articulos: proveedor.articulos.map(articulo => 
          articulo.id === articuloId
            ? { ...articulo, cantidad: 0, cantidad_personalizada: undefined, item_id: undefined }
            : articulo
        )
      }))
    );
  };

  const guardarLista = async () => {
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

      // 1. Actualizar la lista de compra - no actualizamos el nombre
      const { error: listaError } = await supabase
        .from("listas_compra")
        .update({
          notas,
          estado: listaEstado
        })
        .eq("id", id);

      if (listaError) throw listaError;

      // 2. Eliminar items marcados para eliminación
      if (itemsEliminados.length > 0) {
        const { error: deleteError } = await supabase
          .from("items_lista_compra")
          .delete()
          .in("id", itemsEliminados);

        if (deleteError) throw deleteError;
      }

      // 3. Actualizar o insertar items
      for (const proveedor of proveedores) {
        for (const articulo of proveedor.articulos) {
          if (articulo.cantidad > 0) {
            // Usar la cantidad personalizada si existe y es mayor a 6
            const cantidadFinal = articulo.cantidad === 7 && articulo.cantidad_personalizada 
              ? articulo.cantidad_personalizada 
              : articulo.cantidad;
              
            if (articulo.item_id) {
              // Actualizar item existente
              const { error: updateError } = await supabase
                .from("items_lista_compra")
                .update({
                  cantidad: cantidadFinal,
                  precio_unitario: articulo.precio || 0,
                  unidad: articulo.unidad?.nombre || ""
                })
                .eq("id", articulo.item_id);

              if (updateError) throw updateError;
            } else {
              // Insertar nuevo item
              const { error: insertError } = await supabase
                .from("items_lista_compra")
                .insert({
                  lista_id: id,
                  articulo_id: articulo.id,
                  cantidad: cantidadFinal,
                  precio_unitario: articulo.precio || 0,
                  unidad: articulo.unidad?.nombre || "",
                  completado: false
                });

              if (insertError) throw insertError;
            }
          } else if (articulo.item_id && !itemsEliminados.includes(articulo.item_id)) {
            // Item existente con cantidad 0, eliminarlo si no está ya en itemsEliminados
            setItemsEliminados(prev => [...prev, articulo.item_id!]);
            
            const { error: deleteError } = await supabase
              .from("items_lista_compra")
              .delete()
              .eq("id", articulo.item_id);

            if (deleteError) throw deleteError;
          }
        }
      }

      // Redirigir a la página de la lista
      router.push(`/listas-compra/${id}`);
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
          <h1 className="text-2xl font-bold">Editar Lista de Compra</h1>
        </div>

        {error && (
          <div className="mb-4 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
            {error}
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
              className="w-full p-2 border border-gray-300 rounded-md bg-gray-100"
              value={nombre}
              readOnly
              disabled
            />
            <p className="mt-1 text-xs text-gray-500">El nombre del pedido no se puede modificar</p>
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
          
          <div className="mb-4">
            <label htmlFor="estado" className="block text-sm font-medium text-gray-700 mb-1">
              Estado
            </label>
            <select
              id="estado"
              className="w-full p-2 border border-gray-300 rounded-md"
              value={listaEstado}
              onChange={(e) => setListaEstado(e.target.value as ListaCompra['estado'])}
            >
              <option value="borrador">Borrador</option>
              <option value="enviada">Enviada</option>
              <option value="completada">Completada</option>
              <option value="cancelada">Cancelada</option>
            </select>
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
        ) : (
          <>
            <div className="space-y-6">
              {proveedores.map((proveedor) => (
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
                                  
                                  {/* Botón para eliminar */}
                                  {articulo.cantidad > 0 && (
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleEliminarItem(articulo.id, articulo.item_id);
                                      }}
                                      className="px-3 h-10 rounded-full flex items-center justify-center text-sm font-medium transition-colors bg-red-100 text-red-800 hover:bg-red-200"
                                    >
                                      <svg 
                                        className="h-4 w-4"
                                        fill="none" 
                                        stroke="currentColor" 
                                        viewBox="0 0 24 24" 
                                        xmlns="http://www.w3.org/2000/svg"
                                      >
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
                                      </svg>
                                    </button>
                                  )}
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
                href={`/listas-compra/${id}`}
                className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                Cancelar
              </Link>
              <button
                onClick={guardarLista}
                disabled={enviando}
                className={`px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 ${
                  enviando ? "opacity-75 cursor-not-allowed" : ""
                }`}
              >
                {enviando ? "Guardando..." : "Guardar Cambios"}
              </button>
            </div>
          </>
        )}
      </div>
    </AppLayout>
  );
}