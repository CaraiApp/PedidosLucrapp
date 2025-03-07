-- Script para forzar la actualización del caché de esquema en Supabase
-- Ejecuta este script si tienes problemas con columnas que existen en la base de datos pero no son reconocidas

-- 1. Primero refrescamos el caché de la tabla proveedores
SELECT pg_catalog.pg_refresh_view('proveedores'::regclass);

-- 2. Refrescamos el caché de relaciones
SELECT schema_name FROM information_schema.schemata 
WHERE schema_name NOT LIKE 'pg_%' 
AND schema_name != 'information_schema';

-- 3. Mostramos la estructura de la tabla
SELECT column_name, data_type 
FROM information_schema.columns
WHERE table_name = 'proveedores' 
AND table_schema = 'public'
ORDER BY ordinal_position;