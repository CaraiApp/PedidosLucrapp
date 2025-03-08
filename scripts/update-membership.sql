-- Este script actualiza manualmente la membresía de un usuario a Premium con IA
-- Reemplaza los valores si es necesario

-- Variables (ajusta según tus necesidades)
-- ID del usuario
\set usuario_id '\'def38ca4-63a6-4ce1-8dbd-32abda08a14c\''
-- ID de membresía premium (Plan con IA)
\set tipo_membresia_premium '\'9e6ecc49-90a9-4952-8a00-55b12cd39df1\''

-- 1. Primero, verifica si ya existe una membresía premium para el usuario
DO $$$
DECLARE
    existing_membership_id UUID;
    new_membership_id UUID;
BEGIN
    -- Buscar una membresía existente premium para el usuario
    SELECT id INTO existing_membership_id
    FROM membresias_usuarios
    WHERE usuario_id = :usuario_id
    AND tipo_membresia_id = :tipo_membresia_premium
    AND estado = 'activa';

    -- Si no existe una membresía premium, crear una nueva
    IF existing_membership_id IS NULL THEN
        -- Insertar nueva membresía
        INSERT INTO membresias_usuarios (
            usuario_id,
            tipo_membresia_id,
            fecha_inicio,
            fecha_fin,
            estado
        ) VALUES (
            :usuario_id,
            :tipo_membresia_premium,
            CURRENT_TIMESTAMP,
            CURRENT_TIMESTAMP + INTERVAL '1 year',
            'activa'
        )
        RETURNING id INTO new_membership_id;
        
        RAISE NOTICE 'Nueva membresía creada con ID: %', new_membership_id;
        
        -- Actualizar la membresía activa del usuario
        UPDATE usuarios
        SET membresia_activa_id = new_membership_id
        WHERE id = :usuario_id;
        
        RAISE NOTICE 'Actualizada referencia de membresía activa en usuario';
    ELSE
        RAISE NOTICE 'Usando membresía existente con ID: %', existing_membership_id;
        
        -- Actualizar la membresía activa del usuario
        UPDATE usuarios
        SET membresia_activa_id = existing_membership_id
        WHERE id = :usuario_id;
        
        RAISE NOTICE 'Actualizada referencia de membresía activa en usuario';
    END IF;
END $$;

-- Verificar que el usuario tenga ahora la membresía correcta
SELECT 
    u.id AS usuario_id, 
    u.email, 
    u.membresia_activa_id,
    mu.tipo_membresia_id,
    mt.nombre AS tipo_membresia_nombre,
    mt.tiene_ai
FROM usuarios u
LEFT JOIN membresias_usuarios mu ON u.membresia_activa_id = mu.id
LEFT JOIN membresia_tipos mt ON mu.tipo_membresia_id = mt.id
WHERE u.id = :usuario_id;