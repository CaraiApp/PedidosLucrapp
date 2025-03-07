-- Script para actualizar la tabla listas_compra y asegurar que tenga todas las columnas necesarias

-- Primero verificamos si la tabla existe, si no, la creamos
CREATE TABLE IF NOT EXISTS listas_compra (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  usuario_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  nombre TEXT,
  fecha_creacion TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Ahora añadimos las columnas que podrían faltar, solo si no existen
DO $$
BEGIN
  -- Columna: proveedor_id
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'listas_compra' AND column_name = 'proveedor_id') THEN
    ALTER TABLE listas_compra ADD COLUMN proveedor_id UUID REFERENCES proveedores(id) ON DELETE SET NULL;
  END IF;

  -- Columna: fecha_envio
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'listas_compra' AND column_name = 'fecha_envio') THEN
    ALTER TABLE listas_compra ADD COLUMN fecha_envio TIMESTAMP WITH TIME ZONE;
  END IF;

  -- Columna: estado (con valores: borrador, enviada, completada, cancelada)
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'listas_compra' AND column_name = 'estado') THEN
    ALTER TABLE listas_compra ADD COLUMN estado TEXT DEFAULT 'borrador';
    -- Agregar restricción de valores permitidos
    ALTER TABLE listas_compra ADD CONSTRAINT listas_compra_estado_check 
    CHECK (estado IN ('borrador', 'enviada', 'completada', 'cancelada'));
  END IF;

  -- Columna: notas
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'listas_compra' AND column_name = 'notas') THEN
    ALTER TABLE listas_compra ADD COLUMN notas TEXT;
  END IF;

  -- Columna: total
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'listas_compra' AND column_name = 'total') THEN
    ALTER TABLE listas_compra ADD COLUMN total DECIMAL(10, 2);
  END IF;

  -- Añadir nombres alternativos para compatibilidad
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'listas_compra' AND column_name = 'nombre_lista') THEN
    ALTER TABLE listas_compra ADD COLUMN nombre_lista TEXT;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'listas_compra' AND column_name = 'title') THEN
    ALTER TABLE listas_compra ADD COLUMN title TEXT;
  END IF;

  -- Asegurarse de que usuario_id sea NOT NULL
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'listas_compra' 
    AND column_name = 'usuario_id' 
    AND is_nullable = 'YES'
  ) THEN
    ALTER TABLE listas_compra ALTER COLUMN usuario_id SET NOT NULL;
  END IF;

  -- Asegurarse de que al menos un campo de nombre no sea NULL
  -- Hacemos nombre opcional porque ahora tenemos alternatives
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'listas_compra' 
    AND column_name = 'nombre' 
    AND is_nullable = 'NO'
  ) THEN
    ALTER TABLE listas_compra ALTER COLUMN nombre DROP NOT NULL;
  END IF;

END $$;

-- Crear tabla de items de lista de compra si no existe
CREATE TABLE IF NOT EXISTS items_lista_compra (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  lista_id UUID NOT NULL REFERENCES listas_compra(id) ON DELETE CASCADE,
  articulo_id UUID REFERENCES articulos(id) ON DELETE SET NULL,
  cantidad DECIMAL(10, 2) NOT NULL DEFAULT 1,
  precio_unitario DECIMAL(10, 2),
  unidad TEXT,
  notas TEXT,
  completado BOOLEAN DEFAULT FALSE
);

-- Crear índices para mejorar el rendimiento
CREATE INDEX IF NOT EXISTS idx_listas_compra_usuario_id ON listas_compra(usuario_id);
CREATE INDEX IF NOT EXISTS idx_listas_compra_proveedor_id ON listas_compra(proveedor_id);
CREATE INDEX IF NOT EXISTS idx_items_lista_compra_lista_id ON items_lista_compra(lista_id);
CREATE INDEX IF NOT EXISTS idx_items_lista_compra_articulo_id ON items_lista_compra(articulo_id);

-- Asegurarnos de que ambas tablas tienen habilitado Row Level Security
ALTER TABLE listas_compra ENABLE ROW LEVEL SECURITY;
ALTER TABLE items_lista_compra ENABLE ROW LEVEL SECURITY;

-- Crear o reemplazar políticas de seguridad para listas_compra
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

-- Crear o reemplazar políticas de seguridad para items_lista_compra
DROP POLICY IF EXISTS "Acceso a items_lista_compra a través de listas_compra" ON items_lista_compra;
CREATE POLICY "Acceso a items_lista_compra a través de listas_compra" ON items_lista_compra
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM listas_compra WHERE id = lista_id AND usuario_id = auth.uid()
    )
  );

-- Crear vista para calcular total de las listas
CREATE OR REPLACE VIEW vista_totales_listas AS
SELECT 
  l.id as lista_id,
  SUM(i.cantidad * COALESCE(i.precio_unitario, a.precio, 0)) as total
FROM 
  listas_compra l
LEFT JOIN 
  items_lista_compra i ON l.id = i.lista_id
LEFT JOIN 
  articulos a ON i.articulo_id = a.id
GROUP BY 
  l.id;

-- Función para actualizar automáticamente el total de la lista
CREATE OR REPLACE FUNCTION actualizar_total_lista()
RETURNS TRIGGER AS $$
DECLARE
  nuevo_total DECIMAL(10, 2);
BEGIN
  SELECT total INTO nuevo_total
  FROM vista_totales_listas
  WHERE lista_id = NEW.lista_id OR lista_id = OLD.lista_id;
  
  UPDATE listas_compra
  SET total = COALESCE(nuevo_total, 0)
  WHERE id = NEW.lista_id OR id = OLD.lista_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Disparador (trigger) para actualizar el total cuando se modifica un item
DROP TRIGGER IF EXISTS trigger_actualizar_total ON items_lista_compra;
CREATE TRIGGER trigger_actualizar_total
AFTER INSERT OR UPDATE OR DELETE ON items_lista_compra
FOR EACH ROW
EXECUTE FUNCTION actualizar_total_lista();