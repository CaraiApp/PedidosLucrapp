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
  unidad_id?: string; // Añadido para selección de unidad
}

interface Unidad {
  id: string;
  nombre: string;
  abreviatura?: string;
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
  const [unidadesDisponibles, setUnidadesDisponibles] = useState<Unidad[]>([]);
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
          // Cargar datos necesarios en paralelo (proveedores y unidades)
          
          // Cargar proveedores
          const proveedoresPromise = supabase
            .from("proveedores")
            .select("id, nombre, cif, telefono, email, direccion")
            .eq("usuario_id", session.user.id)
            .order("nombre");
          
          // Cargar unidades de medida
          const unidadesPromise = supabase
            .from("unidades")
            .select("id, nombre, abreviatura")
            .order("nombre");
            
          // Esperar ambas consultas
          const [proveedoresResult, unidadesResult] = await Promise.all([
            proveedoresPromise,
            unidadesPromise
          ]);
          
          // Manejar resultados de proveedores
          if (proveedoresResult.error) {
            console.error("Error al consultar proveedores:", proveedoresResult.error);
          } else if (proveedoresResult.data && proveedoresResult.data.length > 0) {
            setProveedoresDisponibles(proveedoresResult.data);
          }
          
          // Manejar resultados de unidades
          if (unidadesResult.error) {
            console.error("Error al consultar unidades:", unidadesResult.error);
          } else if (unidadesResult.data && unidadesResult.data.length > 0) {
            setUnidadesDisponibles(unidadesResult.data);
          } else {
            // Si no hay unidades, crear un conjunto básico por defecto
            const unidadesBasicas: Unidad[] = [
              { id: 'unidad', nombre: 'Unidad', abreviatura: 'ud' },
              { id: 'kg', nombre: 'Kilogramo', abreviatura: 'kg' },
              { id: 'l', nombre: 'Litro', abreviatura: 'l' }
            ];
            setUnidadesDisponibles(unidadesBasicas);
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

  // Funciones mejoradas para manejar la cámara
  const iniciarCamara = async () => {
    try {
      setMostrandoCamara(true);
      
      // Configuración para obtener la mejor calidad posible en dispositivo móvil
      const constraints = {
        video: {
          facingMode: "environment", // Usar cámara trasera
          width: { ideal: 2048 }, // Resolución ideal alta
          height: { ideal: 1536 },
          aspectRatio: { ideal: 4/3 }, // Proporción ideal para documentos
        }
      };
      
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        
        // Escuchar cuando el video está listo para obtener las dimensiones reales
        videoRef.current.onloadedmetadata = () => {
          if (videoRef.current) {
            console.log(`Cámara inicializada: ${videoRef.current.videoWidth}x${videoRef.current.videoHeight}`);
          }
        };
      }
      
      // Bloquear la orientación en modo móvil (si el API está disponible)
      try {
        if ('screen' in window && 'orientation' in window.screen) {
          // Intentar bloquear la orientación en modo horizontal (landscape)
          // @ts-ignore - TypeScript puede que no reconozca el API de orientación
          await window.screen.orientation.lock('landscape');
        }
      } catch (orientationErr) {
        // Continuar aunque no se pueda bloquear la orientación
        console.log("No se pudo bloquear la orientación:", orientationErr);
      }
      
    } catch (err) {
      console.error("Error al acceder a la cámara:", err);
      setError("No se pudo acceder a la cámara. Verifica los permisos.");
      setMostrandoCamara(false);
    }
  };
  
  const detenerCamara = () => {
    // Liberar el bloqueo de orientación si se aplicó
    try {
      if ('screen' in window && 'orientation' in window.screen) {
        // @ts-ignore - TypeScript puede que no reconozca el API de orientación
        window.screen.orientation.unlock();
      }
    } catch (err) {
      // Ignorar errores al liberar orientación
    }
    
    // Detener todos los tracks del stream
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    
    // Limpiar referencia del video
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    
    setMostrandoCamara(false);
  };
  
  const capturarImagen = () => {
    if (!videoRef.current) return;
    
    // Efecto flash visual
    const flashElement = document.createElement('div');
    flashElement.style.position = 'fixed';
    flashElement.style.top = '0';
    flashElement.style.left = '0';
    flashElement.style.right = '0';
    flashElement.style.bottom = '0';
    flashElement.style.backgroundColor = 'white';
    flashElement.style.opacity = '0.8';
    flashElement.style.zIndex = '9999';
    flashElement.style.transition = 'opacity 0.5s ease-out';
    
    document.body.appendChild(flashElement);
    
    // Crear canvas con las dimensiones exactas del video
    const canvas = document.createElement("canvas");
    canvas.width = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;
    const ctx = canvas.getContext("2d");
    
    if (ctx) {
      // Dibujar el frame actual del video en el canvas
      ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
      
      // Convertir a JPEG con alta calidad (0.95)
      const imageData = canvas.toDataURL("image/jpeg", 0.95);
      
      // Animar y quitar el flash
      setTimeout(() => {
        flashElement.style.opacity = '0';
        setTimeout(() => {
          document.body.removeChild(flashElement);
        }, 500);
      }, 100);
      
      // Crear un objeto File a partir del base64
      fetch(imageData)
        .then(res => res.blob())
        .then(blob => {
          // Asignar nombres con timestamp para evitar conflictos
          const timestamp = new Date().getTime();
          const file = new File([blob], `factura_${timestamp}.jpeg`, { 
            type: "image/jpeg",
            lastModified: timestamp
          });
          
          // Actualizar estado y procesar
          setImagen(file);
          setImagenCapturada(imageData);
          setIsPdf(false);
          detenerCamara();
          
          // Pequeña pausa para asegurar que la UI se actualice antes de procesar
          setTimeout(() => {
            procesarImagen(file);
          }, 300);
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
      // Validar que todos los artículos no ignorados tengan unidad seleccionada
      const articulosSinUnidad = datosEscaneados.articulos
        .filter(art => !art.ignorar && !art.unidad_id);
      
      if (articulosSinUnidad.length > 0) {
        setError(`Debes seleccionar una unidad de medida para todos los artículos. Faltan ${articulosSinUnidad.length} artículos.`);
        
        // Resaltar los artículos sin unidad (implementación básica)
        const primerArticuloSinUnidad = datosEscaneados.articulos.findIndex(art => !art.ignorar && !art.unidad_id);
        if (primerArticuloSinUnidad >= 0) {
          // Hacer scroll al primer artículo sin unidad
          const articulosTabla = document.querySelectorAll('tbody tr');
          if (articulosTabla[primerArticuloSinUnidad]) {
            articulosTabla[primerArticuloSinUnidad].scrollIntoView({ behavior: 'smooth', block: 'center' });
            articulosTabla[primerArticuloSinUnidad].classList.add('bg-yellow-100');
            setTimeout(() => {
              articulosTabla[primerArticuloSinUnidad].classList.remove('bg-yellow-100');
            }, 3000);
          }
        }
        return;
      }

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

      // Verificar duplicados de cada artículo antes de guardar
      const articulosVerificados = [];
      const articulosDuplicadosEncontrados = [];
      
      // Obtenemos el ID del proveedor (existente o el que se creará)
      const proveedorIdEfectivo = proveedorSeleccionado || 'nuevo';
      
      // Verificar cada artículo
      for (const articulo of datosEscaneados.articulos) {
        // Omitir artículos marcados para ignorar
        if (articulo.ignorar) continue;
        
        // Verificar si el artículo ya existe en la base de datos
        const duplicados = await comprobarArticuloExistente(
          articulo.nombre, 
          articulo.sku, 
          proveedorSeleccionado
        );
        
        if (duplicados && duplicados.length > 0) {
          // Marcar artículo como duplicado
          articulosDuplicadosEncontrados.push({
            articulo: articulo,
            duplicadoEnBD: duplicados[0]
          });
        }
        
        articulosVerificados.push({
          ...articulo,
          verificado: true
        });
      }
      
      // Si encontramos duplicados en la base de datos, preguntar al usuario
      if (articulosDuplicadosEncontrados.length > 0) {
        const confirmar = window.confirm(
          `Se encontraron ${articulosDuplicadosEncontrados.length} artículos que parecen ya existir en tu catálogo. ¿Quieres continuar de todos modos? (Se crearán nuevamente)`
        );
        
        if (!confirmar) {
          setGuardando(false);
          return;
        }
      }

      // Si hay sesión, enviar a la API para guardar con el token y ID específico
      console.log("Enviando datos a la API para guardar");
      
      // Obtener token de acceso para incluirlo en el header
      const { data: { session: currentSession } } = await supabase.auth.getSession();
      
      // Preparar datos con un identificador adicional para asegurar la autenticación
      const datosCompletos = {
        ...datosParaGuardar,
        userIdentifier: sessionData?.session?.user?.id || ''  // Incluir ID del usuario para verificación adicional
      };
      
      // Realizar petición con múltiples opciones de autenticación
      const response = await fetch("/api/save-scanned-invoice", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": currentSession?.access_token ? `Bearer ${currentSession.access_token}` : "",
          "x-user-id": sessionData?.session?.user?.id || ""  // Header alternativo para identificación
        },
        credentials: 'include',
        body: JSON.stringify(datosCompletos),
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
  
  // Función para verificar si un artículo ya existe
  const comprobarArticuloExistente = async (nombre: string, sku: string | undefined, proveedorId: string | undefined) => {
    try {
      let query = supabase
        .from('articulos')
        .select('*');
        
      // Filtrar por nombre similar
      if (nombre) {
        query = query.ilike('nombre', `%${nombre}%`);
      }
      
      // O por SKU exacto (si existe)
      if (sku && sku.trim() !== '') {
        query = query.or(`sku.eq.${sku}`);
      }
      
      // Si tenemos proveedor, filtrar también por él
      if (proveedorId) {
        query = query.eq('proveedor_id', proveedorId);
      }
      
      const { data } = await query;
      
      return data && data.length > 0 ? data : null;
    } catch (error) {
      console.error('Error al comprobar artículo existente:', error);
      return null;
    }
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
  
  // Función para renderizar el nivel de confianza de forma legible
  const renderConfianza = (valor: number): string => {
    if (valor >= 0.9) return "Alta";
    if (valor >= 0.7) return "Media-Alta";
    if (valor >= 0.5) return "Media";
    if (valor >= 0.3) return "Media-Baja";
    return "Baja";
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
          
            {/* Previsualización de la cámara a pantalla completa */}
            {mostrandoCamara && (
              <div className="fixed inset-0 z-50 flex flex-col">
                {/* Cabecera con botón de cierre */}
                <div className="absolute top-4 right-4 z-10">
                  <button 
                    onClick={detenerCamara}
                    className="bg-white bg-opacity-75 text-gray-800 rounded-full p-2 shadow-md focus:outline-none"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
                
                {/* Video de la cámara a pantalla completa sin guías */}
                <div className="flex-grow relative">
                  <video 
                    ref={videoRef} 
                    autoPlay 
                    playsInline 
                    className="absolute inset-0 w-full h-full object-cover"
                  />
                </div>
                
                {/* Controles inferiores */}
                <div className="bg-black bg-opacity-75 p-4 flex justify-center">
                  <button 
                    onClick={capturarImagen} 
                    className="rounded-full h-16 w-16 bg-white flex items-center justify-center"
                  >
                    <div className="rounded-full h-14 w-14 border-2 border-indigo-600"></div>
                  </button>
                </div>
              </div>
            )}
            
            {/* Previsualización de la imagen mejorada */}
            {imagenCapturada && (
              <div className="mb-4">
                <div className="relative">
                  <div className="bg-gray-200 rounded-lg overflow-hidden mb-4" style={{ height: !isPdf ? '60vh' : '300px', maxHeight: '600px' }}>
                    {isPdf ? (
                      <div className="text-center py-4 flex flex-col items-center h-full justify-center">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 text-red-500 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        <p className="text-gray-700 font-medium">{imagen?.name}</p>
                        <p className="text-gray-500 text-sm mt-1">Documento PDF seleccionado</p>
                      </div>
                    ) : (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={imagenCapturada}
                        alt="Imagen capturada"
                        className="w-full h-full object-contain"
                      />
                    )}
                  </div>
                  
                  {/* Overlay para información de calidad (solo para imágenes) */}
                  {!isPdf && !loading && !datosEscaneados && (
                    <div className="absolute top-2 left-2 bg-black bg-opacity-70 text-white px-3 py-1 rounded-full text-xs">
                      {imagen && (
                        <>
                          {Math.round(imagen.size / 1024)} KB
                          {imagen.width && imagen.height ? ` • ${imagen.width}×${imagen.height}` : ""}
                        </>
                      )}
                    </div>
                  )}
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex flex-col">
                    <button 
                      onClick={reiniciarCaptura} 
                      className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 flex items-center justify-center"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clipRule="evenodd" />
                      </svg>
                      Nueva Captura
                    </button>
                    {!isPdf && (
                      <button 
                        onClick={iniciarCamara} 
                        className="mt-2 px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 flex items-center justify-center"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                        Recapturar
                      </button>
                    )}
                  </div>
                  <div className="flex items-center justify-center">
                    {loading ? (
                      <button 
                        disabled
                        className="w-full px-4 py-2 bg-indigo-600 text-white rounded-md opacity-50 cursor-not-allowed flex items-center justify-center"
                      >
                        <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Procesando...
                      </button>
                    ) : datosEscaneados ? (
                      <button 
                        onClick={handleGuardarDatos} 
                        className="w-full px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 flex items-center justify-center"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                        Guardar Datos
                      </button>
                    ) : (
                      <button 
                        onClick={() => procesarImagen(imagen!)} 
                        className="w-full px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 flex items-center justify-center"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M7 9a2 2 0 012-2h2a2 2 0 012 2v1h1a2 2 0 012 2v.5a.5.5 0 01-.5.5h-9a.5.5 0 01-.5-.5V12a2 2 0 012-2h1V9z" clipRule="evenodd" />
                          <path d="M2 13.692V16a2 2 0 002 2h12a2 2 0 002-2v-2.308A24.974 24.974 0 0110 15c-2.796 0-5.487-.46-8-1.308z" />
                        </svg>
                        Procesar
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )}
            
            {/* Consejos para mejores resultados */}
            {!imagenCapturada && !mostrandoCamara && (
              <div className="mt-4 bg-blue-50 border border-blue-200 text-blue-700 p-4 rounded-md">
                <h3 className="text-md font-medium mb-2">Consejos para mejores resultados:</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <h4 className="font-medium text-blue-800 text-sm mb-1">Para captura con cámara:</h4>
                    <ul className="list-disc list-inside text-sm space-y-1">
                      <li>Asegúrate de que la factura esté bien iluminada</li>
                      <li>Evita sombras o reflejos sobre el documento</li>
                      <li>Coloca la factura sobre una superficie plana</li>
                      <li>Mantén la cámara paralela al documento</li>
                      <li>Asegúrate de que todo el texto sea legible</li>
                    </ul>
                  </div>
                  <div>
                    <h4 className="font-medium text-blue-800 text-sm mb-1">Para mejor extracción de artículos:</h4>
                    <ul className="list-disc list-inside text-sm space-y-1">
                      <li>Los PDFs escaneados suelen ofrecer mejores resultados que fotos</li>
                      <li>Asegúrate de que la tabla de productos sea visible completa</li>
                      <li>Busca facturas con formato tabular claro</li>
                      <li>Las fotos deben mostrar claramente las descripciones y precios</li>
                      <li>Es normal tener que corregir algún precio o descripción manualmente</li>
                    </ul>
                  </div>
                </div>
                <div className="mt-3 pt-2 border-t border-blue-200">
                  <p className="text-xs text-blue-700">Nota: El sistema ha sido mejorado para extraer con mayor precisión los nombres completos de los artículos y sus precios unitarios.</p>
                </div>
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
            <div className="mt-6 max-w-md mx-auto">
              <h3 className="font-medium text-gray-800 mb-2">Optimizando la extracción de artículos:</h3>
              <ul className="space-y-2 text-left text-sm">
                <li className="flex items-start">
                  <svg className="h-5 w-5 text-indigo-500 mr-2 flex-shrink-0 mt-0.5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
                  </svg>
                  <span>Identificando la tabla de productos en el documento</span>
                </li>
                <li className="flex items-start">
                  <svg className="h-5 w-5 text-indigo-500 mr-2 flex-shrink-0 mt-0.5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
                  </svg>
                  <span>Extrayendo nombres completos de productos</span>
                </li>
                <li className="flex items-start">
                  <svg className="h-5 w-5 text-indigo-500 mr-2 flex-shrink-0 mt-0.5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
                  </svg>
                  <span>Detectando precios unitarios sin IVA</span>
                </li>
                <li className="flex items-start">
                  <svg className="h-5 w-5 text-indigo-500 mr-2 flex-shrink-0 mt-0.5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
                  </svg>
                  <span>Aplicando algoritmo mejorado para identificación de duplicados</span>
                </li>
              </ul>
            </div>
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
              <div className="flex flex-wrap justify-between items-start mb-3">
                <h3 className="text-md font-medium">Artículos Detectados</h3>
                <span className="text-sm text-indigo-600 bg-indigo-50 px-2 py-1 rounded-md">
                  {datosEscaneados.articulos.length} artículos encontrados
                </span>
              </div>
              
              {datosEscaneados.articulos.length === 0 ? (
                <p className="text-gray-500">No se han detectado artículos en la factura.</p>
              ) : (
                <div>
                  <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-4">
                    <div className="flex">
                      <div className="flex-shrink-0">
                        <svg className="h-5 w-5 text-yellow-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2h-1V9z" clipRule="evenodd" />
                        </svg>
                      </div>
                      <div className="ml-3">
                        <p className="text-sm text-yellow-700">
                          Los nombres de artículos y precios se han extraído automáticamente. Verifica y corrige si es necesario para asegurar datos precisos.
                        </p>
                      </div>
                    </div>
                  </div>
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
                            Unidad
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
                            <td className="px-6 py-4 whitespace-nowrap">
                              <select
                                value={articulo.unidad_id || ""}
                                onChange={(e) => actualizarArticulo(index, "unidad_id", e.target.value)}
                                className="w-full px-2 py-1 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                              >
                                <option value="">Seleccionar unidad</option>
                                {unidadesDisponibles.map(unidad => (
                                  <option key={unidad.id} value={unidad.id}>
                                    {unidad.nombre} {unidad.abreviatura ? `(${unidad.abreviatura})` : ''}
                                  </option>
                                ))}
                              </select>
                            </td>
                            <td className="px-6 py-4">
                              {articulo.posiblesDuplicados ? (
                                <div className={articulo.tieneDuplicadosAltaConfianza ? "text-red-600 text-sm" : "text-amber-600 text-sm"}>
                                  <p className="font-medium">
                                    {articulo.tieneDuplicadosAltaConfianza ? 
                                      "⚠️ Duplicado detectado:" : 
                                      "Posibles duplicados:"}
                                  </p>
                                  <ul className="list-disc list-inside">
                                    {articulo.posiblesDuplicados.map((dup: any) => (
                                      <li key={dup.id} className="mb-1">
                                        <span className="font-medium">{dup.nombre}</span>
                                        {dup.nivelConfianza && (
                                          <span className="ml-1 text-xs">
                                            ({renderConfianza(dup.nivelConfianza)}: {dup.razonDuplicado})
                                          </span>
                                        )}
                                      </li>
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
                        
                        <div className="mb-3">
                          <label className="block text-xs font-medium text-gray-500 uppercase mb-1">
                            Unidad de Medida
                          </label>
                          <select
                            value={articulo.unidad_id || ""}
                            onChange={(e) => actualizarArticulo(index, "unidad_id", e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                          >
                            <option value="">Seleccionar unidad</option>
                            {unidadesDisponibles.map(unidad => (
                              <option key={unidad.id} value={unidad.id}>
                                {unidad.nombre} {unidad.abreviatura ? `(${unidad.abreviatura})` : ''}
                              </option>
                            ))}
                          </select>
                        </div>
                        
                        {articulo.posiblesDuplicados ? (
                          <div className="mb-3">
                            <label className="block text-xs font-medium text-gray-500 uppercase mb-1">
                              {articulo.tieneDuplicadosAltaConfianza ? "⚠️ Duplicado Detectado" : "Posibles Duplicados"}
                            </label>
                            <div className={`text-sm p-2 rounded-md ${articulo.tieneDuplicadosAltaConfianza ? "bg-red-50 text-red-600" : "bg-amber-50 text-amber-600"}`}>
                              <ul className="list-disc list-inside space-y-1">
                                {articulo.posiblesDuplicados.map((dup: any) => (
                                  <li key={dup.id} className="leading-tight">
                                    <span className="font-medium">{dup.nombre}</span>
                                    {dup.nivelConfianza && (
                                      <div className="text-xs ml-4 mt-1 mb-2">
                                        <span className="inline-block px-2 py-1 rounded bg-white bg-opacity-50">
                                          Confianza: {renderConfianza(dup.nivelConfianza)}
                                        </span>
                                        <br />
                                        <span>{dup.razonDuplicado}</span>
                                      </div>
                                    )}
                                  </li>
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
                </div>
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