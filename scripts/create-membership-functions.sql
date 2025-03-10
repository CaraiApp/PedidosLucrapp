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

-- Crear función para obtener la membresía activa de un usuario
CREATE OR REPLACE FUNCTION get_user_active_membership(user_id UUID)
RETURNS JSONB AS $$$
DECLARE
    result JSONB;
BEGIN
    -- Esta es exactamente la misma consulta que se usa en /perfil/membresia
    SELECT jsonb_build_object(
        'id', mu.id,
        'tipo_membresia_id', mu.tipo_membresia_id,
        'fecha_inicio', mu.fecha_inicio,
        'fecha_fin', mu.fecha_fin,
        'estado', mu.estado,
        'tipo_membresia', jsonb_build_object(
            'id', mt.id,
            'nombre', mt.nombre,
            'descripcion', mt.descripcion,
            'precio', mt.precio,
            'tiene_ai', mt.tiene_ai,
            'limite_listas', mt.limite_listas,
            'limite_proveedores', mt.limite_proveedores,
            'limite_articulos', mt.limite_articulos,
            'duracion_meses', mt.duracion_meses
        )
    ) INTO result
    FROM membresias_usuarios mu
    JOIN membresia_tipos mt ON mu.tipo_membresia_id = mt.id
    WHERE mu.usuario_id = user_id
    AND mu.estado = 'activa'
    ORDER BY mu.fecha_inicio DESC
    LIMIT 1;
    
    RETURN result;
END;
$$$ LANGUAGE plpgsql;

-- Ejemplo de uso:
-- SELECT * FROM usuarios_con_multiples_membresias_activas();
-- SELECT * FROM get_user_active_membership('user-uuid-here');