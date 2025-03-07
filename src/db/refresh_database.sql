-- Script para forzar la actualización del caché y refrescar la base de datos
-- Ejecuta esto como administrador en Supabase SQL Editor

-- Lista todas las extensiones disponibles
SELECT * FROM pg_available_extensions;

-- Reconstruir las tablas desde cero (CUIDADO: esto eliminará datos existentes)
-- Comentar si no quieres perder datos

-- 1. Eliminar tablas existentes
DROP TABLE IF EXISTS articulos CASCADE;
DROP TABLE IF EXISTS proveedores CASCADE;

-- 2. Crear tablas limpias (versión simplificada)

-- Tabla de Proveedores
CREATE TABLE IF NOT EXISTS public.proveedores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  nombre TEXT NOT NULL,
  email TEXT,
  telefono TEXT,
  direccion TEXT,
  notas TEXT,
  web TEXT,
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

-- 3. Políticas de RLS para Proveedores
ALTER TABLE public.proveedores ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "proveedores_select_policy" ON public.proveedores;
CREATE POLICY "proveedores_select_policy" ON public.proveedores
  FOR SELECT
  USING (auth.uid() = usuario_id);

DROP POLICY IF EXISTS "proveedores_insert_policy" ON public.proveedores;
CREATE POLICY "proveedores_insert_policy" ON public.proveedores
  FOR INSERT
  WITH CHECK (auth.uid() = usuario_id);

DROP POLICY IF EXISTS "proveedores_update_policy" ON public.proveedores;
CREATE POLICY "proveedores_update_policy" ON public.proveedores
  FOR UPDATE
  USING (auth.uid() = usuario_id);

DROP POLICY IF EXISTS "proveedores_delete_policy" ON public.proveedores;
CREATE POLICY "proveedores_delete_policy" ON public.proveedores
  FOR DELETE
  USING (auth.uid() = usuario_id);

-- 4. Políticas de RLS para Artículos
ALTER TABLE public.articulos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "articulos_select_policy" ON public.articulos;
CREATE POLICY "articulos_select_policy" ON public.articulos
  FOR SELECT
  USING (auth.uid() = usuario_id);

DROP POLICY IF EXISTS "articulos_insert_policy" ON public.articulos;
CREATE POLICY "articulos_insert_policy" ON public.articulos
  FOR INSERT
  WITH CHECK (auth.uid() = usuario_id);

DROP POLICY IF EXISTS "articulos_update_policy" ON public.articulos;
CREATE POLICY "articulos_update_policy" ON public.articulos
  FOR UPDATE
  USING (auth.uid() = usuario_id);

DROP POLICY IF EXISTS "articulos_delete_policy" ON public.articulos;
CREATE POLICY "articulos_delete_policy" ON public.articulos
  FOR DELETE
  USING (auth.uid() = usuario_id);

-- 5. Índices
CREATE INDEX IF NOT EXISTS idx_proveedores_usuario_id ON public.proveedores(usuario_id);
CREATE INDEX IF NOT EXISTS idx_articulos_usuario_id ON public.articulos(usuario_id);
CREATE INDEX IF NOT EXISTS idx_articulos_proveedor_id ON public.articulos(proveedor_id);

-- 6. Refrescar caché de esquema
NOTIFY pgrst, 'reload schema';