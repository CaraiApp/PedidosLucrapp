-- Script simplificado para crear y configurar unidades
-- Ejecuta cada bloque por separado para evitar errores

-- 1. Primero, crear la tabla de unidades
CREATE TABLE IF NOT EXISTS public.unidades (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre TEXT NOT NULL,
  abreviatura TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Insertar unidades de compra predefinidas (ejecutar después de crear la tabla)
INSERT INTO public.unidades (nombre, abreviatura) VALUES
('Unidades', 'uds');

INSERT INTO public.unidades (nombre, abreviatura) VALUES
('Kilogramos', 'kg');

INSERT INTO public.unidades (nombre, abreviatura) VALUES
('Gramos', 'g');

INSERT INTO public.unidades (nombre, abreviatura) VALUES
('Litros', 'l');

INSERT INTO public.unidades (nombre, abreviatura) VALUES
('Mililitros', 'ml');

INSERT INTO public.unidades (nombre, abreviatura) VALUES
('Cajas', 'caj');

INSERT INTO public.unidades (nombre, abreviatura) VALUES
('Paquetes', 'paq');

INSERT INTO public.unidades (nombre, abreviatura) VALUES
('Docenas', 'doc');

-- 3. Comprobar si la columna 'unidad' existe y eliminarla si es necesario
-- (Ejecutar después de verificar que existe)
ALTER TABLE public.articulos DROP COLUMN IF EXISTS unidad;

-- 4. Añadir la nueva columna unidad_id (ejecutar después de eliminar 'unidad')
ALTER TABLE public.articulos ADD COLUMN unidad_id UUID 
REFERENCES public.unidades(id) ON DELETE SET NULL;

-- 5. Configurar valores por defecto para stock_actual
ALTER TABLE public.articulos ALTER COLUMN stock_actual SET DEFAULT 0;

-- 6. Configurar valores por defecto para stock_minimo
ALTER TABLE public.articulos ALTER COLUMN stock_minimo SET DEFAULT 0;