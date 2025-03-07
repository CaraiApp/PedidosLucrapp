-- Script para verificar la estructura actual de la tabla listas_compra
SELECT 
  column_name, 
  data_type, 
  is_nullable
FROM 
  information_schema.columns 
WHERE 
  table_name = 'listas_compra'
ORDER BY 
  ordinal_position;