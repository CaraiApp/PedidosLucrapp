# Instrucciones para Configurar la Base de Datos

Este directorio contiene los scripts SQL necesarios para configurar la base de datos de Lucrapp.

## ERROR: "column proveedor_id does not exist"

Si recibes este error, utiliza el script simplificado: `schema_simplified.sql`

## Cómo ejecutar el script de esquema

1. Accede a tu panel de control de Supabase
2. Ve a la sección "SQL Editor"
3. Haz clic en "New Query"
4. **IMPORTANTE**: Copia y pega el contenido del archivo `schema_simplified.sql` en el editor
5. Ejecuta el script haciendo clic en "Run"

## ¿Qué hace el script?

El script simplificado crea solo las tablas esenciales:

- `proveedores`: Para almacenar información de proveedores
- `articulos`: Para almacenar productos/artículos

También configura:

- Políticas de seguridad a nivel de fila (RLS) para cada tabla
- Índices para mejorar el rendimiento

## IMPORTANTE: Cambios en el script simplificado

1. Hemos cambiado la función `uuid_generate_v4()` por `gen_random_uuid()` que es la correcta en Supabase
2. Hemos especificado el esquema `public` explícitamente para evitar problemas
3. Se han eliminado tablas no esenciales para simplificar la configuración inicial

## Después de ejecutar el script

Una vez ejecutado el script, verifica que:

1. Las tablas `proveedores` y `articulos` se hayan creado correctamente
2. Puedas insertar un proveedor de prueba para verificar que todo funciona

## Solución de problemas

Si encuentras más errores:

- Verifica que estás ejecutando el script con un usuario que tenga permisos suficientes
- Ejecuta cada sección del script por separado si hay errores específicos
- Si una tabla ya existe y da error, comenta esa parte del script