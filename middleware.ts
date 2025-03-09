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

  // PROTECCIÓN ESPECIAL PARA RUTAS DE ADMINISTRACIÓN
  if (req.nextUrl.pathname.startsWith('/admin')) {
    // Verificar si es la página principal de admin (página de login)
    if (req.nextUrl.pathname === '/admin' || req.nextUrl.pathname === '/admin/') {
      return NextResponse.next();
    }

    // Parámetro de acceso de emergencia para administradores
    const adminKey = req.nextUrl.searchParams.get('adminKey');
    if (adminKey === 'luisAdmin2025') {
      return NextResponse.next();
    }
    
    // Verificar cookies de admin
    const adminCookie = req.cookies.get('adminAuth')?.value;
    
    // Verificar si el usuario es un superadmin basado en la sesión
    const res = NextResponse.next();
    const supabase = createMiddlewareClient({ req, res });
    
    try {
      const { data } = await supabase.auth.getSession();
      const userEmail = data?.session?.user?.email;
      
      // Si es un superadmin por email, permitir acceso
      if (userEmail === 'luisocro@gmail.com') {
        return res;
      }
      
      // Si no tiene cookie de admin y no es superadmin, redirigir
      if (!adminCookie) {
        return NextResponse.redirect(new URL('/admin', req.url));
      }
      
      // Tiene cookie de admin, podría ser válida
      return res;
    } catch (err) {
      // Error de autenticación, verificar solo la cookie
      if (!adminCookie) {
        return NextResponse.redirect(new URL('/admin', req.url));
      }
      
      // Tiene cookie, permitir que el componente cliente verifique su validez
      return NextResponse.next();
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
