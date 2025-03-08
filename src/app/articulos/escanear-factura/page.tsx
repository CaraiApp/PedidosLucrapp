"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import AppLayout from "../../components/AppLayout";
import { supabase } from "@/lib/supabase";
import Loading from "@/components/ui/Loading";

interface Proveedor {
  id: string;
  nombre: string;
  cif?: string;
  telefono?: string;
  email?: string;
  direccion?: string;
}

interface Articulo {
  nombre: string;
  precio: number;
  cantidad: number;
  sku?: string;
  descripcion?: string;
  posiblesDuplicados?: any[];
  ignorar?: boolean;
}

interface DatosEscaneados {
  proveedor: Proveedor;
  articulos: Articulo[];
}

export default function EscanearFacturaPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [imagen, setImagen] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isPdf, setIsPdf] = useState<boolean>(false);
  const [datosEscaneados, setDatosEscaneados] = useState<DatosEscaneados | null>(null);
  const [proveedorExistente, setProveedorExistente] = useState<Proveedor | null>(null);
  const [proveedoresDisponibles, setProveedoresDisponibles] = useState<Proveedor[]>([]);
  const [proveedorSeleccionado, setProveedorSeleccionado] = useState<string>("");
  const [guardando, setGuardando] = useState<boolean>(false);
  const [permisoIA, setPermisoIA] = useState<boolean | null>(null);
  const [verificandoPermisos, setVerificandoPermisos] = useState<boolean>(true);

  useEffect(() => {
    const verificarPermisos = async () => {
      try {
        setVerificandoPermisos(true);
        
        // Verificar sesión
        const { data: sessionData } = await supabase.auth.getSession();
        if (!sessionData.session) {
          router.push("/login");
          return;
        }

        // Verificar si el usuario tiene acceso a funcionalidades de IA
        // Primero, obtenemos el ID de membresía activa
        const { data: userInfo, error: userInfoError } = await supabase
          .from("usuarios")
          .select("membresia_activa_id")
          .eq("id", sessionData.session.user.id)
          .single();
          
        if (userInfoError) {
          console.error("Error al obtener información del usuario:", userInfoError);
          setError("Error al verificar tus permisos. Por favor, intenta nuevamente.");
          setPermisoIA(false);
          return;
        }
        
        console.log("ID de membresía activa:", userInfo.membresia_activa_id);
        
        if (!userInfo.membresia_activa_id) {
          console.log("El usuario no tiene una membresía activa");
          setPermisoIA(false);
          return;
        }
        
        // Luego, obtenemos los detalles de la membresía incluyendo tipo
        const { data: membresiaData, error: membresiaError } = await supabase
          .from("membresias_usuarios")
          .select(`
            id,
            tipo_membresia:membresia_tipos(*)
          `)
          .eq("id", userInfo.membresia_activa_id)
          .single();
          
        if (membresiaError) {
          console.error("Error al verificar detalles de membresía:", membresiaError);
          setError("Error al verificar tu membresía. Por favor, intenta nuevamente.");
          setPermisoIA(false);
          return;
        }
        
        console.log("Datos de membresía:", membresiaData);
        
        // Comprobar si tiene IA, considerando posibles estructuras de la respuesta
        let tieneAccesoIA = false;
        
        if (membresiaData?.tipo_membresia) {
          if (Array.isArray(membresiaData.tipo_membresia)) {
            // Si es un array, tomamos el primer elemento
            tieneAccesoIA = !!membresiaData.tipo_membresia[0]?.tiene_ai;
            console.log("Tiene IA (desde array):", tieneAccesoIA);
          } else {
            // Si es un objeto directo
            tieneAccesoIA = !!membresiaData.tipo_membresia.tiene_ai;
            console.log("Tiene IA (desde objeto):", tieneAccesoIA);
          }
        }
        
        setPermisoIA(tieneAccesoIA);

        // Si no tiene acceso a IA, no cargar más datos
        if (!tieneAccesoIA) {
          return;
        }

        // Cargar proveedores existentes
        const { data: proveedores, error: proveedoresError } = await supabase
          .from("proveedores")
          .select("id, nombre, cif, telefono, email, direccion")
          .eq("usuario_id", sessionData.session.user.id)
          .order("nombre");

        if (proveedoresError) {
          console.error("Error al cargar proveedores:", proveedoresError);
          setError("Error al cargar la lista de proveedores.");
          return;
        }

        setProveedoresDisponibles(proveedores || []);

      } catch (err) {
        console.error("Error en verificación de permisos:", err);
        setError("Error al verificar tus permisos. Por favor, intenta nuevamente.");
      } finally {
        setVerificandoPermisos(false);
      }
    };

    verificarPermisos();
  }, [router]);

  const handleImagenChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    
    if (files && files.length > 0) {
      const file = files[0];
      setImagen(file);
      
      // Crear URL para previsualización
      const objectUrl = URL.createObjectURL(file);
      setPreviewUrl(objectUrl);
      
      // Limpiar datos previos
      setDatosEscaneados(null);
      setProveedorExistente(null);
      setProveedorSeleccionado("");
      setError(null);
      
      // Actualizar el estado isPdf según el tipo de archivo
      setIsPdf(file.type === 'application/pdf');
    }
  };

  const handleProcesarImagen = async () => {
    if (!imagen) {
      setError("Por favor, selecciona una imagen primero.");
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Verificar tamaño máximo (10MB)
      const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB en bytes
      if (imagen.size > MAX_FILE_SIZE) {
        throw new Error("La imagen es demasiado grande. El tamaño máximo permitido es 10MB.");
      }

      // Verificar formato aceptado
      const acceptedTypes = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
      if (!acceptedTypes.includes(imagen.type)) {
        throw new Error("Formato de archivo no soportado. Por favor, usa JPEG, PNG, WEBP o PDF.");
      }

      // Crear FormData para enviar la imagen
      const formData = new FormData();
      formData.append("image", imagen);

      // Enviar a la API para procesar
      const response = await fetch("/api/scan-invoice", {
        method: "POST",
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        // Manejar diferentes tipos de errores
        if (response.status === 400) {
          throw new Error(data.error || "Formato incorrecto. Verifica que la imagen sea clara.");
        } else if (response.status === 403 && data.requiereActualizacion) {
          setError(data.error);
          router.push("/membresias");
          return;
        } else if (response.status === 429) {
          throw new Error("Has alcanzado el límite de peticiones. Intenta de nuevo más tarde.");
        } else {
          throw new Error(data.error || "Error al procesar la imagen");
        }
      }

      // Si no hay datos o no se han detectado elementos en la factura
      if (!data.datos || (!data.datos.proveedor?.nombre && (!data.datos.articulos || data.datos.articulos.length === 0))) {
        throw new Error("No se ha podido extraer información de la imagen. Intenta con otra imagen más clara o con mejor iluminación.");
      }

      // Guardar los datos procesados
      setDatosEscaneados(data.datos);
      
      // Si hay un proveedor existente, guardarlo
      if (data.proveedorExistente) {
        setProveedorExistente(data.proveedorExistente);
        setProveedorSeleccionado(data.proveedorExistente.id);
      }

    } catch (err: any) {
      console.error("Error al procesar imagen:", err);
      setError(err.message || "Error al procesar la imagen. Por favor, intenta nuevamente.");
    } finally {
      setLoading(false);
    }
  };

  const handleGuardarDatos = async () => {
    if (!datosEscaneados) {
      setError("No hay datos para guardar.");
      return;
    }

    try {
      setGuardando(true);
      setError(null);

      // Preparar datos para enviar
      const datosParaGuardar = {
        proveedor: datosEscaneados.proveedor,
        articulos: datosEscaneados.articulos,
        proveedorExistenteId: proveedorSeleccionado || null
      };

      // Enviar a la API para guardar
      const response = await fetch("/api/save-scanned-invoice", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(datosParaGuardar),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Error al guardar los datos");
      }

      // Redireccionar a la página de artículos
      router.push("/articulos");

    } catch (err: any) {
      console.error("Error al guardar datos:", err);
      setError(err.message || "Error al guardar los datos. Por favor, intenta nuevamente.");
    } finally {
      setGuardando(false);
    }
  };

  const actualizarArticulo = (index: number, campo: string, valor: any) => {
    if (!datosEscaneados) return;
    
    const nuevosArticulos = [...datosEscaneados.articulos];
    nuevosArticulos[index] = {
      ...nuevosArticulos[index],
      [campo]: valor
    };
    
    setDatosEscaneados({
      ...datosEscaneados,
      articulos: nuevosArticulos
    });
  };

  const actualizarProveedor = (campo: string, valor: any) => {
    if (!datosEscaneados) return;
    
    setDatosEscaneados({
      ...datosEscaneados,
      proveedor: {
        ...datosEscaneados.proveedor,
        [campo]: valor
      }
    });
  };

  // Si estamos verificando permisos, mostrar cargando
  if (verificandoPermisos) {
    return (
      <AppLayout>
        <div className="py-8">
          <Loading text="Verificando permisos..." />
        </div>
      </AppLayout>
    );
  }

  // Si el usuario no tiene permiso para funciones de IA
  if (permisoIA === false) {
    return (
      <AppLayout>
        <div className="py-8">
          <h1 className="text-2xl font-bold mb-6">Escanear Factura con IA</h1>
          <div className="bg-amber-50 border border-amber-200 text-amber-800 p-4 rounded-md mb-6">
            <h2 className="text-lg font-semibold mb-2">Función Premium</h2>
            <p className="mb-3">
              El escaneo de facturas con IA es una característica exclusiva del Plan Premium.
            </p>
            <Link 
              href="/membresias" 
              className="bg-indigo-600 text-white px-4 py-2 rounded-md inline-block hover:bg-indigo-700"
            >
              Actualizar a Plan Premium
            </Link>
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="py-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold">Escanear Factura con IA</h1>
          <Link
            href="/articulos"
            className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
          >
            Volver a Artículos
          </Link>
        </div>

        {error && (
          <div className="mb-6 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
            {error}
          </div>
        )}

        <div className="bg-white shadow rounded-lg p-6 mb-6">
          <h2 className="text-lg font-semibold mb-4">Seleccionar Imagen de Factura</h2>
          <div className="flex flex-col md:flex-row gap-4 mb-4">
            <div className="flex-1">
              <input
                type="file"
                ref={fileInputRef}
                accept="image/*,application/pdf,.pdf"
                className="hidden"
                onChange={handleImagenChange}
              />
              <div className="flex flex-col sm:flex-row gap-2">
                <button
                  type="button"
                  onClick={() => {
                    if (fileInputRef.current) {
                      // Asegurarse de que no haya atributo capture para archivos
                      fileInputRef.current.removeAttribute('capture');
                      fileInputRef.current.click();
                    }
                  }}
                  className="w-full px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 flex items-center justify-center"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  Seleccionar PDF
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (fileInputRef.current) {
                      // Usar "user" para la cámara frontal (webcam)
                      fileInputRef.current.setAttribute('capture', 'user');
                      fileInputRef.current.click();
                    }
                  }}
                  className="w-full px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 flex items-center justify-center"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                  Usar Webcam
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (fileInputRef.current) {
                      // Usar "environment" para la cámara trasera del móvil
                      fileInputRef.current.setAttribute('capture', 'environment');
                      fileInputRef.current.click();
                    }
                  }}
                  className="w-full px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 flex items-center justify-center"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  Cámara trasera
                </button>
              </div>
              {imagen && (
                <p className="mt-2 text-sm text-gray-600">
                  Archivo seleccionado: {imagen.name}
                </p>
              )}
            </div>
            <div className="md:w-1/3">
              <button
                type="button"
                onClick={handleProcesarImagen}
                disabled={!imagen || loading}
                className="w-full px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
              >
                {loading ? "Procesando..." : "Procesar Imagen"}
              </button>
            </div>
          </div>

          {/* Previsualización de la imagen */}
          {previewUrl && (
            <div className="mt-4">
              <h3 className="text-md font-medium mb-2">Previsualización:</h3>
              <div className="border border-gray-300 rounded-md p-2 max-w-md mx-auto">
                {isPdf ? (
                  <div className="text-center py-4 flex flex-col items-center">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 text-red-500 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    <p className="text-gray-700 font-medium">{imagen?.name}</p>
                    <p className="text-gray-500 text-sm mt-1">Documento PDF seleccionado</p>
                  </div>
                ) : (
                  <img
                    src={previewUrl}
                    alt="Previsualización"
                    className="max-h-64 max-w-full mx-auto"
                  />
                )}
              </div>
            </div>
          )}
          
          {!imagen && (
            <div className="mt-4 bg-blue-50 border border-blue-200 text-blue-700 p-3 rounded-md">
              <h3 className="text-md font-medium mb-1">Consejos para mejores resultados:</h3>
              <ul className="list-disc list-inside text-sm">
                <li>Asegúrate de que la factura esté bien iluminada</li>
                <li>Evita sombras o reflejos sobre el documento</li>
                <li>Coloca la factura sobre una superficie plana</li>
                <li>Mantén la cámara paralela al documento</li>
                <li>Incluye todos los detalles importantes en la imagen</li>
              </ul>
            </div>
          )}
        </div>

        {loading && (
          <div className="bg-white shadow rounded-lg p-6 mb-6">
            <Loading text="Procesando factura con IA..." />
            <p className="text-center text-gray-600 mt-2">
              Este proceso puede tardar unos segundos...
            </p>
          </div>
        )}

        {datosEscaneados && (
          <div className="bg-white shadow rounded-lg p-6 mb-6">
            <h2 className="text-lg font-semibold mb-4">Resultados del Escaneo</h2>
            
            {/* Datos del Proveedor */}
            <div className="mb-6">
              <h3 className="text-md font-medium mb-3">Información del Proveedor</h3>
              
              {/* Si se detectó un proveedor existente */}
              {proveedorExistente && (
                <div className="bg-green-50 border border-green-200 text-green-800 p-3 rounded-md mb-4">
                  <p className="font-medium">Se ha encontrado un proveedor existente:</p>
                  <p>{proveedorExistente.nombre} {proveedorExistente.cif ? `(CIF: ${proveedorExistente.cif})` : ''}</p>
                </div>
              )}
              
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Seleccionar Proveedor
                </label>
                <select
                  value={proveedorSeleccionado}
                  onChange={(e) => setProveedorSeleccionado(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                >
                  <option value="">Crear nuevo proveedor con datos escaneados</option>
                  {proveedoresDisponibles.map(p => (
                    <option key={p.id} value={p.id}>
                      {p.nombre} {p.cif ? `(CIF: ${p.cif})` : ''}
                    </option>
                  ))}
                </select>
              </div>
              
              {/* Mostrar formulario de edición si se va a crear un nuevo proveedor */}
              {!proveedorSeleccionado && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 border border-gray-200 rounded-md">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Nombre
                    </label>
                    <input
                      type="text"
                      value={datosEscaneados.proveedor.nombre || ""}
                      onChange={(e) => actualizarProveedor("nombre", e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      CIF/NIF
                    </label>
                    <input
                      type="text"
                      value={datosEscaneados.proveedor.cif || ""}
                      onChange={(e) => actualizarProveedor("cif", e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Email
                    </label>
                    <input
                      type="email"
                      value={datosEscaneados.proveedor.email || ""}
                      onChange={(e) => actualizarProveedor("email", e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Teléfono
                    </label>
                    <input
                      type="tel"
                      value={datosEscaneados.proveedor.telefono || ""}
                      onChange={(e) => actualizarProveedor("telefono", e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                    />
                  </div>
                  
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Dirección
                    </label>
                    <input
                      type="text"
                      value={datosEscaneados.proveedor.direccion || ""}
                      onChange={(e) => actualizarProveedor("direccion", e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                    />
                  </div>
                </div>
              )}
            </div>
            
            {/* Artículos */}
            <div>
              <h3 className="text-md font-medium mb-3">Artículos Detectados</h3>
              
              {datosEscaneados.articulos.length === 0 ? (
                <p className="text-gray-500">No se han detectado artículos en la factura.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Nombre
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Precio
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Ref/SKU
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Posibles Duplicados
                        </th>
                        <th scope="col" className="px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider text-center">
                          Ignorar
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {datosEscaneados.articulos.map((articulo, index) => (
                        <tr key={index} className={articulo.ignorar ? "bg-gray-100" : ""}>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <input
                              type="text"
                              value={articulo.nombre || ""}
                              onChange={(e) => actualizarArticulo(index, "nombre", e.target.value)}
                              className="w-full px-2 py-1 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                            />
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <input
                              type="number"
                              step="0.01"
                              value={articulo.precio || ""}
                              onChange={(e) => actualizarArticulo(index, "precio", parseFloat(e.target.value))}
                              className="w-full px-2 py-1 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                            />
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <input
                              type="text"
                              value={articulo.sku || ""}
                              onChange={(e) => actualizarArticulo(index, "sku", e.target.value)}
                              className="w-full px-2 py-1 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                            />
                          </td>
                          <td className="px-6 py-4">
                            {articulo.posiblesDuplicados ? (
                              <div className="text-amber-600 text-sm">
                                <p className="font-medium">Posibles duplicados:</p>
                                <ul className="list-disc list-inside">
                                  {articulo.posiblesDuplicados.map((dup: any) => (
                                    <li key={dup.id}>{dup.nombre}</li>
                                  ))}
                                </ul>
                              </div>
                            ) : (
                              <span className="text-green-600 text-sm">No hay duplicados</span>
                            )}
                          </td>
                          <td className="px-6 py-4 text-center">
                            <input
                              type="checkbox"
                              checked={articulo.ignorar || false}
                              onChange={(e) => actualizarArticulo(index, "ignorar", e.target.checked)}
                              className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                            />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
            
            <div className="mt-6 flex justify-end">
              <button
                type="button"
                onClick={handleGuardarDatos}
                disabled={guardando}
                className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
              >
                {guardando ? "Guardando..." : "Guardar Datos"}
              </button>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}