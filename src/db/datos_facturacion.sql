-- Script SQL para verificar y crear la tabla datos_facturacion
-- Este script comprueba si la tabla existe y si no, la crea

-- Verificar si la tabla datos_facturacion existe
DO $$
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
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
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
        -- Si la tabla ya existe, verificar que tenga las columnas necesarias
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
        
        -- Verificar si existe la columna updated_at
        IF NOT EXISTS (
            SELECT 1 
            FROM information_schema.columns 
            WHERE table_schema = 'public' 
            AND table_name = 'datos_facturacion' 
            AND column_name = 'updated_at'
        ) THEN
            -- Añadir columna updated_at si no existe
            ALTER TABLE datos_facturacion ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
            RAISE NOTICE 'Columna updated_at añadida a la tabla datos_facturacion';
        ELSE
            RAISE NOTICE 'La tabla datos_facturacion ya tiene la columna updated_at';
        END IF;
    END IF;
END $$;

-- Crear la función del trigger para updated_at
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Verificar si existe el trigger y crearlo si no existe
DO $$
BEGIN
    -- Verificar si el trigger ya existe
    IF NOT EXISTS (
        SELECT 1
        FROM pg_trigger
        WHERE tgname = 'trigger_set_updated_at'
    ) THEN
        -- Crear el trigger
        DROP TRIGGER IF EXISTS trigger_set_updated_at ON datos_facturacion;
        CREATE TRIGGER trigger_set_updated_at
        BEFORE UPDATE ON datos_facturacion
        FOR EACH ROW
        EXECUTE FUNCTION set_updated_at();
        
        RAISE NOTICE 'Trigger para updated_at creado';
    ELSE
        RAISE NOTICE 'El trigger para updated_at ya existe';
    END IF;
END $$;