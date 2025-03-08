// Interfaces principales para la aplicación

// Tipos relacionados con usuarios
export interface Usuario {
  id: string;
  email: string;
  username: string;
  nombre?: string;
  apellidos?: string;
  telefono?: string;
  empresa?: string;  // Aquí guardamos el nombre de la empresa/razón social
  created_at: string;
  membresia_activa?: MembresiasUsuario;
  membresia_activa_id?: string;
  // Campos de facturación
  razon_social?: string;
  cif?: string;
  direccion_fiscal?: string;
  codigo_postal?: string;
  ciudad?: string;
  provincia?: string;
  pais?: string;
  // Campos adicionales que pueden estar en profileData
  direccion?: string;
  nombre_empresa?: string;
  email_facturacion?: string;
}

export interface DatosFacturacion {
  id: string;
  usuario_id: string;
  nombre_empresa: string;
  cif: string;
  direccion: string;
  codigo_postal?: string;
  ciudad?: string;
  provincia?: string;
  pais?: string;
  telefono?: string;
  email_facturacion?: string;
}

export interface MembresiasUsuario {
  id: string;
  usuario_id: string;
  tipo_membresia_id: string;
  fecha_inicio: string;
  fecha_fin: string;
  estado: string;
  tipo_membresia: TipoMembresia;
  stripe_subscription_id?: string;
}

export interface TipoMembresia {
  id: string;
  nombre: string;
  descripcion?: string;
  precio: number;
  duracion_meses: number;
  limite_proveedores: number | null;
  limite_articulos: number | null;
  limite_listas: number | null;
  orden?: number;
  activo?: boolean;
  stripe_price_id?: string;
  tiene_ai?: boolean; // Indica si el plan tiene acceso a funciones de IA
  // Removido: es_destacado?: boolean; - No existe en la base de datos
}

// Tipos relacionados con proveedores
export interface Proveedor {
  id: string;
  usuario_id: string;
  nombre: string;
  cif?: string;        // CIF/NIF/VAT del proveedor
  telefono?: string;
  email?: string;
  web?: string;
  contacto?: string;
  direccion?: string;
  notas?: string;
  created_at: string;
}

// Unidades de compra
export interface Unidad {
  id: string;
  nombre: string;
  abreviatura?: string;
  created_at?: string;
}

// Tipos relacionados con artículos
export interface Articulo {
  id: string;
  usuario_id: string;
  proveedor_id: string;
  nombre: string;
  descripcion?: string;
  precio?: number;
  unidad_id?: string;
  unidad?: Unidad;
  sku?: string;
  imagen_url?: string;
  // Los campos de stock se ocultan de la interfaz, pero se mantienen en el modelo
  // stock_actual?: number;
  // stock_minimo?: number;
  activo?: boolean;
  created_at: string;
  proveedor?: Proveedor;
  categorias?: Categoria[];
}

// Tipos relacionados con categorías
export interface Categoria {
  id: string;
  usuario_id: string;
  nombre: string;
  descripcion?: string;
  created_at: string;
}

// Tipos relacionados con listas de compra
export interface ListaCompra {
  id: string;
  usuario_id: string;
  nombre?: string;
  nombre_lista?: string;
  title?: string;
  fecha_creacion: string;
  estado: 'borrador' | 'enviada' | 'completada' | 'cancelada';
  proveedor_id?: string;
  fecha_envio?: string;
  notas?: string;
  total?: number;
  items?: ItemListaCompra[];
  proveedor?: Proveedor;
  numero_articulos?: number; // Para mostrar el contador en la lista
}

export interface ItemListaCompra {
  id: string;
  lista_id: string;
  articulo_id: string;
  cantidad: number;
  precio_unitario?: number;
  unidad?: string;
  notas?: string;
  completado?: boolean;
  articulo?: Articulo;
}

// Estadísticas de uso
export interface EstadisticasUso {
  totalProveedores: number;
  totalArticulos: number;
  totalListas: number;
  membresia: {
    id: string;
    tipo_id: string;
    nombre: string;
    limiteProveedores: number;
    limiteArticulos: number;
    limiteListas: number;
    fechaInicio: string;
    fechaFin: string;
  };
}

// Tipos de errores
export interface SupabaseError {
  message: string;
  details?: string;
  hint?: string;
  code?: string;
}

// Tipo para mensajes de feedback al usuario
export interface Mensaje {
  texto: string;
  tipo: 'exito' | 'error' | 'info' | 'advertencia' | 'success';
  // 'success' añadido para compatibilidad con los componentes nuevos
}

// Declaration for next-pwa
declare module 'next-pwa';