import { createMiddlewareClient } from "@supabase/auth-helpers-nextjs";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Este middleware es simplificado para mejor soporte en producción
export async function middleware(req: NextRequest) {
  // Procesar URL hash para recuperación de contraseña
  if (req.nextUrl.pathname === '/recuperar-password' && req.nextUrl.hash) {
    const url = req.nextUrl.clone();
    const hashParams = url.hash.substring(1); // Quitar el #
    
    if (hashParams.includes('access_token') || hashParams.includes('type=recovery')) {
      // Convertir hash params a search params
      const params = new URLSearchParams(hashParams);
      params.forEach((value, key) => {
        url.searchParams.set(key, value);
      });
      url.hash = '';
      
      return NextResponse.redirect(url);
    }
  }

  // Verificar si es una ruta que no necesita verificación
  const publicPaths = ['/login', '/register', '/', '/api', '/recuperar-password'];
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
