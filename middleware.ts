import { createMiddlewareClient } from "@supabase/auth-helpers-nextjs";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Este middleware es simplificado para mejor soporte en producción
export async function middleware(req: NextRequest) {
  // Primero, verificamos si es una ruta que no necesita verificación
  const publicPaths = ['/login', '/register', '/', '/api'];
  const isPublicPath = publicPaths.some(path => 
    req.nextUrl.pathname === path || req.nextUrl.pathname.startsWith(`${path}/`)
  );
  
  // Si es una ruta pública, permitir acceso sin verificación
  if (isPublicPath) {
    return NextResponse.next();
  }
  
  // Para todas las demás rutas, verificar autenticación
  const res = NextResponse.next();
  const supabase = createMiddlewareClient({ req, res });

  const { data: { session } } = await supabase.auth.getSession();

  // Si no hay sesión, redirigir al login
  if (!session) {
    const redirectUrl = new URL("/login", req.url);
    redirectUrl.searchParams.set("redirectTo", req.nextUrl.pathname);
    return NextResponse.redirect(redirectUrl);
  }

  // Usuario autenticado, permitir acceso
  return res;
}

// Configuración más simple y efectiva para producción
export const config = {
  matcher: [
    // Excluir archivos estáticos y API routes
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};
