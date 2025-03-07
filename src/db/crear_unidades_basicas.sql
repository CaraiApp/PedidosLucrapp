-- Script para crear tabla de unidades y modificar tabla de artículos
-- Ejecutar cada paso por separado para evitar errores

-- 1. Crear tabla de unidades
CREATE TABLE IF NOT EXISTS public.unidades (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre TEXT NOT NULL,
  abreviatura TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Insertar unidades básicas solicitadas
-- Insertar solo las unidades solicitadas: unidades, kg, cajas
INSERT INTO public.unidades (nombre, abreviatura) VALUES ('Unidades', 'uds');
INSERT INTO public.unidades (nombre, abreviatura) VALUES ('Kilogramos', 'kg');
INSERT INTO public.unidades (nombre, abreviatura) VALUES ('Cajas', 'caj');

-- 3. Modificar la tabla articulos - Eliminar columna unidad
ALTER TABLE public.articulos DROP COLUMN IF EXISTS unidad;

-- 4. Añadir la columna unidad_id como referencia a la tabla unidades
ALTER TABLE public.articulos ADD COLUMN unidad_id UUID 
REFERENCES public.unidades(id) ON DELETE SET NULL;