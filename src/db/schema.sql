-- Schema para Lucrapp
-- Ejecutar este script en Supabase SQL Editor

-- Tabla de Proveedores (corregida para incluir contacto)
CREATE TABLE IF NOT EXISTS proveedores (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  usuario_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  nombre TEXT NOT NULL,
  email TEXT,
  telefono TEXT,
  web TEXT,
  direccion TEXT,
  contacto TEXT, -- Añadida la columna contacto
  notas TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabla de Artículos
CREATE TABLE IF NOT EXISTS articulos (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  usuario_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  proveedor_id UUID REFERENCES proveedores(id) ON DELETE SET NULL,
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

-- Tabla de Categorías
CREATE TABLE IF NOT EXISTS categorias (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  usuario_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  nombre TEXT NOT NULL,
  descripcion TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabla de relación entre Artículos y Categorías
CREATE TABLE IF NOT EXISTS articulos_categorias (
  articulo_id UUID REFERENCES articulos(id) ON DELETE CASCADE,
  categoria_id UUID REFERENCES categorias(id) ON DELETE CASCADE,
  PRIMARY KEY (articulo_id, categoria_id)
);

-- Tabla de Listas de Compra
CREATE TABLE IF NOT EXISTS listas_compra (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  usuario_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  nombre TEXT NOT NULL,
  proveedor_id UUID REFERENCES proveedores(id) ON DELETE SET NULL,
  fecha_creacion TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  fecha_envio TIMESTAMP WITH TIME ZONE,
  estado TEXT DEFAULT 'borrador' CHECK (estado IN ('borrador', 'enviada', 'completada', 'cancelada')),
  notas TEXT,
  total DECIMAL(10, 2)
);

-- Tabla de Items de Lista de Compra
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

-- Políticas de RLS para Proveedores
ALTER TABLE proveedores ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Los usuarios pueden ver sus propios proveedores" ON proveedores;
CREATE POLICY "Los usuarios pueden ver sus propios proveedores" ON proveedores
  FOR SELECT
  USING (auth.uid() = usuario_id);

DROP POLICY IF EXISTS "Los usuarios pueden insertar sus propios proveedores" ON proveedores;
CREATE POLICY "Los usuarios pueden insertar sus propios proveedores" ON proveedores
  FOR INSERT
  WITH CHECK (auth.uid() = usuario_id);

DROP POLICY IF EXISTS "Los usuarios pueden actualizar sus propios proveedores" ON proveedores;
CREATE POLICY "Los usuarios pueden actualizar sus propios proveedores" ON proveedores
  FOR UPDATE
  USING (auth.uid() = usuario_id);

DROP POLICY IF EXISTS "Los usuarios pueden eliminar sus propios proveedores" ON proveedores;
CREATE POLICY "Los usuarios pueden eliminar sus propios proveedores" ON proveedores
  FOR DELETE
  USING (auth.uid() = usuario_id);

-- Políticas de RLS para Artículos
ALTER TABLE articulos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Los usuarios pueden ver sus propios artículos" ON articulos;
CREATE POLICY "Los usuarios pueden ver sus propios artículos" ON articulos
  FOR SELECT
  USING (auth.uid() = usuario_id);

DROP POLICY IF EXISTS "Los usuarios pueden insertar sus propios artículos" ON articulos;
CREATE POLICY "Los usuarios pueden insertar sus propios artículos" ON articulos
  FOR INSERT
  WITH CHECK (auth.uid() = usuario_id);

DROP POLICY IF EXISTS "Los usuarios pueden actualizar sus propios artículos" ON articulos;
CREATE POLICY "Los usuarios pueden actualizar sus propios artículos" ON articulos
  FOR UPDATE
  USING (auth.uid() = usuario_id);

DROP POLICY IF EXISTS "Los usuarios pueden eliminar sus propios artículos" ON articulos;
CREATE POLICY "Los usuarios pueden eliminar sus propios artículos" ON articulos
  FOR DELETE
  USING (auth.uid() = usuario_id);

-- Políticas de RLS para Categorías
ALTER TABLE categorias ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Los usuarios pueden ver sus propias categorías" ON categorias;
CREATE POLICY "Los usuarios pueden ver sus propias categorías" ON categorias
  FOR SELECT
  USING (auth.uid() = usuario_id);

DROP POLICY IF EXISTS "Los usuarios pueden insertar sus propias categorías" ON categorias;
CREATE POLICY "Los usuarios pueden insertar sus propias categorías" ON categorias
  FOR INSERT
  WITH CHECK (auth.uid() = usuario_id);

DROP POLICY IF EXISTS "Los usuarios pueden actualizar sus propias categorías" ON categorias;
CREATE POLICY "Los usuarios pueden actualizar sus propias categorías" ON categorias
  FOR UPDATE
  USING (auth.uid() = usuario_id);

DROP POLICY IF EXISTS "Los usuarios pueden eliminar sus propias categorías" ON categorias;
CREATE POLICY "Los usuarios pueden eliminar sus propias categorías" ON categorias
  FOR DELETE
  USING (auth.uid() = usuario_id);

-- Políticas de RLS para articulos_categorias
ALTER TABLE articulos_categorias ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Acceso a articulos_categorias a través de artículos y categorías" ON articulos_categorias;
CREATE POLICY "Acceso a articulos_categorias a través de artículos y categorías" ON articulos_categorias
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM articulos WHERE id = articulo_id AND usuario_id = auth.uid()
    ) OR
    EXISTS (
      SELECT 1 FROM categorias WHERE id = categoria_id AND usuario_id = auth.uid()
    )
  );

-- Políticas de RLS para Listas de Compra
ALTER TABLE listas_compra ENABLE ROW LEVEL SECURITY;

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

-- Políticas de RLS para Items de Lista de Compra
ALTER TABLE items_lista_compra ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Acceso a items_lista_compra a través de listas_compra" ON items_lista_compra;
CREATE POLICY "Acceso a items_lista_compra a través de listas_compra" ON items_lista_compra
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM listas_compra WHERE id = lista_id AND usuario_id = auth.uid()
    )
  );

-- Vista para obtener los totales de listas de compra
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

-- Función para actualizar el total de una lista de compra
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

-- Disparador para actualizar el total cuando se modifica un item
DROP TRIGGER IF EXISTS trigger_actualizar_total ON items_lista_compra;
CREATE TRIGGER trigger_actualizar_total
AFTER INSERT OR UPDATE OR DELETE ON items_lista_compra
FOR EACH ROW
EXECUTE FUNCTION actualizar_total_lista();

-- Índices para mejorar el rendimiento
CREATE INDEX IF NOT EXISTS idx_proveedores_usuario_id ON proveedores(usuario_id);
CREATE INDEX IF NOT EXISTS idx_articulos_usuario_id ON articulos(usuario_id);
CREATE INDEX IF NOT EXISTS idx_articulos_proveedor_id ON articulos(proveedor_id);
CREATE INDEX IF NOT EXISTS idx_categorias_usuario_id ON categorias(usuario_id);
CREATE INDEX IF NOT EXISTS idx_listas_compra_usuario_id ON listas_compra(usuario_id);
CREATE INDEX IF NOT EXISTS idx_listas_compra_proveedor_id ON listas_compra(proveedor_id);
CREATE INDEX IF NOT EXISTS idx_items_lista_compra_lista_id ON items_lista_compra(lista_id);
CREATE INDEX IF NOT EXISTS idx_items_lista_compra_articulo_id ON items_lista_compra(articulo_id);