-- Script rápido para actualizar la membresía directamente

-- 1. Crear nueva membresía premium
INSERT INTO membresias_usuarios (
    usuario_id,
    tipo_membresia_id,
    fecha_inicio,
    fecha_fin,
    estado
) VALUES (
    'def38ca4-63a6-4ce1-8dbd-32abda08a14c', -- ID del usuario
    '9e6ecc49-90a9-4952-8a00-55b12cd39df1', -- ID del plan premium con IA
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP + INTERVAL '1 year',
    'activa'
) RETURNING id;

-- 2. Obtener el ID de la membresía recién creada o existente
-- (Anota el ID devuelto en el paso anterior, o ejecuta esta consulta si no puedes ver el resultado)
SELECT id FROM membresias_usuarios 
WHERE usuario_id = 'def38ca4-63a6-4ce1-8dbd-32abda08a14c'
AND tipo_membresia_id = '9e6ecc49-90a9-4952-8a00-55b12cd39df1'
AND estado = 'activa'
ORDER BY fecha_inicio DESC 
LIMIT 1;

-- 3. Actualizar el usuario (reemplaza 'ID-MEMBRESIA-AQUI' con el ID obtenido en el paso anterior)
UPDATE usuarios
SET membresia_activa_id = 'ID-MEMBRESIA-AQUI'
WHERE id = 'def38ca4-63a6-4ce1-8dbd-32abda08a14c';

-- 4. Verificar que se ha actualizado correctamente
SELECT u.id, u.email, u.membresia_activa_id, mt.nombre, mt.tiene_ai
FROM usuarios u
LEFT JOIN membresias_usuarios mu ON u.membresia_activa_id = mu.id
LEFT JOIN membresia_tipos mt ON mu.tipo_membresia_id = mt.id
WHERE u.id = 'def38ca4-63a6-4ce1-8dbd-32abda08a14c';