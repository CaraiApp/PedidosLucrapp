-- Script para Supabase - Creación de unidades y modificación de artículos
-- IMPORTANTE: Ejecutar cada bloque por separado (uno a uno)

-- Bloque 1: Crear tabla de unidades
CREATE TABLE IF NOT EXISTS unidades (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre TEXT NOT NULL,
  abreviatura TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Bloque 2: Insertar unidades básicas (ejecutar después del Bloque 1)
INSERT INTO unidades (nombre, abreviatura) VALUES ('Unidades', 'uds');
INSERT INTO unidades (nombre, abreviatura) VALUES ('Kilogramos', 'kg');
INSERT INTO unidades (nombre, abreviatura) VALUES ('Cajas', 'caj');

-- Bloque 3: Añadir nueva columna unidad_id (ejecutar ANTES de eliminar la columna unidad)
ALTER TABLE articulos ADD COLUMN unidad_id UUID REFERENCES unidades(id) ON DELETE SET NULL;
