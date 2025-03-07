"use client";

import { useState, useEffect } from "react";
import AppLayout from "../../components/AppLayout";
import { useAuth } from "@/hooks/useAuth";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Alert from "@/components/ui/Alert";
import Loading from "@/components/ui/Loading";
import { Mensaje, DatosFacturacion } from "@/types";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

export default function FacturacionPage() {
  const { user, isLoading, updateProfile } = useAuth();
  const [saving, setSaving] = useState(false);
  const [mensaje, setMensaje] = useState<Mensaje | null>(null);
  const [facturaData, setFacturaData] = useState({
    razon_social: "",
    cif: "",
    direccion_fiscal: "",
    codigo_postal: "",
    ciudad: "",
    provincia: "",
    pais: "España",
    // Añadimos campos para compatibilidad con tabla datos_facturacion
    nombre_empresa: "",
    direccion: "",
    email_facturacion: "",
    telefono: "",
  });

  // Actualizar datos de facturación cuando se carga el usuario
  useEffect(() => {
    if (user) {
      const loadFacturacionData = async () => {
        try {
          // Obtener datos de facturación desde la tabla datos_facturacion
          const { data: facturacionData, error } = await supabase
            .from('datos_facturacion')
            .select('*')
            .eq('usuario_id', user.id)
            .maybeSingle();
            
          if (error) {
            console.error('Error al cargar datos de facturación:', error);
          }
          
          console.log("Datos de facturación obtenidos:", facturacionData);
          
          // Combinar datos del usuario con datos de facturación
          // Priorizar los datos de la tabla datos_facturacion
          console.log("Datos de facturación completos:", {
            facturacionData,
            "provincia": facturacionData?.provincia, // Mostrar específicamente el campo provincia
          });
          
          setFacturaData({
            // Si tenemos datos en la tabla datos_facturacion, los usamos
            razon_social: facturacionData?.nombre_empresa || user.empresa || user.razon_social || "",
            direccion_fiscal: facturacionData?.direccion || user.direccion_fiscal || "",
            codigo_postal: facturacionData?.codigo_postal || user.codigo_postal || "",
            ciudad: facturacionData?.ciudad || user.ciudad || "",
            provincia: facturacionData?.provincia || user.provincia || "",
            pais: facturacionData?.pais || user.pais || "España",
            cif: facturacionData?.cif || "",
            
            // Campos adicionales
            nombre_empresa: facturacionData?.nombre_empresa || user.empresa || user.razon_social || "",
            direccion: facturacionData?.direccion || user.direccion_fiscal || "",
            email_facturacion: facturacionData?.email_facturacion || user.email || "",
            telefono: facturacionData?.telefono || user.telefono || "",
          });
        } catch (err) {
          console.error('Error al cargar datos de facturación:', err);
        }
      };
      
      loadFacturacionData();
    }
  }, [user]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    console.log(`Campo ${name} cambiado a: ${value}`);
    setFacturaData((prev) => {
      const updated = { ...prev, [name]: value };
      console.log(`Nuevo estado del formulario:`, updated);
      return updated;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMensaje(null);

    // Crear un log detallado para depuración
    const logError = (etapa: string, error: any) => {
      console.error(`[ERROR - ${etapa}]`, error);
      console.error(`[ERROR DETAILS - ${etapa}]`, {
        mensaje: error?.message || 'Sin mensaje',
        detalles: error?.details || 'Sin detalles',
        hint: error?.hint || 'Sin hint',
        código: error?.code || 'Sin código'
      });
    };

    const logInfo = (etapa: string, data: any) => {
      console.log(`[INFO - ${etapa}]`, data);
    };

    try {
      logInfo('INICIO', "Iniciando proceso de guardar datos de facturación");
      logInfo('DATOS', facturaData);
      
      // Actualizar campo empresa en la tabla usuarios
      // Comprobar que tenemos un usuario autenticado
      if (!user || !user.id) {
        logError('AUTENTICACIÓN', new Error("Usuario no autenticado"));
        throw new Error("Usuario no autenticado");
      }
      
      logInfo('USUARIO', { id: user.id, email: user.email });
      
      try {
        // Actualizamos los campos en la tabla usuarios
        const usuariosUpdate = {
          empresa: facturaData.razon_social, // Guardamos la razón social en el campo empresa
          telefono: facturaData.telefono, // Actualizamos también el teléfono
        };
        
        // Si no tenemos campos para actualizar, omitir esta operación
        if (Object.keys(usuariosUpdate).length > 0) {
          logInfo('ACTUALIZAR_USUARIO', usuariosUpdate);
          
          const { error: usuariosError } = await supabase
            .from('usuarios')
            .update(usuariosUpdate)
            .eq('id', user.id);
            
          if (usuariosError) {
            logError('ACTUALIZAR_USUARIO', usuariosError);
            throw new Error("Error al actualizar datos de usuario");
          }
          
          logInfo('ACTUALIZAR_USUARIO_ÉXITO', "Datos de usuario actualizados correctamente");
        } else {
          logInfo('ACTUALIZAR_USUARIO_SKIP', "No hay campos para actualizar en la tabla usuarios");
        }
      } catch (updateUserError) {
        logError('ACTUALIZAR_USUARIO_EXCEPCIÓN', updateUserError);
        // No lanzamos el error, continuamos para intentar guardar en la tabla de facturación
      }
      
      // Ahora que la tabla existe, podemos continuar directamente
      logInfo('INICIO_FACTURACION', "Iniciando operaciones en tabla datos_facturacion");
      
      try {
        // Verificamos que el usuario exista y está autenticado
        if (!user || !user.id) {
          logError('VERIFICACION_USUARIO', new Error('Usuario no autenticado'));
          throw new Error('Usuario no autenticado');
        }
        
        // Creamos o actualizamos un objeto en la tabla datos_facturacion
        try {
          // Preparamos los datos a guardar
          const facturacionData = {
            usuario_id: user?.id,
            nombre_empresa: facturaData.razon_social,
            cif: facturaData.cif,
            direccion: facturaData.direccion_fiscal,
            codigo_postal: facturaData.codigo_postal,
            ciudad: facturaData.ciudad,
            provincia: facturaData.provincia,
            pais: facturaData.pais,
            telefono: facturaData.telefono,
            email_facturacion: user?.email
          };
          
          // Log detallado para verificar los datos
          logInfo('DATOS_FACTURACION', facturacionData);
          logInfo('CAMPO_PROVINCIA', { 
            valor: facturaData.provincia,
            tipo: typeof facturaData.provincia,
            longitud: facturaData.provincia?.length || 0
          });
          
          // Verificar la tabla y sus columnas - usando información de schema
          logInfo('VERIFICAR_TABLA', "Intentando realizar una consulta directa para verificar la tabla");
          try {
            // Intento directo para verificar que la tabla existe
            const { data: testData, error: testError } = await supabase
              .from('datos_facturacion')
              .select('count(*)')
              .limit(1);
              
            if (testError) {
              logError('VERIFICAR_TABLA', testError);
            } else {
              logInfo('TABLA_EXISTE', 'La tabla datos_facturacion existe y es accesible');
            }
            
            // Verificar columnas mediante información del esquema
            const { data: columnInfo, error: columnError } = await supabase
              .from('information_schema.columns')
              .select('column_name')
              .eq('table_name', 'datos_facturacion')
              .eq('table_schema', 'public');
              
            if (columnError) {
              logError('VERIFICAR_COLUMNAS', columnError);
            } else {
              logInfo('COLUMNAS_ENCONTRADAS', columnInfo || 'No se encontraron columnas');
              
              // Verificar explícitamente la columna provincia
              const provinciColumn = columnInfo?.find(col => col.column_name === 'provincia');
              logInfo('COLUMNA_PROVINCIA', provinciColumn 
                ? 'La columna provincia existe en la tabla' 
                : 'La columna provincia NO existe en la tabla');
            }
          } catch (schemaError) {
            logError('ERROR_SCHEMA', schemaError);
          }
          
          // Intentamos primero buscar un registro existente
          logInfo('BUSCAR_REGISTRO', { usuario_id: user.id });
          const { data: existingData, error: checkError } = await supabase
            .from('datos_facturacion')
            .select('*')
            .eq('usuario_id', user.id)
            .maybeSingle();
            
          if (checkError) {
            logError('BUSCAR_REGISTRO', checkError);
            // Si es un error de que la tabla no existe, informamos claramente
            if (checkError.message && checkError.message.includes('does not exist')) {
              setMensaje({
                texto: "La tabla 'datos_facturacion' no existe en la base de datos. Contacta al administrador.",
                tipo: "error"
              });
              return;
            }
          } else {
            logInfo('REGISTRO_ENCONTRADO', existingData || 'No se encontró registro previo');
          }
            
          if (existingData && existingData.id) {
            // Si existe, actualizamos
            logInfo('ACTUALIZAR_REGISTRO', { id: existingData.id });
            try {
              const { data, error } = await supabase
                .from('datos_facturacion')
                .update({
                  ...facturacionData,
                  // Asegurarnos de que el campo provincia se incluye explícitamente
                  provincia: facturaData.provincia
                })
                .eq('id', existingData.id)
                .select();
                
              if (error) {
                logError('ACTUALIZAR_REGISTRO', error);
                throw error;
              }
              
              logInfo('ACTUALIZAR_REGISTRO_ÉXITO', data || 'Actualizado correctamente');
            } catch (updateError) {
              logError('ACTUALIZAR_REGISTRO_EXCEPCION', updateError);
              throw new Error("No se pudo actualizar el registro de facturación");
            }
          } else {
            // Si no existe, lo insertamos
            logInfo('CREAR_REGISTRO', 'Intentando crear nuevo registro');
            try {
              const { data, error } = await supabase
                .from('datos_facturacion')
                .insert([{
                  ...facturacionData,
                  // Asegurarnos de que el campo provincia se incluye explícitamente
                  provincia: facturaData.provincia
                }])
                .select();
                
              if (error) {
                logError('CREAR_REGISTRO', error);
                throw error;
              }
              
              logInfo('CREAR_REGISTRO_ÉXITO', data || 'Creado correctamente');
            } catch (insertError) {
              logError('CREAR_REGISTRO_EXCEPCION', insertError);
              throw new Error("No se pudo crear el registro de facturación");
            }
          }
          
          // Recargamos los datos para mostrar la información actualizada
          try {
            logInfo('RECARGAR_DATOS', "Intentando recargar datos actualizados");
            const { data: refreshData, error: refreshError } = await supabase
              .from('datos_facturacion')
              .select('*')
              .eq('usuario_id', user.id)
              .maybeSingle();
              
            if (refreshError) {
              logError('RECARGAR_DATOS', refreshError);
            } else {
              logInfo('DATOS_RECARGADOS', refreshData || 'Sin datos');
              
              // Actualizar el formulario con los datos más recientes
              if (refreshData) {
                logInfo('DATOS_REFRESCADOS', refreshData);
                
                // Log específico para verificar la columna provincia
                const allPropertiesLog = Object.keys(refreshData);
                logInfo('TODAS_PROPIEDADES', allPropertiesLog);
                
                // Verificar el valor de provincia
                logInfo('PROVINCIA_RECARGADA', { 
                  valor: refreshData.provincia, 
                  tipo: typeof refreshData.provincia,
                  existe: refreshData.hasOwnProperty('provincia'),
                  resultado_json: JSON.stringify(refreshData)
                });
                
                // Usar los datos recargados, asegurando que los datos están bien definidos
                setFacturaData(prev => {
                  // Verificar cada campo y usar el valor recargado solo si existe
                  const updated = {
                    ...prev,
                    razon_social: refreshData.nombre_empresa || prev.razon_social,
                    cif: refreshData.cif || prev.cif,
                    direccion_fiscal: refreshData.direccion || prev.direccion_fiscal,
                    codigo_postal: refreshData.codigo_postal || prev.codigo_postal,
                    ciudad: refreshData.ciudad || prev.ciudad,
                    // Especial atención a esta línea para evitar que se pierda
                    provincia: refreshData.provincia !== undefined ? refreshData.provincia : prev.provincia,
                    pais: refreshData.pais || prev.pais,
                    telefono: refreshData.telefono || prev.telefono
                  };
                  
                  logInfo('ESTADO_ACTUALIZADO', updated);
                  logInfo('PROVINCIA_FINAL', {
                    original: prev.provincia,
                    recargada: refreshData.provincia,
                    final: updated.provincia
                  });
                  
                  return updated;
                });
              }
            }
          } catch (refreshErr) {
            logError('RECARGAR_DATOS_EXCEPCION', refreshErr);
          }
        } catch (facturacionError: any) {
          logError('ERROR_FACTURACION', facturacionError);
          
          if (facturacionError.message && facturacionError.message.includes('does not exist')) {
            setMensaje({
              texto: "La tabla datos_facturacion no existe. Por favor, crea esta tabla en la base de datos.",
              tipo: "error"
            });
            
            logInfo('INSTRUCCIONES_CREAR_TABLA', `
              Accede a tu proyecto en Supabase y crea la tabla 'datos_facturacion' con los siguientes campos:
              - id: uuid (PRIMARY KEY)
              - usuario_id: uuid (FOREIGN KEY a usuarios.id)
              - nombre_empresa: text
              - cif: text
              - direccion: text
              - codigo_postal: text
              - ciudad: text
              - provincia: text (¡asegúrate de incluir esta columna!)
              - pais: text
              - telefono: text
              - email_facturacion: text
            `);
            
            // No lanzamos el error, ya lo manejamos aquí
            return;
          }
        }
      } catch (err) {
        logError('ERROR_GENERAL', err);
        throw new Error('Error al actualizar datos de facturación');
      }
      
      // Éxito - actualizamos la interfaz
      const success = true;
      logInfo('RESULTADO', 'Operación completada');

      if (success) {
        logInfo('EXITO', 'Datos de facturación actualizados correctamente');
        setMensaje({
          texto: "Datos de facturación actualizados correctamente",
          tipo: "exito",
        });
        
        // Limpiar el mensaje después de 3 segundos y recargar la página
        setTimeout(() => {
          setMensaje(null);
          // Recargar la página para mostrar los datos actualizados
          logInfo('RECARGAR_PAGINA', 'Recargando página');
          window.location.reload();
        }, 1500);
      } else {
        logError('ERROR_FINAL', new Error("Error al actualizar datos de facturación"));
        throw new Error("Error al actualizar datos de facturación");
      }
    } catch (error: any) {
      logError('ERROR_GLOBAL', error);
      setMensaje({
        texto: "No se pudieron actualizar los datos de facturación. Por favor, intenta nuevamente.",
        tipo: "error",
      });
    } finally {
      setSaving(false);
      logInfo('FIN_PROCESO', 'Proceso finalizado');
    }
  };

  if (isLoading) {
    return (
      <AppLayout>
        <Loading text="Cargando datos de facturación..." />
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="py-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold">Datos de Facturación</h1>
          <div>
            <Link href="/perfil">
              <Button variant="outline" className="mr-2">
                Volver al Perfil
              </Button>
            </Link>
            <Link href="/perfil/membresia">
              <Button variant="outline">
                Mi Membresía
              </Button>
            </Link>
          </div>
        </div>

        <Alert mensaje={mensaje} onClose={() => setMensaje(null)} />

        <Card>
          <div className="mb-4 p-4 bg-indigo-50 rounded-md border border-indigo-100">
            <h3 className="text-indigo-800 text-sm font-medium">Información para facturación</h3>
            <p className="text-indigo-700 text-xs mt-1">
              Estos datos se utilizarán para generar las facturas de tu membresía. Asegúrate de que sean correctos para evitar problemas fiscales.
            </p>
          </div>
          
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="md:col-span-2">
                <Input
                  label="Razón Social / Nombre"
                  id="razon_social"
                  name="razon_social"
                  type="text"
                  value={facturaData.razon_social}
                  onChange={handleChange}
                  required
                  fullWidth
                />
              </div>
              
              <div>
                <Input
                  label="CIF / NIF"
                  id="cif"
                  name="cif"
                  type="text"
                  value={facturaData.cif}
                  onChange={handleChange}
                  required
                  fullWidth
                />
              </div>
              
              <div className="md:col-span-2">
                <Input
                  label="Dirección Fiscal"
                  id="direccion_fiscal"
                  name="direccion_fiscal"
                  type="text"
                  value={facturaData.direccion_fiscal}
                  onChange={handleChange}
                  required
                  fullWidth
                />
              </div>
              
              <div>
                <Input
                  label="Código Postal"
                  id="codigo_postal"
                  name="codigo_postal"
                  type="text"
                  value={facturaData.codigo_postal}
                  onChange={handleChange}
                  required
                  fullWidth
                />
              </div>
              
              <div>
                <Input
                  label="Ciudad"
                  id="ciudad"
                  name="ciudad"
                  type="text"
                  value={facturaData.ciudad}
                  onChange={handleChange}
                  required
                  fullWidth
                />
              </div>
              
              <div>
                <Input
                  label="Provincia"
                  id="provincia"
                  name="provincia"
                  type="text"
                  value={facturaData.provincia}
                  onChange={handleChange}
                  required
                  fullWidth
                  placeholder="Introduce la provincia"
                  // Muestra el valor actual en un título para depuración
                  title={`Valor actual: ${facturaData.provincia || 'vacío'}`}
                />
              </div>
              
              <div>
                <Input
                  label="País"
                  id="pais"
                  name="pais"
                  type="text"
                  value={facturaData.pais}
                  onChange={handleChange}
                  required
                  fullWidth
                />
              </div>
            </div>
            
            <div className="flex justify-end">
              <Button
                type="submit"
                isLoading={saving}
                disabled={saving}
              >
                Guardar datos de facturación
              </Button>
            </div>
          </form>
        </Card>

        {/* Sección de facturas */}
        <Card title="Historial de Facturas" className="mt-6">
          <div className="border-t border-gray-200 mt-5 pt-5">
            <p className="text-center text-gray-500 text-sm py-4">No hay facturas disponibles en este momento.</p>
          </div>
        </Card>
      </div>
    </AppLayout>
  );
}