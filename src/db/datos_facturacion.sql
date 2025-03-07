-- Script SQL para verificar y crear la tabla datos_facturacion
-- Este script comprueba si la tabla existe y si no, la crea

-- Verificar si la tabla datos_facturacion existe
DO $$$
BEGIN
    IF NOT EXISTS (
        SELECT FROM pg_tables
        WHERE schemaname = 'public'
        AND tablename = 'datos_facturacion'
    ) THEN
        -- Crear la tabla datos_facturacion si no existe
        CREATE TABLE datos_facturacion (
            id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            usuario_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
            nombre_empresa TEXT,
            cif TEXT,
            direccion TEXT,
            codigo_postal TEXT,
            ciudad TEXT,
            provincia TEXT,
            pais TEXT DEFAULT 'España',
            telefono TEXT,
            email_facturacion TEXT,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );

        -- Establecer políticas de seguridad para la tabla datos_facturacion
        ALTER TABLE datos_facturacion ENABLE ROW LEVEL SECURITY;

        -- Políticas para que los usuarios solo puedan ver y modificar sus propios datos
        CREATE POLICY "Usuarios pueden ver sus propios datos de facturación" 
          ON datos_facturacion FOR SELECT 
          USING (auth.uid() = usuario_id);

        CREATE POLICY "Usuarios pueden insertar sus propios datos de facturación" 
          ON datos_facturacion FOR INSERT 
          WITH CHECK (auth.uid() = usuario_id);

        CREATE POLICY "Usuarios pueden actualizar sus propios datos de facturación" 
          ON datos_facturacion FOR UPDATE 
          USING (auth.uid() = usuario_id);

        CREATE POLICY "Usuarios pueden eliminar sus propios datos de facturación" 
          ON datos_facturacion FOR DELETE 
          USING (auth.uid() = usuario_id);

        RAISE NOTICE 'Tabla datos_facturacion creada con éxito';
    ELSE
        -- Si la tabla ya existe, verificar que tenga la columna provincia
        IF NOT EXISTS (
            SELECT 1 
            FROM information_schema.columns 
            WHERE table_schema = 'public' 
            AND table_name = 'datos_facturacion' 
            AND column_name = 'provincia'
        ) THEN
            -- Añadir columna provincia si no existe
            ALTER TABLE datos_facturacion ADD COLUMN provincia TEXT;
            RAISE NOTICE 'Columna provincia añadida a la tabla datos_facturacion';
        ELSE
            RAISE NOTICE 'La tabla datos_facturacion ya existe y tiene la columna provincia';
        END IF;
    END IF;
END $$;