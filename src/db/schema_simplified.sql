-- Simplified Schema para Lucrapp
-- Ejecutar este script en Supabase SQL Editor para crear solo las tablas esenciales

-- Tabla de Proveedores
CREATE TABLE IF NOT EXISTS public.proveedores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  nombre TEXT NOT NULL,
  email TEXT,
  telefono TEXT,
  contacto TEXT,
  direccion TEXT,
  notas TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabla de Artículos
CREATE TABLE IF NOT EXISTS public.articulos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  proveedor_id UUID REFERENCES public.proveedores(id) ON DELETE SET NULL,
  nombre TEXT NOT NULL,
  descripcion TEXT,
  precio DECIMAL(10, 2),
  unidad TEXT,
  sku TEXT,
  imagen_url TEXT,
  stock_actual INTEGER DEFAULT 0,
  stock_minimo INTEGER DEFAULT 0,
  activo BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Políticas de RLS para Proveedores (row level security)
ALTER TABLE public.proveedores ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Los usuarios pueden ver sus propios proveedores" ON public.proveedores;
CREATE POLICY "Los usuarios pueden ver sus propios proveedores" ON public.proveedores
  FOR SELECT
  USING (auth.uid() = usuario_id);

DROP POLICY IF EXISTS "Los usuarios pueden insertar sus propios proveedores" ON public.proveedores;
CREATE POLICY "Los usuarios pueden insertar sus propios proveedores" ON public.proveedores
  FOR INSERT
  WITH CHECK (auth.uid() = usuario_id);

DROP POLICY IF EXISTS "Los usuarios pueden actualizar sus propios proveedores" ON public.proveedores;
CREATE POLICY "Los usuarios pueden actualizar sus propios proveedores" ON public.proveedores
  FOR UPDATE
  USING (auth.uid() = usuario_id);

DROP POLICY IF EXISTS "Los usuarios pueden eliminar sus propios proveedores" ON public.proveedores;
CREATE POLICY "Los usuarios pueden eliminar sus propios proveedores" ON public.proveedores
  FOR DELETE
  USING (auth.uid() = usuario_id);

-- Políticas de RLS para Artículos
ALTER TABLE public.articulos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Los usuarios pueden ver sus propios artículos" ON public.articulos;
CREATE POLICY "Los usuarios pueden ver sus propios artículos" ON public.articulos
  FOR SELECT
  USING (auth.uid() = usuario_id);

DROP POLICY IF EXISTS "Los usuarios pueden insertar sus propios artículos" ON public.articulos;
CREATE POLICY "Los usuarios pueden insertar sus propios artículos" ON public.articulos
  FOR INSERT
  WITH CHECK (auth.uid() = usuario_id);

DROP POLICY IF EXISTS "Los usuarios pueden actualizar sus propios artículos" ON public.articulos;
CREATE POLICY "Los usuarios pueden actualizar sus propios artículos" ON public.articulos
  FOR UPDATE
  USING (auth.uid() = usuario_id);

DROP POLICY IF EXISTS "Los usuarios pueden eliminar sus propios artículos" ON public.articulos;
CREATE POLICY "Los usuarios pueden eliminar sus propios artículos" ON public.articulos
  FOR DELETE
  USING (auth.uid() = usuario_id);

-- Índices para mejorar el rendimiento
CREATE INDEX IF NOT EXISTS idx_proveedores_usuario_id ON public.proveedores(usuario_id);
CREATE INDEX IF NOT EXISTS idx_articulos_usuario_id ON public.articulos(usuario_id);
CREATE INDEX IF NOT EXISTS idx_articulos_proveedor_id ON public.articulos(proveedor_id);