-- Script para marcar como inactivas las membresías caducadas
-- y actualizar la membresía activa del usuario si es necesario

-- 1. Marcar como inactivas las membresías caducadas
UPDATE membresias_usuarios
SET estado = 'caducada'
WHERE estado = 'activa'
  AND fecha_fin < CURRENT_TIMESTAMP;

-- 2. Verificar los usuarios afectados
WITH usuarios_afectados AS (
    SELECT DISTINCT usuario_id
    FROM membresias_usuarios
    WHERE estado = 'caducada'
      AND fecha_fin < CURRENT_TIMESTAMP
)
SELECT 
    u.id,
    u.email,
    u.membresia_activa_id
FROM usuarios u
JOIN usuarios_afectados ua ON u.id = ua.usuario_id;

-- 3. Actualizar la membresía activa para cada usuario afectado
DO $$$
DECLARE
    usuario_rec RECORD;
    nueva_membresia_id UUID;
BEGIN
    -- Recorrer todos los usuarios que tienen membresía caducada
    FOR usuario_rec IN 
        SELECT DISTINCT u.id, u.membresia_activa_id
        FROM usuarios u
        JOIN membresias_usuarios mu ON u.membresia_activa_id = mu.id
        WHERE mu.estado = 'caducada'
    LOOP
        -- Buscar si el usuario tiene otra membresía activa más reciente
        SELECT id INTO nueva_membresia_id
        FROM membresias_usuarios
        WHERE usuario_id = usuario_rec.id
          AND estado = 'activa'
        ORDER BY fecha_inicio DESC
        LIMIT 1;
        
        -- Si encontramos una membresía activa, la asignamos
        IF nueva_membresia_id IS NOT NULL THEN
            UPDATE usuarios
            SET membresia_activa_id = nueva_membresia_id
            WHERE id = usuario_rec.id;
            
            RAISE NOTICE 'Usuario % actualizado con nueva membresía activa: %', 
                usuario_rec.id, nueva_membresia_id;
        ELSE
            -- Si no hay membresías activas, establecer la referencia a NULL o a la membresía gratuita
            -- Opción 1: Establecer a NULL
            -- UPDATE usuarios
            -- SET membresia_activa_id = NULL
            -- WHERE id = usuario_rec.id;
            
            -- Opción 2: Asignar automáticamente membresía gratuita
            -- Primero ver si ya tiene una membresía gratuita
            DECLARE
                membresia_gratuita_id UUID;
                nueva_membresia_gratuita_id UUID;
            BEGIN
                -- Buscar ID del tipo de membresía gratuita (ajusta este ID según tu base de datos)
                DECLARE
                    tipo_membresia_gratuita_id UUID := '13fae609-2679-47fa-9731-e2f1badc4a61'; -- ID del plan gratuito
                BEGIN
                    -- Buscar si ya tiene una membresía gratuita
                    SELECT id INTO membresia_gratuita_id
                    FROM membresias_usuarios
                    WHERE usuario_id = usuario_rec.id
                      AND tipo_membresia_id = tipo_membresia_gratuita_id
                      AND (estado = 'activa' OR estado = 'inactiva');
                    
                    -- Si no tiene, creamos una nueva
                    IF membresia_gratuita_id IS NULL THEN
                        INSERT INTO membresias_usuarios (
                            usuario_id,
                            tipo_membresia_id,
                            fecha_inicio,
                            fecha_fin,
                            estado
                        ) VALUES (
                            usuario_rec.id,
                            tipo_membresia_gratuita_id,
                            CURRENT_TIMESTAMP,
                            CURRENT_TIMESTAMP + INTERVAL '10 year', -- Un periodo largo para el plan gratuito
                            'activa'
                        )
                        RETURNING id INTO nueva_membresia_gratuita_id;
                        
                        -- Actualizar el usuario
                        UPDATE usuarios
                        SET membresia_activa_id = nueva_membresia_gratuita_id
                        WHERE id = usuario_rec.id;
                        
                        RAISE NOTICE 'Usuario % asignado a nueva membresía gratuita: %', 
                            usuario_rec.id, nueva_membresia_gratuita_id;
                    ELSE
                        -- Si ya tiene una, la reactivamos
                        UPDATE membresias_usuarios
                        SET estado = 'activa',
                            fecha_inicio = CURRENT_TIMESTAMP,
                            fecha_fin = CURRENT_TIMESTAMP + INTERVAL '10 year'
                        WHERE id = membresia_gratuita_id;
                        
                        -- Actualizar el usuario
                        UPDATE usuarios
                        SET membresia_activa_id = membresia_gratuita_id
                        WHERE id = usuario_rec.id;
                        
                        RAISE NOTICE 'Usuario % reactivado con membresía gratuita existente: %', 
                            usuario_rec.id, membresia_gratuita_id;
                    END IF;
                END;
            END;
        END IF;
    END LOOP;
END $$;

-- 4. Verificar el resultado final
WITH usuarios_actualizados AS (
    SELECT DISTINCT usuario_id
    FROM membresias_usuarios
    WHERE estado = 'caducada'
      AND fecha_fin < CURRENT_TIMESTAMP
)
SELECT 
    u.id,
    u.email,
    u.membresia_activa_id,
    mu.estado,
    mu.fecha_inicio,
    mu.fecha_fin,
    mt.nombre AS tipo_membresia,
    mt.tiene_ai
FROM usuarios u
JOIN usuarios_actualizados ua ON u.id = ua.usuario_id
LEFT JOIN membresias_usuarios mu ON u.membresia_activa_id = mu.id
LEFT JOIN membresia_tipos mt ON mu.tipo_membresia_id = mt.id;