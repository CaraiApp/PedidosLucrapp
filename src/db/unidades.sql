-- Crear tabla de unidades de compra
CREATE TABLE IF NOT EXISTS public.unidades (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre TEXT NOT NULL,
  abreviatura TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insertar unidades de compra predefinidas
INSERT INTO public.unidades (nombre, abreviatura) VALUES
('Unidades', 'uds'),
('Kilogramos', 'kg'),
('Gramos', 'g'),
('Litros', 'l'),
('Mililitros', 'ml'),
('Cajas', 'caj'),
('Paquetes', 'paq'),
('Docenas', 'doc'),
('Metros', 'm'),
('Metros cuadrados', 'm²');

-- Modificar la tabla de artículos para usar una referencia a unidades
-- Separamos los comandos ALTER TABLE para evitar errores de sintaxis
ALTER TABLE public.articulos DROP COLUMN IF EXISTS unidad;
ALTER TABLE public.articulos ADD COLUMN unidad_id UUID REFERENCES public.unidades(id) ON DELETE SET NULL;

-- Ocultar campos de stock estableciéndolos a valores por defecto
-- Separamos cada ALTER COLUMN en su propia instrucción
ALTER TABLE public.articulos ALTER COLUMN stock_actual SET DEFAULT 0;
ALTER TABLE public.articulos ALTER COLUMN stock_minimo SET DEFAULT 0;