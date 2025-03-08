-- Crear función para detectar usuarios con múltiples membresías activas
CREATE OR REPLACE FUNCTION usuarios_con_multiples_membresias_activas()
RETURNS TABLE (
    usuario_id UUID,
    count BIGINT
) AS $$$
BEGIN
    RETURN QUERY
    SELECT mu.usuario_id, COUNT(*) as count
    FROM membresias_usuarios mu
    WHERE mu.estado = 'activa'
    GROUP BY mu.usuario_id
    HAVING COUNT(*) > 1;
END;
$$$ LANGUAGE plpgsql;

-- Ejemplo de uso:
-- SELECT * FROM usuarios_con_multiples_membresias_activas();