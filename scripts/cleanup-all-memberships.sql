-- Script para optimizar la tabla de membresías y evitar duplicados

-- 1. Identificar usuarios con múltiples membresías activas
WITH usuarios_multiples_membresias AS (
    SELECT 
        usuario_id, 
        COUNT(*) as total_activas
    FROM 
        membresias_usuarios
    WHERE 
        estado = 'activa'
    GROUP BY 
        usuario_id
    HAVING 
        COUNT(*) > 1
),

-- 2. Para cada uno de estos usuarios, identificar qué membresía deberíamos mantener
membresías_a_mantener AS (
    SELECT DISTINCT ON (mu.usuario_id)
        mu.id as membresia_id,
        mu.usuario_id,
        mu.tipo_membresia_id,
        mt.tiene_ai,
        mt.nombre as tipo_nombre,
        mu.fecha_inicio,
        mu.fecha_fin
    FROM 
        membresias_usuarios mu
    JOIN 
        membresia_tipos mt ON mu.tipo_membresia_id = mt.id
    JOIN 
        usuarios_multiples_membresias umm ON mu.usuario_id = umm.usuario_id
    WHERE 
        mu.estado = 'activa'
    ORDER BY 
        mu.usuario_id, 
        mt.tiene_ai DESC, -- Priorizar membresías con IA (Premium)
        mu.fecha_fin DESC, -- Luego las que expiran más tarde
        mu.fecha_inicio DESC -- Finalmente las más recientes
),

-- 3. Identificar qué membresías se deben desactivar (todas las activas excepto la elegida para mantener)
membresías_a_desactivar AS (
    SELECT 
        mu.id
    FROM 
        membresias_usuarios mu
    JOIN 
        usuarios_multiples_membresias umm ON mu.usuario_id = umm.usuario_id
    LEFT JOIN 
        membresías_a_mantener mm ON mu.id = mm.membresia_id
    WHERE 
        mu.estado = 'activa'
        AND mm.membresia_id IS NULL
)

-- 4. Ver lista de membresías que se mantendrán activas (para verificación)
SELECT 
    m.membresia_id,
    m.usuario_id,
    u.email,
    m.tipo_nombre,
    m.tiene_ai,
    m.fecha_inicio,
    m.fecha_fin
FROM 
    membresías_a_mantener m
JOIN 
    usuarios u ON m.usuario_id = u.id
ORDER BY 
    u.email;

-- 5. Ver lista de membresías que se desactivarán (para verificación)
SELECT 
    d.id as membresia_id,
    mu.usuario_id,
    u.email,
    mt.nombre as tipo_nombre,
    mt.tiene_ai,
    mu.fecha_inicio,
    mu.fecha_fin
FROM 
    membresías_a_desactivar d
JOIN 
    membresias_usuarios mu ON d.id = mu.id
JOIN 
    usuarios u ON mu.usuario_id = u.id
JOIN 
    membresia_tipos mt ON mu.tipo_membresia_id = mt.id
ORDER BY 
    u.email;

-- 6. Actualizar estado de las membresías a desactivar
-- UPDATE membresias_usuarios
-- SET estado = 'inactiva'
-- WHERE id IN (SELECT id FROM membresías_a_desactivar);

-- 7. Actualizar referencia en la tabla de usuarios para asegurar que apunta a la membresía correcta
-- UPDATE usuarios u
-- SET membresia_activa_id = m.membresia_id
-- FROM membresías_a_mantener m
-- WHERE u.id = m.usuario_id;

-- IMPORTANTE: Las actualizaciones están comentadas. 
-- Revisar primero los resultados de las consultas de verificación (pasos 4 y 5)
-- y luego descomentar los comandos UPDATE si todo se ve correcto.