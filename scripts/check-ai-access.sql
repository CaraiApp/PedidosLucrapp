-- Script para verificar si un usuario tiene acceso a funcionalidades de IA
-- ID del usuario: def38ca4-63a6-4ce1-8dbd-32abda08a14c

-- 1. Verificar información básica del usuario
SELECT 
    id, 
    email, 
    membresia_activa_id
FROM usuarios
WHERE id = 'def38ca4-63a6-4ce1-8dbd-32abda08a14c';

-- 2. Verificar todas las membresías del usuario
SELECT 
    id,
    tipo_membresia_id,
    fecha_inicio,
    fecha_fin,
    estado
FROM membresias_usuarios
WHERE usuario_id = 'def38ca4-63a6-4ce1-8dbd-32abda08a14c';

-- 3. Verificar detalles de la membresía activa (incluido acceso a IA)
SELECT 
    u.id AS usuario_id,
    u.email,
    u.membresia_activa_id,
    mu.tipo_membresia_id,
    mu.estado AS estado_membresia,
    mu.fecha_inicio,
    mu.fecha_fin,
    mt.nombre AS tipo_membresia_nombre,
    mt.tiene_ai,
    mt.id AS tipo_membresia_id
FROM usuarios u
LEFT JOIN membresias_usuarios mu ON u.membresia_activa_id = mu.id
LEFT JOIN membresia_tipos mt ON mu.tipo_membresia_id = mt.id
WHERE u.id = 'def38ca4-63a6-4ce1-8dbd-32abda08a14c';

-- 4. Verificar todos los tipos de membresías disponibles
SELECT 
    id,
    nombre,
    precio,
    tiene_ai
FROM membresia_tipos
ORDER BY precio ASC;