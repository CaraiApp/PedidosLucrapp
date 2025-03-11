-- Script simplificado para arreglar políticas RLS en membresias_usuarios

-- 1. Eliminar políticas restrictivas existentes
DROP POLICY IF EXISTS "membresias_usuarios_policy" ON "public"."membresias_usuarios";

-- 2. Crear política para que los usuarios puedan ver todas las membresías
CREATE POLICY "Ver todas las membresías" 
ON "public"."membresias_usuarios"
FOR SELECT
TO authenticated
USING (true);

-- 3. Permitir insertar membresías a cualquier usuario autenticado
CREATE POLICY "Insertar membresías" 
ON "public"."membresias_usuarios"
FOR INSERT
TO authenticated
WITH CHECK (true);

-- 4. Permitir al service_role hacer todo
CREATE POLICY "Acceso total service_role" 
ON "public"."membresias_usuarios"
FOR ALL
TO service_role
USING (true);

-- 5. Forzar y habilitar RLS en la tabla
ALTER TABLE "public"."membresias_usuarios" FORCE ROW LEVEL SECURITY;
ALTER TABLE "public"."membresias_usuarios" ENABLE ROW LEVEL SECURITY;