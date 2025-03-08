-- Script para limpiar membresías de un usuario
-- 1. Desactiva todas las membresías anteriores
-- 2. Deja activa solo la más reciente
-- 3. Actualiza la referencia en el usuario

-- ID del usuario a limpiar
\set usuario_id '\'def38ca4-63a6-4ce1-8dbd-32abda08a14c\''

-- Primero, veamos todas las membresías del usuario
SELECT 
    id, 
    tipo_membresia_id, 
    estado, 
    fecha_inicio, 
    fecha_fin
FROM membresias_usuarios
WHERE usuario_id = :usuario_id
ORDER BY fecha_inicio DESC;

-- Desactivar todas las membresías antiguas (todas excepto la más reciente)
WITH membresiasMasReciente AS (
    SELECT id
    FROM membresias_usuarios
    WHERE usuario_id = :usuario_id
      AND estado = 'activa'
    ORDER BY fecha_inicio DESC
    LIMIT 1
)
UPDATE membresias_usuarios
SET estado = 'inactiva'
WHERE usuario_id = :usuario_id
  AND estado = 'activa'
  AND id NOT IN (SELECT id FROM membresiasMasReciente);

-- Verificar que ahora solo hay una membresía activa
SELECT 
    id, 
    tipo_membresia_id, 
    estado, 
    fecha_inicio, 
    fecha_fin
FROM membresias_usuarios
WHERE usuario_id = :usuario_id
  AND estado = 'activa'
ORDER BY fecha_inicio DESC;

-- Obtener el ID de la membresía activa
DO $$$
DECLARE
    membresia_activa_id UUID;
BEGIN
    -- Encontrar la membresía activa más reciente
    SELECT id INTO membresia_activa_id
    FROM membresias_usuarios
    WHERE usuario_id = :usuario_id
      AND estado = 'activa'
    ORDER BY fecha_inicio DESC
    LIMIT 1;
    
    IF membresia_activa_id IS NULL THEN
        RAISE NOTICE 'No se encontró ninguna membresía activa para el usuario. No se actualizará.';
    ELSE
        -- Actualizar la referencia en el usuario
        UPDATE usuarios
        SET membresia_activa_id = membresia_activa_id
        WHERE id = :usuario_id;
        
        RAISE NOTICE 'Usuario actualizado con membresía activa: %', membresia_activa_id;
    END IF;
END $$;

-- Verificar el estado final
SELECT 
    u.id AS usuario_id, 
    u.email, 
    u.membresia_activa_id,
    mu.estado AS estado_membresia,
    mu.fecha_inicio,
    mu.fecha_fin,
    mt.nombre AS tipo_membresia,
    mt.tiene_ai
FROM usuarios u
LEFT JOIN membresias_usuarios mu ON u.membresia_activa_id = mu.id
LEFT JOIN membresia_tipos mt ON mu.tipo_membresia_id = mt.id
WHERE u.id = :usuario_id;