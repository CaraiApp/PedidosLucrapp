-- Script para corregir las columnas faltantes en la tabla listas_compra

-- Si no existe la tabla, la creamos con la estructura correcta
CREATE TABLE IF NOT EXISTS listas_compra (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  usuario_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT,
  estado TEXT DEFAULT 'borrador',
  fecha_creacion TIMESTAMP WITH TIME ZONE DEFAULT now(),
  notas TEXT
);

-- Crear índice para usuario_id
CREATE INDEX IF NOT EXISTS idx_listas_compra_usuario_id ON listas_compra(usuario_id);

-- Si la tabla ya existe, asegurarse de que tenga todas las columnas necesarias
ALTER TABLE listas_compra 
ADD COLUMN IF NOT EXISTS title TEXT,
ADD COLUMN IF NOT EXISTS estado TEXT DEFAULT 'borrador',
ADD COLUMN IF NOT EXISTS fecha_creacion TIMESTAMP WITH TIME ZONE DEFAULT now(),
ADD COLUMN IF NOT EXISTS notas TEXT;

-- Si la columna nombre existe y cause problemas, renombrarla (descomentar si es necesario)
-- ALTER TABLE listas_compra RENAME COLUMN nombre TO nombre_old;

-- Habilitar Row Level Security
ALTER TABLE listas_compra ENABLE ROW LEVEL SECURITY;

-- Crear políticas de seguridad para listas_compra
DROP POLICY IF EXISTS "Los usuarios pueden ver sus propias listas" ON listas_compra;
CREATE POLICY "Los usuarios pueden ver sus propias listas" ON listas_compra
  FOR SELECT
  USING (auth.uid() = usuario_id);

DROP POLICY IF EXISTS "Los usuarios pueden insertar sus propias listas" ON listas_compra;
CREATE POLICY "Los usuarios pueden insertar sus propias listas" ON listas_compra
  FOR INSERT
  WITH CHECK (auth.uid() = usuario_id);

DROP POLICY IF EXISTS "Los usuarios pueden actualizar sus propias listas" ON listas_compra;
CREATE POLICY "Los usuarios pueden actualizar sus propias listas" ON listas_compra
  FOR UPDATE
  USING (auth.uid() = usuario_id);

DROP POLICY IF EXISTS "Los usuarios pueden eliminar sus propias listas" ON listas_compra;
CREATE POLICY "Los usuarios pueden eliminar sus propias listas" ON listas_compra
  FOR DELETE
  USING (auth.uid() = usuario_id);