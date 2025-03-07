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
}

export interface DatosFacturacion {
  id: string;
  usuario_id: string;
  nombre_empresa: string;
  cif: string;
  direccion: string;
  codigo_postal?: string;
  ciudad?: string;
  pais?: string;
  telefono?: string;
  email_facturacion?: string;
}

export interface MembresiasUsuario {
  id: string;
  usuario_id: string;
  membresia_id: string;
  fecha_inicio: string;
  fecha_fin: string;
  estado: string;
  tipo_membresia: TipoMembresia;
}

export interface TipoMembresia {
  id: string;
  nombre: string;
  descripcion?: string;
  precio: number;
  periodo: string;
  limite_proveedores: number;
  limite_articulos: number;
  limite_listas: number;
  orden?: number;
  activo: boolean;
}

// Tipos relacionados con proveedores
export interface Proveedor {
  id: string;
  usuario_id: string;
  nombre: string;
  telefono?: string;
  email?: string;
  web?: string;
  direccion?: string;
  notas?: string;
  created_at: string;
}

// Tipos relacionados con artículos
export interface Articulo {
  id: string;
  usuario_id: string;
  proveedor_id: string;
  nombre: string;
  descripcion?: string;
  precio?: number;
  unidad?: string;
  sku?: string;
  created_at: string;
  proveedor?: Proveedor;
}

// Tipos relacionados con listas de compra
export interface ListaCompra {
  id: string;
  usuario_id: string;
  nombre: string;
  fecha_creacion: string;
  estado: 'borrador' | 'enviada' | 'completada' | 'cancelada';
  proveedor_id?: string;
  fecha_envio?: string;
  notas?: string;
  items?: ItemListaCompra[];
  proveedor?: Proveedor;
}

export interface ItemListaCompra {
  id: string;
  lista_id: string;
  articulo_id: string;
  cantidad: number;
  unidad?: string;
  notas?: string;
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
  tipo: 'exito' | 'error' | 'info' | 'advertencia';
}