-- Script para añadir la columna 'nombre' a la tabla listas_compra si no existe

-- Verificar si la tabla existe
DO $$
DECLARE
    table_exists BOOLEAN;
BEGIN
    SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'listas_compra'
    ) INTO table_exists;
    
    IF NOT table_exists THEN
        -- Crear la tabla si no existe
        CREATE TABLE public.listas_compra (
            id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            usuario_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
            nombre_lista TEXT NOT NULL,
            fecha_creacion TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            estado TEXT DEFAULT 'borrador',
            notas TEXT,
            total DECIMAL(10, 2),
            proveedor_id UUID REFERENCES public.proveedores(id) ON DELETE SET NULL,
            fecha_envio TIMESTAMP WITH TIME ZONE
        );
        RAISE NOTICE 'Tabla listas_compra creada correctamente.';
    ELSE
        -- Verificar si la columna nombre_lista existe
        IF NOT EXISTS (
            SELECT FROM information_schema.columns 
            WHERE table_schema = 'public' 
            AND table_name = 'listas_compra' 
            AND column_name = 'nombre_lista'
        ) THEN
            -- Añadir la columna nombre_lista si no existe
            ALTER TABLE public.listas_compra ADD COLUMN nombre_lista TEXT NOT NULL DEFAULT 'Lista sin nombre';
            RAISE NOTICE 'Columna nombre_lista añadida a la tabla listas_compra.';
        ELSE
            RAISE NOTICE 'La columna nombre_lista ya existe en la tabla listas_compra.';
        END IF;
    END IF;
END $$;

-- Verificar que la tabla items_lista_compra existe
DO $$
DECLARE
    table_exists BOOLEAN;
BEGIN
    SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'items_lista_compra'
    ) INTO table_exists;
    
    IF NOT table_exists THEN
        -- Crear la tabla items_lista_compra si no existe
        CREATE TABLE public.items_lista_compra (
            id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            lista_id UUID NOT NULL REFERENCES public.listas_compra(id) ON DELETE CASCADE,
            articulo_id UUID REFERENCES public.articulos(id) ON DELETE SET NULL,
            cantidad DECIMAL(10, 2) NOT NULL DEFAULT 1,
            precio_unitario DECIMAL(10, 2),
            unidad TEXT,
            notas TEXT,
            completado BOOLEAN DEFAULT FALSE
        );
        RAISE NOTICE 'Tabla items_lista_compra creada correctamente.';
    ELSE
        RAISE NOTICE 'La tabla items_lista_compra ya existe.';
    END IF;
END $$;

-- Asegurarse de que ambas tablas tienen Row Level Security habilitado
ALTER TABLE public.listas_compra ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.items_lista_compra ENABLE ROW LEVEL SECURITY;

-- Crear o reemplazar políticas de seguridad básicas
DROP POLICY IF EXISTS "los_usuarios_pueden_ver_sus_propias_listas" ON public.listas_compra;
CREATE POLICY "los_usuarios_pueden_ver_sus_propias_listas" ON public.listas_compra
    FOR SELECT USING (auth.uid() = usuario_id);

DROP POLICY IF EXISTS "los_usuarios_pueden_gestionar_sus_propias_listas" ON public.listas_compra;
CREATE POLICY "los_usuarios_pueden_gestionar_sus_propias_listas" ON public.listas_compra
    USING (auth.uid() = usuario_id);

DROP POLICY IF EXISTS "gestion_items_a_traves_de_lista" ON public.items_lista_compra;
CREATE POLICY "gestion_items_a_traves_de_lista" ON public.items_lista_compra
    USING (EXISTS (
        SELECT 1 FROM public.listas_compra 
        WHERE id = lista_id AND usuario_id = auth.uid()
    ));

-- Mostrar las columnas actuales de la tabla listas_compra
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'listas_compra'
ORDER BY ordinal_position;