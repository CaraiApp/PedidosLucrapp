// src/app/admin/dashboard/membresias/editar/[id]/page.tsx
"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import Alert from "@/components/ui/Alert";
import Loading from "@/components/ui/Loading";
import { Mensaje, TipoMembresia } from "@/types";

export default function EditarMembresia() {
  const router = useRouter();
  const params = useParams();
  const id = typeof params.id === 'string' ? params.id : Array.isArray(params.id) ? params.id[0] : '';
  
  // Debug del ID recibido
  console.log("ID de membresía recibido:", params.id, "Tipo:", typeof params.id);

  const [loading, setLoading] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [mensaje, setMensaje] = useState<Mensaje | null>(null);
  const [membresia, setMembresia] = useState<TipoMembresia>({
    id: "",
    nombre: "",
    precio: 0,
    duracion_meses: 1,
    descripcion: "",
    limite_proveedores: null,
    limite_articulos: null,
    limite_listas: null,
    stripe_price_id: "",
    tiene_ai: false
    // Eliminado: es_destacado: false - No existe en la base de datos
  });

  // Cargar datos de la membresía
  useEffect(() => {
    const cargarMembresia = async () => {
      try {
        setLoading(true);
        
        if (!id) {
          throw new Error("ID de membresía no proporcionado");
        }

        const { data, error } = await supabase
          .from("membresia_tipos")
          .select("*")
          .eq("id", id)
          .single();

        if (error) throw error;
        if (!data) throw new Error("No se encontró la membresía");

        // Asegurarse de que todos los campos tienen valores válidos para React
        const membresiaFormateada: TipoMembresia = {
          ...data,
          nombre: data.nombre || "",
          precio: data.precio ?? 0,
          duracion_meses: data.duracion_meses ?? 1,
          descripcion: data.descripcion || "",
          limite_proveedores: data.limite_proveedores,
          limite_articulos: data.limite_articulos,
          limite_listas: data.limite_listas,
          stripe_price_id: data.stripe_price_id || "",
          tiene_ai: data.tiene_ai || false
          // Eliminado: es_destacado: data.es_destacado || false - No existe en la base de datos
        };

        console.log("Membresía cargada:", membresiaFormateada);
        setMembresia(membresiaFormateada);
      } catch (err) {
        console.error("Error al cargar la membresía:", err);
        setMensaje({
          texto: "No se pudo cargar la información de la membresía",
          tipo: "error"
        });
      } finally {
        setLoading(false);
      }
    };

    cargarMembresia();
  }, [id]);

  // Manejar cambios en los campos
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    
    // Manejar conversión de tipos
    if (type === "number") {
      // Para campos con límites, valor vacío significa null (ilimitado)
      if (['limite_proveedores', 'limite_articulos', 'limite_listas'].includes(name)) {
        setMembresia({ ...membresia, [name]: value === "" ? null : parseFloat(value) });
      } else {
        setMembresia({ ...membresia, [name]: value === "" ? 0 : parseFloat(value) });
      }
    } else if (type === "checkbox") {
      const target = e.target as HTMLInputElement;
      setMembresia({ ...membresia, [name]: target.checked });
    } else {
      setMembresia({ ...membresia, [name]: value });
    }
  };

  // Guardar cambios
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMensaje(null);
    setGuardando(true);
    
    // Debug
    console.log("Datos de la membresía a guardar:", membresia);

    try {
      // Validar campos requeridos
      const errores = [];
      if (!membresia.nombre) {
        errores.push("Nombre del plan");
      }
      if (membresia.precio < 0) {
        errores.push("Precio (debe ser 0 o mayor)");
      }
      if (membresia.duracion_meses <= 0) {
        errores.push("Duración (debe ser mayor a 0)");
      }
      
      if (errores.length > 0) {
        setMensaje({
          texto: `Por favor completa correctamente los siguientes campos: ${errores.join(", ")}`,
          tipo: "error"
        });
        setGuardando(false);
        return;
      }

      // Actualizar en base de datos
      console.log("Intentando actualizar membresía con ID:", id);
      
      // Verificar que tenemos un cliente Supabase válido
      if (!supabase) {
        console.error("Cliente Supabase no inicializado correctamente");
        throw new Error("Error de configuración: Cliente Supabase no disponible");
      }
      
      // Verificar las credenciales de Supabase
      console.log("URL de Supabase:", process.env.NEXT_PUBLIC_SUPABASE_URL ? "Configurada" : "NO configurada");
      console.log("Clave Anon de Supabase:", process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? "Configurada" : "NO configurada");
      
      // Crear objeto con datos a actualizar
      // Eliminamos es_destacado ya que no existe en la base de datos
      const actualizarDatos = {
        nombre: membresia.nombre,
        precio: membresia.precio,
        duracion_meses: membresia.duracion_meses,
        descripcion: membresia.descripcion || null,
        limite_proveedores: membresia.limite_proveedores,
        limite_articulos: membresia.limite_articulos,
        limite_listas: membresia.limite_listas,
        stripe_price_id: membresia.stripe_price_id || null,
        tiene_ai: membresia.tiene_ai || false
        // Eliminado: es_destacado: !!membresia.es_destacado
      };
      
      console.log("Datos a enviar:", JSON.stringify(actualizarDatos, null, 2));
      console.log("ID a actualizar:", id);
      
      // Verificar primero si la membresía existe
      const checkResult = await supabase
        .from("membresia_tipos")
        .select("id")
        .eq("id", id)
        .maybeSingle();
        
      if (checkResult.error) {
        console.error("Error al verificar existencia de membresía:", checkResult.error);
        throw new Error(`No se pudo verificar si la membresía existe: ${checkResult.error.message}`);
      }
      
      if (!checkResult.data) {
        console.error("La membresía no existe en la base de datos");
        throw new Error(`La membresía con ID ${id} no existe en la base de datos`);
      }
      
      // Intentar actualizar mediante un enfoque alternativo 
      try {
        const { error } = await supabase
          .from("membresia_tipos")
          .update(actualizarDatos)
          .eq("id", id.toString());
            
        if (error) {
          throw error;
        }
      } catch (updateError) {
        console.error("Error durante la actualización:", updateError);
        const errorMessage = updateError instanceof Error 
          ? updateError.message 
          : typeof updateError === 'object' && updateError !== null
            ? JSON.stringify(updateError)
            : 'Error desconocido';
        throw new Error(`Error al actualizar: ${errorMessage}`);
      }

      // El error ya fue manejado en el bloque try/catch anterior
      
      // Verificar que se realizó la actualización
      try {
        const { data: verificarData, error: verificarError } = await supabase
          .from("membresia_tipos")
          .select("*")
          .eq("id", id)
          .single();
          
        if (verificarError) {
          console.warn("No se pudo verificar la actualización:", verificarError);
        } else {
          console.log("Membresía actualizada correctamente:", verificarData);
        }
      } catch (err) {
        console.warn("Error al verificar actualización:", err);
      }

      // Mostrar mensaje de éxito
      setMensaje({
        texto: "Membresía actualizada con éxito",
        tipo: "success"
      });

      // Redirigir después de 1.5 segundos
      setTimeout(() => {
        router.push("/admin/dashboard/membresias");
      }, 1500);
    } catch (err: any) {
      console.error("Error al actualizar la membresía:", err);
      // Intentar obtener detalles más específicos del error
      let mensajeError = "Error al guardar los cambios. Intenta nuevamente.";
      
      if (err.message) {
        mensajeError += ` Error: ${err.message}`;
      }
      
      if (err.details || err.hint) {
        mensajeError += ` Detalles: ${err.details || err.hint}`;
      }
      
      setMensaje({
        texto: mensajeError,
        tipo: "error"
      });
    } finally {
      setGuardando(false);
    }
  };

  if (loading) {
    return <Loading text="Cargando información de la membresía..." />;
  }

  return (
    <div>
      <div className="mb-6">
        <Button
          variant="ghost"
          onClick={() => router.push("/admin/dashboard/membresias")}
          className="flex items-center gap-2"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M9.707 14.707a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 1.414L7.414 9H15a1 1 0 110 2H7.414l2.293 2.293a1 1 0 010 1.414z" clipRule="evenodd" />
          </svg>
          Volver a la lista
        </Button>
        <h1 className="text-2xl font-semibold text-gray-900 mt-2">
          Editar Plan de Membresía
        </h1>
      </div>

      <Alert mensaje={mensaje} onClose={() => setMensaje(null)} />

      <Card>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <Input
                id="nombre"
                name="nombre"
                label="Nombre del plan"
                value={membresia.nombre}
                onChange={handleChange}
                required
                fullWidth
              />
            </div>

            <div>
              <Input
                id="precio"
                name="precio"
                type="number"
                label="Precio (€)"
                value={membresia.precio === undefined ? "" : membresia.precio.toString()}
                onChange={handleChange}
                required
                step="0.01"
                min="0"
                fullWidth
              />
            </div>

            <div>
              <Input
                id="duracion_meses"
                name="duracion_meses"
                type="number"
                label="Duración (meses)"
                value={membresia.duracion_meses === undefined ? "" : membresia.duracion_meses.toString()}
                onChange={handleChange}
                required
                min="1"
                max="36"
                fullWidth
              />
            </div>

            <div>
              <Input
                id="stripe_price_id"
                name="stripe_price_id"
                label="ID de precio en Stripe (opcional)"
                value={membresia.stripe_price_id === undefined ? "" : membresia.stripe_price_id || ""}
                onChange={handleChange}
                fullWidth
                helpText="Déjalo en blanco si no usas Stripe para pagos"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Descripción
            </label>
            <textarea
              name="descripcion"
              value={membresia.descripcion === undefined ? "" : membresia.descripcion || ""}
              onChange={handleChange}
              rows={3}
              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <Input
                id="limite_proveedores"
                name="limite_proveedores"
                type="number"
                label="Límite de proveedores (0 = ilimitado)"
                value={membresia.limite_proveedores === null ? "" : membresia.limite_proveedores.toString()}
                onChange={handleChange}
                min="0"
                fullWidth
              />
            </div>

            <div>
              <Input
                id="limite_articulos"
                name="limite_articulos"
                type="number"
                label="Límite de artículos (0 = ilimitado)"
                value={membresia.limite_articulos === null ? "" : membresia.limite_articulos.toString()}
                onChange={handleChange}
                min="0"
                fullWidth
              />
            </div>

            <div>
              <Input
                id="limite_listas"
                name="limite_listas"
                type="number"
                label="Límite de listas (0 = ilimitado)"
                value={membresia.limite_listas === null ? "" : membresia.limite_listas.toString()}
                onChange={handleChange}
                min="0"
                fullWidth
              />
            </div>
          </div>

          <div className="mt-4 mb-6">
            <div className="flex items-center">
              <input
                id="tiene_ai"
                name="tiene_ai"
                type="checkbox"
                checked={membresia.tiene_ai}
                onChange={(e) => setMembresia({...membresia, tiene_ai: e.target.checked})}
                className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
              />
              <label htmlFor="tiene_ai" className="ml-2 block text-sm text-gray-900">
                Incluye funciones de IA (escaneo de documentos, creación automática de productos y proveedores)
              </label>
            </div>
          </div>

          {/* Checkbox de es_destacado eliminado porque no existe en la base de datos */}

          <div className="flex justify-end gap-3">
            <Button
              variant="outline"
              type="button"
              onClick={() => router.push("/admin/dashboard/membresias")}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              isLoading={guardando}
              disabled={guardando}
            >
              Guardar cambios
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}