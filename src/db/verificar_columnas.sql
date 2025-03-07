-- Script para verificar columnas existentes

-- Verificar las columnas existentes en la tabla artículos
SELECT 
  column_name, 
  data_type, 
  is_nullable,
  column_default
FROM 
  information_schema.columns
WHERE 
  table_schema = 'public' 
  AND table_name = 'articulos'
ORDER BY 
  ordinal_position;

-- Comprobar si existe la tabla de unidades
SELECT EXISTS (
  SELECT FROM information_schema.tables 
  WHERE table_schema = 'public' 
  AND table_name = 'unidades'
) AS tabla_unidades_existe;

-- Comprobar si existen datos en la tabla unidades (si existe)
SELECT count(*) FROM public.unidades;