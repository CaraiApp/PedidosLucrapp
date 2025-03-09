"use client";

import React, { useState, useEffect, useRef, Suspense } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import AppLayout from "../../components/AppLayout";
import { supabase } from "@/lib/supabase";
import Loading from "@/components/ui/Loading";

// Componente principal con Suspense para evitar problemas de carga inicial
export default function EscanearFacturaPage() {
  return (
    <Suspense fallback={
      <AppLayout>
        <div className="py-8">
          <Loading text="Cargando escáner..." />
        </div>
      </AppLayout>
    }>
      <EscanerFactura />
    </Suspense>
  );
}

// Interfaces para los datos
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

// Componente principal con toda la lógica
function EscanerFactura() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  
  // Estados
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [imagen, setImagen] = useState<File | null>(null);
  const [imagenCapturada, setImagenCapturada] = useState<string | null>(null);
  const [isPdf, setIsPdf] = useState<boolean>(false);
  const [datosEscaneados, setDatosEscaneados] = useState<DatosEscaneados | null>(null);
  const [proveedorExistente, setProveedorExistente] = useState<Proveedor | null>(null);
  const [proveedoresDisponibles, setProveedoresDisponibles] = useState<Proveedor[]>([]);
  const [proveedorSeleccionado, setProveedorSeleccionado] = useState<string>("");
  const [guardando, setGuardando] = useState<boolean>(false);
  const [mostrandoCamara, setMostrandoCamara] = useState<boolean>(false);
  const [verificandoAcceso, setVerificandoAcceso] = useState<boolean>(true);
  const [tieneAccesoIA, setTieneAccesoIA] = useState<boolean>(false);
  
  // Verificar acceso a IA y cargar proveedores al inicio
  useEffect(() => {
    const inicializar = async () => {
      try {
        setVerificandoAcceso(true);
        
        // 0. Verificar si hay sesión activa primero antes de hacer peticiones al API
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
        if (!session) {
          setError("No tienes una sesión activa. Por favor, inicia sesión para continuar.");
          setVerificandoAcceso(false);
          // No continuamos si no hay sesión
          return;
        }
        
        // 1. Verificar acceso a funciones de IA con sesión comprobada
        const responseAcceso = await fetch("/api/verify-ai-access?direct=true", {
          method: 'GET',
          credentials: 'include',
          headers: {
            'Cache-Control': 'no-cache',
            'Pragma': 'no-cache',
            'Authorization': `Bearer ${session.access_token}`
          }
        });
        
        const datosAcceso = await responseAcceso.json();
        
        if (responseAcceso.status === 401) {
          // Error de autenticación - La sesión no está disponible
          setError("No se ha detectado una sesión activa. Por favor, vuelve a iniciar sesión.");
          setTieneAccesoIA(false);
        } else if (datosAcceso.success && datosAcceso.tieneAcceso) {
          // Acceso concedido
          setTieneAccesoIA(true);
        } else {
          // Cualquier otro caso es denegación de acceso
          setTieneAccesoIA(false);
          setError(datosAcceso.error || "Tu plan actual no incluye funciones de IA. Actualiza a un plan con IA para usar esta característica.");
        }
        
        // 2. Ya tenemos la sesión del usuario, usarla directamente
        if (session?.user?.id) {
          // Si hay sesión activa, cargar proveedores reales
          const { data: proveedores, error } = await supabase
            .from("proveedores")
            .select("id, nombre, cif, telefono, email, direccion")
            .eq("usuario_id", session.user.id)
            .order("nombre");
            
          if (error) {
            console.error("Error al consultar proveedores:", error);
          }
            
          if (proveedores && proveedores.length > 0) {
            setProveedoresDisponibles(proveedores);
          }
        } else {
          // Sin sesión activa
          setError("Debes iniciar sesión para usar esta función");
        }
      } catch (err) {
        console.error("Error al inicializar:", err);
        setError("Error al verificar acceso a IA. Por favor, intenta nuevamente.");
      } finally {
        setVerificandoAcceso(false);
      }
    };
    
    inicializar();
    
    // Limpiar la cámara al desmontar el componente
    return () => {
      detenerCamara();
    };
  }, []);

  // Funciones para manejar la cámara
  const iniciarCamara = async () => {
    try {
      setMostrandoCamara(true);
      
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
      });
      
      streamRef.current = stream;
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err) {
      console.error("Error al acceder a la cámara:", err);
      setError("No se pudo acceder a la cámara. Verifica los permisos.");
    }
  };
  
  const detenerCamara = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    
    setMostrandoCamara(false);
  };
  
  const capturarImagen = () => {
    if (!videoRef.current) return;
    
    const canvas = document.createElement("canvas");
    canvas.width = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;
    const ctx = canvas.getContext("2d");
    
    if (ctx) {
      ctx.drawImage(videoRef.current, 0, 0);
      const imageData = canvas.toDataURL("image/jpeg");
      
      // Crear un objeto File a partir del base64
      fetch(imageData)
        .then(res => res.blob())
        .then(blob => {
          const file = new File([blob], "captura.jpeg", { type: "image/jpeg" });
          setImagen(file);
          setImagenCapturada(imageData);
          setIsPdf(false);
          detenerCamara();
          procesarImagen(file);
        });
    }
  };
  
  const handleImagenChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    
    if (files && files.length > 0) {
      const file = files[0];
      setImagen(file);
      
      // Crear URL para previsualización
      const objectUrl = URL.createObjectURL(file);
      setImagenCapturada(objectUrl);
      
      // Detectar si es PDF
      setIsPdf(file.type === 'application/pdf');
      
      // Limpiar datos previos
      setDatosEscaneados(null);
      setProveedorExistente(null);
      setProveedorSeleccionado("");
      setError(null);
      
      // Procesar automáticamente
      procesarImagen(file);
    }
  };
  
  const procesarImagen = async (archivo: File) => {
    if (!archivo) {
      setError("Por favor, selecciona una imagen o PDF primero.");
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Verificar tamaño máximo (10MB)
      const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB en bytes
      if (archivo.size > MAX_FILE_SIZE) {
        throw new Error("El archivo es demasiado grande. El tamaño máximo permitido es 10MB.");
      }

      // Crear FormData para enviar la imagen
      const formData = new FormData();
      formData.append("image", archivo);
      
      console.log("Enviando solicitud a API de escaneo...");
      
      // Enviar a la API principal de escaneo
      const response = await fetch("/api/scan-invoice", {
        method: "POST",
        body: formData,
        cache: 'no-cache' // Evitar cacheo
      });
      
      console.log("Respuesta recibida, estado:", response.status);
      const data = await response.json();
      console.log("Datos de respuesta:", data);

      if (!response.ok) {
        throw new Error(data.error || `Error al procesar (${response.status})`);
      }

      // Verificar si hubo un error que se recuperó con datos simulados
      if (data.error_detalle && data.error_detalle.recuperado) {
        console.warn("Se detectó un error recuperado:", data.error_detalle);
        setError(`Atención: Se han generado datos simulados debido a un error. Tipo: ${data.error_detalle.tipo}`);
      }

      // Guardar los datos procesados
      setDatosEscaneados(data.datos);
      
      // Comprobar si hay un proveedor que coincida con los datos escaneados
      if (data.datos?.proveedor?.cif) {
        const proveedorMatch = proveedoresDisponibles.find(
          p => p.cif && p.cif.toLowerCase() === data.datos.proveedor.cif.toLowerCase()
        );
        
        if (proveedorMatch) {
          setProveedorExistente(proveedorMatch);
          setProveedorSeleccionado(proveedorMatch.id);
        }
      }
      
      // Mensaje de éxito en lugar de error
      console.log("Procesamiento exitoso:", data.message);

    } catch (err: any) {
      console.error("Error al procesar:", err);
      setError(err.message || "Error al procesar. Por favor, intenta nuevamente.");
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

      // Verificar si hay sesión para determinar cómo proceder
      const { data: sessionData } = await supabase.auth.getSession();
      const haySessionActiva = !!sessionData?.session?.user?.id;

      console.log("Estado de sesión al guardar:", haySessionActiva ? "Activa" : "Inactiva");

      // Preparar datos para enviar
      const datosParaGuardar = {
        proveedor: datosEscaneados.proveedor,
        articulos: datosEscaneados.articulos,
        proveedorExistenteId: proveedorSeleccionado || null
      };

      if (!haySessionActiva) {
        // Modo de prueba - Simular guardado exitoso
        console.log("MODO PRUEBA: Simulando guardado exitoso de datos:", datosParaGuardar);
        
        // Esperar un momento para simular el procesamiento
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        setError(null);
        setGuardando(false);
        
        // Mostrar mensaje de éxito y detalles
        alert("MODO PRUEBA: Datos procesados correctamente:\n" +
              `- Proveedor: ${datosEscaneados.proveedor.nombre}\n` +
              `- Artículos: ${datosEscaneados.articulos.length}\n\n` +
              "No se han guardado realmente los datos porque no hay sesión activa.");
        
        // No redirigimos en modo prueba
        return;
      }

      // Si hay sesión, enviar a la API para guardar con el token
      console.log("Enviando datos a la API para guardar");
      
      // Obtener token de acceso para incluirlo en el header
      const { data: { session: currentSession } } = await supabase.auth.getSession();
      
      if (!currentSession || !currentSession.access_token) {
        throw new Error("No se pudo obtener la sesión para guardar los datos. Por favor, intenta iniciar sesión nuevamente.");
      }
      
      const response = await fetch("/api/save-scanned-invoice", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${currentSession.access_token}`
        },
        credentials: 'include',
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
  
  const reiniciarCaptura = () => {
    setImagen(null);
    setImagenCapturada(null);
    setDatosEscaneados(null);
    setError(null);
    setIsPdf(false);
    setProveedorExistente(null);
    setProveedorSeleccionado("");
  };

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

        {/* Mensajes de error */}
        {error && (
          <div className="mb-6 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
            {error}
            {!tieneAccesoIA && (
              <div className="mt-2">
                <Link href="/membresias" className="text-red-800 font-semibold underline">
                  Actualizar a un plan con IA
                </Link>
              </div>
            )}
          </div>
        )}
        
        {verificandoAcceso ? (
          <div className="bg-white shadow rounded-lg p-6 mb-6 text-center">
            <Loading text="Verificando acceso a IA..." />
          </div>
        ) : !tieneAccesoIA ? (
          <div className="bg-white shadow rounded-lg p-6 mb-6 text-center">
            <div className="mb-4">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mx-auto text-yellow-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h2 className="text-lg font-semibold mb-2">Función Premium</h2>
            <p className="mb-4">Esta función requiere un plan con acceso a IA.</p>
            <Link
              href="/membresias"
              className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
            >
              Ver planes disponibles
            </Link>
          </div>
        ) : (
          /* Sección de captura - solo visible si tiene acceso a IA */
          <div className="bg-white shadow rounded-lg p-6 mb-6">
            <h2 className="text-lg font-semibold mb-4">Seleccionar o Capturar Imagen</h2>
            
            {!imagenCapturada && !mostrandoCamara && (
              <div className="flex flex-col md:flex-row gap-4 mb-4">
                {/* Botones para seleccionar archivo o usar cámara */}
                <div className="flex-1 flex flex-col sm:flex-row gap-2">
                  {/* Input oculto para selección de archivos */}
                  <input
                    type="file"
                    ref={fileInputRef}
                    accept="image/*,application/pdf,.pdf"
                    className="hidden"
                    onChange={handleImagenChange}
                  />
                  
                  {/* Botón para seleccionar PDF */}
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 flex items-center justify-center"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    Seleccionar PDF
                  </button>
                  
                  {/* Botón para usar la cámara */}
                  <button
                    type="button"
                    onClick={iniciarCamara}
                    className="w-full px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 flex items-center justify-center"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    Usar Cámara
                  </button>
                </div>
              </div>
            )}
          
            {/* Previsualización de la cámara */}
            {mostrandoCamara && (
              <div className="mb-4">
                <div className="bg-gray-200 rounded-lg overflow-hidden mb-4" style={{ height: '400px' }}>
                  <video 
                    ref={videoRef} 
                    autoPlay 
                    playsInline 
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="flex justify-between gap-4">
                  <button 
                    onClick={detenerCamara} 
                    className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                  >
                    Cancelar
                  </button>
                  <button 
                    onClick={capturarImagen} 
                    className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
                  >
                    Capturar
                  </button>
                </div>
              </div>
            )}
            
            {/* Previsualización de la imagen */}
            {imagenCapturada && (
              <div className="mb-4">
                <div className="bg-gray-200 rounded-lg overflow-hidden mb-4" style={{ height: '300px' }}>
                  {isPdf ? (
                    <div className="text-center py-4 flex flex-col items-center h-full justify-center">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 text-red-500 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      <p className="text-gray-700 font-medium">{imagen?.name}</p>
                      <p className="text-gray-500 text-sm mt-1">Documento PDF seleccionado</p>
                    </div>
                  ) : (
                    // Using next/image is recommended, but using img for now
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={imagenCapturada}
                      alt="Imagen capturada"
                      className="w-full h-full object-contain"
                    />
                  )}
                </div>
                <div className="flex justify-between gap-4">
                  <button 
                    onClick={reiniciarCaptura} 
                    className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                  >
                    Nueva Captura
                  </button>
                  {loading ? (
                    <button 
                      disabled
                      className="px-4 py-2 bg-indigo-600 text-white rounded-md opacity-50 cursor-not-allowed"
                    >
                      Procesando...
                    </button>
                  ) : datosEscaneados ? (
                    <button 
                      onClick={handleGuardarDatos} 
                      className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
                    >
                      Guardar Datos
                    </button>
                  ) : (
                    <button 
                      onClick={() => procesarImagen(imagen!)} 
                      className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
                    >
                      Procesar
                    </button>
                  )}
                </div>
              </div>
            )}
            
            {/* Consejos para mejores resultados */}
            {!imagenCapturada && !mostrandoCamara && (
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
        )}

        {loading && tieneAccesoIA && (
          <div className="bg-white shadow rounded-lg p-6 mb-6 text-center">
            <Loading text="Procesando documento con IA..." />
            <p className="text-center text-gray-600 mt-2">
              Este proceso puede tardar hasta 20-30 segundos dependiendo del tamaño del documento...
            </p>
          </div>
        )}

        {datosEscaneados && tieneAccesoIA && (
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
                  <div className="col-span-1 md:col-span-2">
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
                      Teléfono
                    </label>
                    <input
                      type="tel"
                      value={datosEscaneados.proveedor.telefono || ""}
                      onChange={(e) => actualizarProveedor("telefono", e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                    />
                  </div>
                  
                  <div className="col-span-1 md:col-span-2">
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
                  
                  <div className="col-span-1 md:col-span-2">
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
                <>
                  {/* Tabla para pantallas medianas y grandes */}
                  <div className="hidden md:block overflow-x-auto">
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
                  
                  {/* Vista de tarjetas para dispositivos móviles */}
                  <div className="md:hidden space-y-4">
                    {datosEscaneados.articulos.map((articulo, index) => (
                      <div 
                        key={index} 
                        className={`p-4 border rounded-lg shadow-sm ${articulo.ignorar ? "bg-gray-100" : "bg-white"}`}
                      >
                        <div className="mb-3">
                          <label className="block text-xs font-medium text-gray-500 uppercase mb-1">
                            Nombre
                          </label>
                          <input
                            type="text"
                            value={articulo.nombre || ""}
                            onChange={(e) => actualizarArticulo(index, "nombre", e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                          />
                        </div>
                        
                        <div className="grid grid-cols-2 gap-3 mb-3">
                          <div>
                            <label className="block text-xs font-medium text-gray-500 uppercase mb-1">
                              Precio
                            </label>
                            <input
                              type="number"
                              step="0.01"
                              value={articulo.precio || ""}
                              onChange={(e) => actualizarArticulo(index, "precio", parseFloat(e.target.value))}
                              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-gray-500 uppercase mb-1">
                              Ref/SKU
                            </label>
                            <input
                              type="text"
                              value={articulo.sku || ""}
                              onChange={(e) => actualizarArticulo(index, "sku", e.target.value)}
                              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                            />
                          </div>
                        </div>
                        
                        {articulo.posiblesDuplicados ? (
                          <div className="mb-3">
                            <label className="block text-xs font-medium text-gray-500 uppercase mb-1">
                              Posibles Duplicados
                            </label>
                            <div className="text-amber-600 text-sm bg-amber-50 p-2 rounded-md">
                              <ul className="list-disc list-inside">
                                {articulo.posiblesDuplicados.map((dup: any) => (
                                  <li key={dup.id}>{dup.nombre}</li>
                                ))}
                              </ul>
                            </div>
                          </div>
                        ) : (
                          <div className="mb-3">
                            <label className="block text-xs font-medium text-gray-500 uppercase mb-1">
                              Posibles Duplicados
                            </label>
                            <div className="text-green-600 text-sm bg-green-50 p-2 rounded-md">
                              No hay duplicados
                            </div>
                          </div>
                        )}
                        
                        <div className="flex items-center">
                          <label className="flex items-center text-sm text-gray-700 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={articulo.ignorar || false}
                              onChange={(e) => actualizarArticulo(index, "ignorar", e.target.checked)}
                              className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded mr-2"
                            />
                            Ignorar este artículo
                          </label>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}
              
              <div className="mt-6 flex justify-end">
                <button
                  type="button"
                  onClick={handleGuardarDatos}
                  disabled={guardando}
                  className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50"
                >
                  {guardando ? "Guardando..." : "Guardar Datos"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}