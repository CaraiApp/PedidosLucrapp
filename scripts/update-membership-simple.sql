-- Script simple para actualizar la membresía de un usuario específico a Premium con IA
-- Usa comandos SQL estándar sin variables específicas de PostgreSQL

-- Constantes (puedes cambiar estos valores según sea necesario)
-- ID del usuario: def38ca4-63a6-4ce1-8dbd-32abda08a14c
-- ID de membresía premium (Plan con IA): 9e6ecc49-90a9-4952-8a00-55b12cd39df1

-- 1. Primero, comprueba si ya existe una membresía premium para este usuario
SELECT id FROM membresias_usuarios
WHERE usuario_id = 'def38ca4-63a6-4ce1-8dbd-32abda08a14c'
AND tipo_membresia_id = '9e6ecc49-90a9-4952-8a00-55b12cd39df1'
AND estado = 'activa';

-- 2a. Si no existe (no hay resultados del SELECT anterior), crea una nueva membresía premium
INSERT INTO membresias_usuarios (
    usuario_id,
    tipo_membresia_id,
    fecha_inicio,
    fecha_fin,
    estado
) 
VALUES (
    'def38ca4-63a6-4ce1-8dbd-32abda08a14c',
    '9e6ecc49-90a9-4952-8a00-55b12cd39df1',
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP + INTERVAL '1 year',
    'activa'
);

-- 2b. Obtén el ID de la membresía que acabas de crear (o la existente)
SELECT id FROM membresias_usuarios
WHERE usuario_id = 'def38ca4-63a6-4ce1-8dbd-32abda08a14c'
AND tipo_membresia_id = '9e6ecc49-90a9-4952-8a00-55b12cd39df1'
AND estado = 'activa'
ORDER BY fecha_inicio DESC
LIMIT 1;

-- 3. Actualiza el usuario para que apunte a esta membresía
-- Nota: Reemplaza 'ID-DE-LA-MEMBRESÍA' con el ID obtenido del paso 2b
UPDATE usuarios
SET membresia_activa_id = 'ID-DE-LA-MEMBRESÍA'
WHERE id = 'def38ca4-63a6-4ce1-8dbd-32abda08a14c';

-- 4. Verificar que el usuario tenga ahora la membresía correcta
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
WHERE u.id = 'def38ca4-63a6-4ce1-8dbd-32abda08a14c';