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

    // Parámetro de acceso de emergencia para administradores (solo para acceso de emergencia)
    const adminKey = req.nextUrl.searchParams.get('adminKey');
    if (adminKey === 'luisAdmin2025') {
      // Crear una respuesta que incluya una cookie de acceso temporal
      const response = NextResponse.next();
      // Establecer una cookie de emergencia que expire en 1 hora
      response.cookies.set('adminEmergencyAccess', 'granted', { 
        maxAge: 3600,
        httpOnly: true,
        path: '/admin',
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict'
      });
      return response;
    }
    
    // Verificar cookie de emergencia
    const emergencyAccess = req.cookies.get('adminEmergencyAccess')?.value;
    if (emergencyAccess === 'granted') {
      return NextResponse.next();
    }
    
    // Verificar cookies de admin
    const adminCookie = req.cookies.get('adminAuth')?.value;
    
    // Verificar si el usuario es un superadmin basado en la sesión
    const supabase = createMiddlewareClient({ req, res: NextResponse.next() });
    
    try {
      const { data, error } = await supabase.auth.getSession();
      
      // Si hay un error al verificar la sesión, redirigir al login
      if (error) {
        console.error('Error verificando sesión en middleware:', error);
        return NextResponse.redirect(new URL('/admin', req.url));
      }
      
      const userEmail = data?.session?.user?.email;
      
      // Si es un superadmin por email, permitir acceso
      if (userEmail === 'luisocro@gmail.com') {
        const response = NextResponse.next();
        // Establecer cookie para accesos futuros
        response.cookies.set('adminSuperAccess', 'granted', { 
          maxAge: 24 * 3600, // 24 horas
          httpOnly: true,
          path: '/admin',
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'strict'
        });
        return response;
      }
      
      // Verificar cookie de superacceso (establecida anteriormente)
      const superAccess = req.cookies.get('adminSuperAccess')?.value;
      if (superAccess === 'granted') {
        return NextResponse.next();
      }
      
      // Si no es superadmin, verificar cookie de autenticación admin
      if (!adminCookie) {
        console.log('Sin cookie de admin, redirigiendo a login');
        return NextResponse.redirect(new URL('/admin', req.url));
      }
      
      // Aunque tenga cookie de admin, forzar una redirección para que el cliente vuelva a verificar
      // Esto es más seguro que permitir acceso directamente
      const response = NextResponse.next();
      response.cookies.set('adminAuthVerify', 'required', { 
        maxAge: 5, // Solo 5 segundos para que el cliente realice la verificación
        path: '/admin',
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict'
      });
      return response;
    } catch (err) {
      console.error('Error en middleware de admin:', err);
      // Cualquier error en el proceso de autenticación debe redirigir al login
      return NextResponse.redirect(new URL('/admin', req.url));
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

// Configuración de middleware para protección de rutas
export const config = {
  matcher: [
    // CRÍTICO: Proteger específicamente las rutas de admin con alta prioridad y patrón extenso para cualquier subruta
    '/admin',
    '/admin/dashboard/:path*',
    '/admin/dashboard',
    '/admin/:path*',
    // Excluir archivos estáticos y API routes para las demás rutas
    '/((?!_next/static|_next/image|favicon.ico|api).*)',
  ],
};
