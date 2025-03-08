"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import AppLayout from "../../components/AppLayout";

interface ItemListaDetalle {
  id: string;
  articulo_id: string;
  cantidad: number;
  precio_unitario: number;
  unidad: string;
  completado: boolean;
  articulo: {
    id: string;
    nombre: string;
    proveedor_id: string;
    proveedor: {
      id: string;
      nombre: string;
      telefono?: string;
      email?: string;
    };
  };
}

interface ListaDetalles {
  id: string;
  nombre: string;
  nombre_lista?: string;
  title?: string;
  fecha_creacion: string;
  estado: 'borrador' | 'enviada' | 'completada' | 'cancelada';
  notas?: string;
  total?: number;
  items: ItemListaDetalle[];
}

interface ItemsPorProveedor {
  id: string;
  nombre: string;
  telefono?: string;
  email?: string;
  articulos: ItemListaDetalle[];
  total: number;
}

export default function DetalleListaCompraPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;
  const [loading, setLoading] = useState(true);
  const [enviando, setEnviando] = useState(false);
  const [lista, setLista] = useState<ListaDetalles | null>(null);
  const [itemsPorProveedor, setItemsPorProveedor] = useState<ItemsPorProveedor[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [mensaje, setMensaje] = useState<string | null>(null);
  const [userData, setUserData] = useState<{ nombre?: string, empresa?: string } | null>(null);

  useEffect(() => {
    const cargarLista = async () => {
      try {
        setLoading(true);

        // Verificar sesión
        const { data: sessionData } = await supabase.auth.getSession();
        if (!sessionData.session) {
          router.push("/login");
          return;
        }

        // Obtener datos del usuario actual
        const { data: userData, error: userError } = await supabase
          .from("usuarios")
          .select("nombre, empresa")
          .eq("id", sessionData.session.user.id)
          .single();

        if (!userError) {
          setUserData(userData);
        }

        // Cargar lista con items
        const { data, error } = await supabase
          .from("listas_compra")
          .select(`
            *,
            items:items_lista_compra(
              *,
              articulo:articulo_id(
                id, 
                nombre,
                proveedor_id,
                proveedor:proveedor_id(
                  id, 
                  nombre,
                  telefono,
                  email
                )
              )
            )
          `)
          .eq("id", id)
          .eq("usuario_id", sessionData.session.user.id)
          .single();

        if (error) throw error;

        setLista(data as ListaDetalles);

        // Organizar items por proveedor
        const proveedoresMap = new Map<string, ItemsPorProveedor>();
        const sinProveedor: ItemsPorProveedor = {
          id: 'sin_proveedor',
          nombre: 'Sin proveedor',
          articulos: [],
          total: 0
        };

        // Agrupar por proveedor
        data.items.forEach((item: ItemListaDetalle) => {
          const proveedor = item.articulo?.proveedor;
          
          if (proveedor) {
            if (!proveedoresMap.has(proveedor.id)) {
              proveedoresMap.set(proveedor.id, {
                id: proveedor.id,
                nombre: proveedor.nombre,
                telefono: proveedor.telefono,
                email: proveedor.email,
                articulos: [],
                total: 0
              });
            }
            
            const subtotal = (item.precio_unitario || 0) * item.cantidad;
            proveedoresMap.get(proveedor.id)!.articulos.push(item);
            proveedoresMap.get(proveedor.id)!.total += subtotal;
          } else {
            // Artículos sin proveedor
            const subtotal = (item.precio_unitario || 0) * item.cantidad;
            sinProveedor.articulos.push(item);
            sinProveedor.total += subtotal;
          }
        });

        // Convertir el mapa a array y añadir "Sin proveedor" al final si tiene artículos
        const proveedoresArray = Array.from(proveedoresMap.values());
        if (sinProveedor.articulos.length > 0) {
          proveedoresArray.push(sinProveedor);
        }

        setItemsPorProveedor(proveedoresArray);
      } catch (err: any) {
        console.error("Error al cargar la lista:", err.message);
        setError("No se pudo cargar la lista. Por favor, intenta nuevamente.");
      } finally {
        setLoading(false);
      }
    };

    cargarLista();
  }, [id, router]);

  const handleCambiarEstado = async (nuevoEstado: ListaDetalles['estado']) => {
    try {
      setEnviando(true);
      setError(null);

      // Actualizar estado de la lista
      const { error } = await supabase
        .from("listas_compra")
        .update({ 
          estado: nuevoEstado,
          fecha_envio: nuevoEstado === 'enviada' ? new Date().toISOString() : null
        })
        .eq("id", id);

      if (error) throw error;

      // Actualizar la lista en el estado
      if (lista) {
        setLista({
          ...lista,
          estado: nuevoEstado
        });
      }

      setMensaje(`Lista ${nuevoEstado === 'completada' ? 'marcada como completada' : 'actualizada'} correctamente`);

      // Limpiar el mensaje después de 3 segundos
      setTimeout(() => {
        setMensaje(null);
      }, 3000);
    } catch (err: any) {
      console.error("Error al actualizar la lista:", err.message);
      setError("No se pudo actualizar la lista. Por favor, intenta nuevamente.");
    } finally {
      setEnviando(false);
    }
  };

  const handleMarcarItem = async (itemId: string, completado: boolean) => {
    try {
      // Actualizar el item en la base de datos
      const { error } = await supabase
        .from("items_lista_compra")
        .update({ completado })
        .eq("id", itemId);

      if (error) throw error;

      // Actualizar el estado local
      if (lista) {
        const nuevosItems = lista.items.map(item => 
          item.id === itemId ? { ...item, completado } : item
        );
        
        setLista({
          ...lista,
          items: nuevosItems
        });

        // Actualizar los items por proveedor
        const nuevosItemsPorProveedor = itemsPorProveedor.map(proveedor => ({
          ...proveedor,
          articulos: proveedor.articulos.map(item => 
            item.id === itemId ? { ...item, completado } : item
          )
        }));

        setItemsPorProveedor(nuevosItemsPorProveedor);
      }
    } catch (err: any) {
      console.error("Error al actualizar el item:", err.message);
      setError("No se pudo actualizar el item. Por favor, intenta nuevamente.");
    }
  };

  // Generar mensajes para WhatsApp y Email
  const generarMensajeWhatsApp = (proveedor: ItemsPorProveedor) => {
    if (!proveedor.telefono) return null;
    
    const nombreRemitente = userData?.nombre || userData?.empresa || "Cliente";
    let mensaje = `Pedido de ${nombreRemitente} para ${proveedor.nombre}:%0A%0A`;
    
    proveedor.articulos.forEach(item => {
      mensaje += `${item.articulo.nombre}: ${item.cantidad} ${item.unidad}%0A`;
    });
    
    mensaje += `%0ATotal aproximado: ${new Intl.NumberFormat("es-ES", {
      style: "currency",
      currency: "EUR",
    }).format(proveedor.total)}`;
    
    return `https://wa.me/${proveedor.telefono.replace(/\D/g, '')}?text=${mensaje}`;
  };

  const generarMensajeEmail = (proveedor: ItemsPorProveedor) => {
    if (!proveedor.email) return null;
    
    const nombreRemitente = userData?.nombre || userData?.empresa || "Cliente";
    const asunto = `Pedido de ${nombreRemitente}`;
    
    let mensaje = `Pedido para ${proveedor.nombre}:\n\n`;
    
    proveedor.articulos.forEach(item => {
      mensaje += `${item.articulo.nombre}: ${item.cantidad} ${item.unidad}\n`;
    });
    
    mensaje += `\nTotal aproximado: ${new Intl.NumberFormat("es-ES", {
      style: "currency",
      currency: "EUR",
    }).format(proveedor.total)}`;
    
    return `mailto:${proveedor.email}?subject=${encodeURIComponent(asunto)}&body=${encodeURIComponent(mensaje)}`;
  };

  const formatearFecha = (fecha: string) => {
    return new Date(fecha).toLocaleDateString("es-ES", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const formatearPrecio = (precio: number) => {
    return new Intl.NumberFormat("es-ES", {
      style: "currency",
      currency: "EUR",
    }).format(precio);
  };

  if (loading) {
    return (
      <AppLayout>
        <div className="py-8 flex justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
        </div>
      </AppLayout>
    );
  }

  if (!lista) {
    return (
      <AppLayout>
        <div className="py-8">
          <div className="bg-white shadow rounded-lg p-6 text-center">
            <p className="text-gray-500 mb-4">
              No se encontró la lista de compra.
            </p>
            <Link
              href="/listas-compra"
              className="text-indigo-600 hover:text-indigo-800 font-medium"
            >
              Volver a las listas
            </Link>
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="py-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6">
          <h1 className="text-2xl font-bold">{lista.title || lista.nombre_lista || lista.nombre || "Lista de compra"}</h1>

          <div className="mt-4 sm:mt-0 flex space-x-2">
            <Link
              href="/listas-compra"
              className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              Volver
            </Link>
            <Link
              href={`/listas-compra/editar/${id}`}
              className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              Editar
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

        <div className="bg-white shadow rounded-lg p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <h3 className="text-sm font-medium text-gray-500">Fecha de creación</h3>
              <p className="mt-1 text-lg text-gray-900">{formatearFecha(lista.fecha_creacion)}</p>
            </div>
            <div>
              <h3 className="text-sm font-medium text-gray-500">Estado</h3>
              <p className="mt-1">
                <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full 
                  ${lista.estado === 'borrador' ? 'bg-yellow-100 text-yellow-800' : ''}
                  ${lista.estado === 'enviada' ? 'bg-blue-100 text-blue-800' : ''}
                  ${lista.estado === 'completada' ? 'bg-green-100 text-green-800' : ''}
                  ${lista.estado === 'cancelada' ? 'bg-red-100 text-red-800' : ''}
                `}>
                  {lista.estado === 'borrador' ? 'Borrador' : ''}
                  {lista.estado === 'enviada' ? 'Enviada' : ''}
                  {lista.estado === 'completada' ? 'Completada' : ''}
                  {lista.estado === 'cancelada' ? 'Cancelada' : ''}
                </span>
              </p>
            </div>
            <div>
              <h3 className="text-sm font-medium text-gray-500">Total</h3>
              <p className="mt-1 text-lg text-gray-900">
                {formatearPrecio(itemsPorProveedor.reduce((total, proveedor) => total + proveedor.total, 0))}
              </p>
            </div>
          </div>

          {lista.notas && (
            <div className="mt-6">
              <h3 className="text-sm font-medium text-gray-500">Notas</h3>
              <p className="mt-1 text-gray-900 whitespace-pre-line">{lista.notas}</p>
            </div>
          )}

          <div className="mt-6 flex flex-wrap gap-2">
            {lista.estado === 'borrador' && (
              <button
                onClick={() => handleCambiarEstado('enviada')}
                disabled={enviando}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Marcar como enviada
              </button>
            )}
            
            {lista.estado !== 'completada' && (
              <button
                onClick={() => handleCambiarEstado('completada')}
                disabled={enviando}
                className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
              >
                Marcar como completada
              </button>
            )}
            
            {lista.estado !== 'cancelada' && lista.estado !== 'completada' && (
              <button
                onClick={() => handleCambiarEstado('cancelada')}
                disabled={enviando}
                className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
              >
                Cancelar lista
              </button>
            )}
          </div>
        </div>

        <div className="space-y-8">
          {itemsPorProveedor.map((proveedor) => (
            <div key={proveedor.id} className="bg-white shadow rounded-lg overflow-hidden">
              <div className="bg-gray-50 px-6 py-4 border-b flex justify-between items-center">
                <h2 className="text-xl font-semibold text-gray-800">{proveedor.nombre}</h2>
                
                <div className="flex space-x-2">
                  {proveedor.telefono && (
                    <a
                      href={generarMensajeWhatsApp(proveedor) || "#"}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-3 py-1 bg-green-500 text-white rounded-md hover:bg-green-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                    >
                      WhatsApp
                    </a>
                  )}
                  
                  {proveedor.email && (
                    <a
                      href={generarMensajeEmail(proveedor) || "#"}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-3 py-1 bg-blue-500 text-white rounded-md hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                    >
                      Email
                    </a>
                  )}
                </div>
              </div>
              
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Artículo
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Cantidad
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Precio unitario
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Total
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Estado
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {proveedor.articulos.map((item) => {
                      const subtotal = (item.precio_unitario || 0) * item.cantidad;
                      
                      return (
                        <tr key={item.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                            {item.articulo.nombre}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {item.cantidad} {item.unidad}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {formatearPrecio(item.precio_unitario || 0)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {formatearPrecio(subtotal)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            <button
                              onClick={() => handleMarcarItem(item.id, !item.completado)}
                              className={`flex items-center px-2 py-1 rounded ${
                                item.completado
                                  ? "bg-green-100 text-green-800 hover:bg-green-200"
                                  : "bg-gray-100 text-gray-800 hover:bg-gray-200"
                              }`}
                            >
                              <svg
                                className={`h-4 w-4 mr-1 ${
                                  item.completado ? "text-green-600" : "text-gray-400"
                                }`}
                                fill="none"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth="2"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                              >
                                <path d="M5 13l4 4L19 7"></path>
                              </svg>
                              {item.completado ? "Comprado" : "Pendiente"}
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot>
                    <tr className="bg-gray-50">
                      <td colSpan={3} className="px-6 py-4 text-right text-sm font-medium text-gray-500">
                        Total {proveedor.nombre}:
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-900">
                        {formatearPrecio(proveedor.total)}
                      </td>
                      <td></td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          ))}
        </div>
      </div>
    </AppLayout>
  );
}