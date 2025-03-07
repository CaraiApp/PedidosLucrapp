-- Script simple para agregar la columna title a la tabla listas_compra
ALTER TABLE listas_compra 
ADD COLUMN IF NOT EXISTS title TEXT;

-- También copiamos los valores de nombre a title para mantener compatibilidad
UPDATE listas_compra 
SET title = nombre 
WHERE title IS NULL AND nombre IS NOT NULL;