-- Script para reparar la relación entre usuario y membresía premium
-- Este script verifica y corrige cualquier problema en la relación entre 
-- el usuario especificado y su membresía premium con IA

-- Primero, veamos el estado actual del usuario
SELECT 
    u.id, 
    u.email, 
    u.membresia_activa_id,
    mu.id AS id_membresia_actual,
    mu.tipo_membresia_id
FROM usuarios u
LEFT JOIN membresias_usuarios mu ON u.membresia_activa_id = mu.id
WHERE u.id = 'def38ca4-63a6-4ce1-8dbd-32abda08a14c';

-- Ahora, busquemos todas las membresías existentes del usuario
SELECT 
    id, 
    tipo_membresia_id,
    estado,
    fecha_inicio,
    fecha_fin
FROM membresias_usuarios
WHERE usuario_id = 'def38ca4-63a6-4ce1-8dbd-32abda08a14c'
ORDER BY fecha_inicio DESC;

-- Buscar específicamente membresías premium (con IA)
SELECT 
    mu.id,
    mu.usuario_id,
    mu.tipo_membresia_id,
    mu.estado,
    mu.fecha_inicio,
    mu.fecha_fin,
    mt.nombre,
    mt.tiene_ai
FROM membresias_usuarios mu
JOIN membresia_tipos mt ON mu.tipo_membresia_id = mt.id
WHERE mu.usuario_id = 'def38ca4-63a6-4ce1-8dbd-32abda08a14c'
  AND mt.tiene_ai = true
ORDER BY mu.fecha_inicio DESC;

-- Crear una membresía premium si no existe
DO $$ 
DECLARE
    premium_membership_exists BOOLEAN;
    premium_membership_id UUID;
BEGIN
    -- Comprobar si ya existe una membresía premium
    SELECT EXISTS (
        SELECT 1 
        FROM membresias_usuarios mu
        JOIN membresia_tipos mt ON mu.tipo_membresia_id = mt.id
        WHERE mu.usuario_id = 'def38ca4-63a6-4ce1-8dbd-32abda08a14c'
          AND mt.tiene_ai = true
          AND mu.estado = 'activa'
    ) INTO premium_membership_exists;
    
    IF NOT premium_membership_exists THEN
        -- Crear nueva membresía premium
        INSERT INTO membresias_usuarios (
            usuario_id,
            tipo_membresia_id,
            fecha_inicio,
            fecha_fin,
            estado
        ) VALUES (
            'def38ca4-63a6-4ce1-8dbd-32abda08a14c',
            '9e6ecc49-90a9-4952-8a00-55b12cd39df1',
            CURRENT_TIMESTAMP,
            CURRENT_TIMESTAMP + INTERVAL '1 year',
            'activa'
        )
        RETURNING id INTO premium_membership_id;
        
        RAISE NOTICE 'Creada nueva membresía premium con ID: %', premium_membership_id;
    ELSE
        -- Obtener ID de la membresía premium existente
        SELECT mu.id INTO premium_membership_id
        FROM membresias_usuarios mu
        JOIN membresia_tipos mt ON mu.tipo_membresia_id = mt.id
        WHERE mu.usuario_id = 'def38ca4-63a6-4ce1-8dbd-32abda08a14c'
          AND mt.tiene_ai = true
          AND mu.estado = 'activa'
        ORDER BY mu.fecha_inicio DESC
        LIMIT 1;
        
        RAISE NOTICE 'Usando membresía premium existente con ID: %', premium_membership_id;
    END IF;
    
    -- Actualizar el campo membresia_activa_id del usuario
    UPDATE usuarios
    SET membresia_activa_id = premium_membership_id
    WHERE id = 'def38ca4-63a6-4ce1-8dbd-32abda08a14c';
    
    RAISE NOTICE 'Usuario actualizado correctamente con membresía premium';
END $$;

-- Verificar el resultado final
SELECT 
    u.id, 
    u.email, 
    u.membresia_activa_id,
    mu.tipo_membresia_id,
    mt.nombre AS tipo_membresia,
    mt.tiene_ai
FROM usuarios u
LEFT JOIN membresias_usuarios mu ON u.membresia_activa_id = mu.id
LEFT JOIN membresia_tipos mt ON mu.tipo_membresia_id = mt.id
WHERE u.id = 'def38ca4-63a6-4ce1-8dbd-32abda08a14c';