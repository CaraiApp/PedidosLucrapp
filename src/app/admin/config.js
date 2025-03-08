'use client';

// Configuración para asegurar que las páginas de admin se rendericen sólo en el cliente
export const dynamic = 'force-dynamic';
export const dynamicParams = true;
// Quitamos revalidate que causa problemas
// export const revalidate = 0;
export const fetchCache = 'force-no-store';
export const runtime = 'nodejs';
export const preferredRegion = 'auto';

// Para depuración
export const DEBUG_ADMIN = true;