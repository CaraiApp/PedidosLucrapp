# LucrApp - Aplicación de Gestión de Pedidos

LucrApp es una aplicación web para gestionar proveedores, artículos y listas de compras con un sistema de membresías.

## Configuración de Stripe para Membresías

Para que el sistema de pago de membresías funcione correctamente, sigue estos pasos:

1. Crea una cuenta en [Stripe](https://stripe.com) si aún no tienes una.

2. Añade las siguientes variables de entorno en tu archivo `.env.local`:

```
STRIPE_SECRET_KEY=sk_test_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

3. En tu panel de Stripe, crea productos para cada plan de membresía:
   - Crea un producto por cada tipo de membresía (ej. Básico, Pro, Premium)
   - Configura precios recurrentes (subscriptions) para cada producto
   - Copia el ID del precio (price_...) y actualiza la tabla `membresia_tipos` en Supabase

4. Para configurar el webhook de Stripe:
   - Usa [Stripe CLI](https://stripe.com/docs/stripe-cli) para pruebas locales
   - Ejecuta: `stripe listen --forward-to localhost:3000/api/webhook`
   - Añade el webhook secret generado a las variables de entorno
   - En producción, configura el webhook en el Dashboard de Stripe apuntando a `https://tu-dominio.com/api/webhook`

5. Actualiza la tabla de tipos de membresías en Supabase:
   ```sql
   ALTER TABLE membresia_tipos 
   ADD COLUMN stripe_price_id TEXT;
   
   -- Actualiza cada fila con el ID de precio correspondiente
   UPDATE membresia_tipos 
   SET stripe_price_id = 'price_...' 
   WHERE id = '...';
   ```

6. Actualiza la tabla de membresías de usuarios:
   ```sql
   ALTER TABLE membresias_usuarios 
   ADD COLUMN stripe_subscription_id TEXT;
   ```

## Desarrollo

```bash
# Instalar dependencias
npm install

# Ejecutar servidor de desarrollo
npm run dev

# Construir para producción
npm run build

# Iniciar servidor de producción
npm start
```

## Despliegue en Vercel

Para desplegar correctamente la aplicación en Vercel, asegúrate de configurar las siguientes variables de entorno en el panel de configuración del proyecto:

1. Ve a tu proyecto en el dashboard de Vercel
2. Navega a Settings > Environment Variables
3. Añade las siguientes variables:
   - `STRIPE_SECRET_KEY` - Tu clave secreta de Stripe
   - `STRIPE_WEBHOOK_SECRET` - El secreto del webhook de Stripe
   - `NEXT_PUBLIC_SUPABASE_URL` - URL de tu proyecto Supabase
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Clave anónima de Supabase
   - `NEXT_PUBLIC_APP_URL` - URL de tu aplicación desplegada

**Importante**: Sin estas variables, la build fallará durante el despliegue.

## Estructura del Proyecto

- `/src/app` - Rutas y páginas de Next.js
- `/src/components` - Componentes reutilizables
- `/src/hooks` - Custom hooks
- `/src/lib` - Utilidades y configuración
- `/src/types` - Definiciones de tipos TypeScript

## Tecnologías

- [Next.js](https://nextjs.org) - Framework de React
- [Tailwind CSS](https://tailwindcss.com) - Framework de CSS
- [Supabase](https://supabase.io) - Backend y autenticación
- [Stripe](https://stripe.com) - Procesamiento de pagos
