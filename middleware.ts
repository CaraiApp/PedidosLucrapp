import { createMiddlewareClient } from "@supabase/auth-helpers-nextjs";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { decryptAdminData, SUPER_ADMIN_EMAIL } from "./src/lib/admin/auth";

// MIDDLEWARE PRINCIPAL - Protege rutas y gestiona autenticación
export async function middleware(req: NextRequest) {
  // Procesar URL hash para recuperación de contraseña (mantener funcionalidad original)
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

  // PROTECCIÓN ESTRICTA DEL PANEL DE ADMINISTRACIÓN
  if (req.nextUrl.pathname.startsWith('/admin')) {
    // Permitir acceso a la página de login de admin
    if (req.nextUrl.pathname === '/admin' || req.nextUrl.pathname === '/admin/') {
      return NextResponse.next();
    }
    
    // Crear cliente Supabase
    const res = NextResponse.next();
    const supabase = createMiddlewareClient({ req, res });
    
    // VERIFICACIÓN 1: Comprobar si es superadmin por email
    try {
      const { data } = await supabase.auth.getSession();
      const userEmail = data?.session?.user?.email;
      
      // Solo si el email coincide exactamente con el superadmin
      if (userEmail === SUPER_ADMIN_EMAIL) {
        console.log("✅ Acceso autorizado para superadmin:", userEmail);
        
        // Establecer cookie segura para acceso
        const secureResponse = NextResponse.next();
        secureResponse.cookies.set('adminSuperAccess', 'true', { 
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          maxAge: 3600, // 1 hora
          path: '/admin',
          sameSite: 'strict'
        });
        return secureResponse;
      }
    } catch (sessionError) {
      console.error("❌ Error verificando sesión de superadmin:", sessionError);
      // Continuar con otras verificaciones
    }
    
    // VERIFICACIÓN 2: Verificar cookie de admin
    const adminToken = req.cookies.get('adminToken')?.value;
    
    if (adminToken) {
      try {
        // Descifrar y validar el token
        const adminData = decryptAdminData(adminToken);
        
        // Verificar que sea válido y no haya expirado
        if (adminData && adminData.isAuthenticated && 
            Date.now() < adminData.expiresAt) {
          
          // Verificación adicional: solo permitir superadmin
          if (adminData.email === SUPER_ADMIN_EMAIL) {
            console.log("✅ Acceso autorizado por token válido para:", adminData.email);
            return NextResponse.next();
          }
        }
        
        // Token inválido, expirado o no es superadmin
        console.error("❌ Token admin inválido o expirado");
      } catch (tokenError) {
        console.error("❌ Error procesando token admin:", tokenError);
      }
    }
    
    // VERIFICACIÓN 3: Verificar cookie de emergencia (muy limitada)
    const emergencyToken = req.cookies.get('adminEmergency')?.value;
    
    if (emergencyToken === 'luis-2025-emergency' && 
        req.headers.get('user-agent')?.includes('Chrome')) {
      console.log("⚠️ Acceso de emergencia concedido");
      
      // Solo permitir este acceso por 5 minutos
      const emergencyResponse = NextResponse.next();
      emergencyResponse.cookies.set('adminEmergency', 'luis-2025-emergency', { 
        httpOnly: true,
        secure: true,
        maxAge: 300, // 5 minutos
        path: '/admin',
        sameSite: 'strict'
      });
      return emergencyResponse;
    }
    
    // Si ninguna verificación pasó, redirigir a página de login admin
    console.log("❌ Acceso denegado a ruta admin:", req.nextUrl.pathname);
    return NextResponse.redirect(new URL('/admin', req.url));
  }

  // PROTECCIÓN DE RUTAS NO PÚBLICAS
  const publicPaths = ['/login', '/register', '/', '/api', '/recuperar-password', '/admin'];
  const isPublicPath = publicPaths.some(path => 
    req.nextUrl.pathname === path || req.nextUrl.pathname.startsWith(`${path}/`)
  );
  
  // Si es ruta pública, permitir sin verificación
  if (isPublicPath) {
    return NextResponse.next();
  }
  
  // Para cualquier otra ruta, verificar autenticación de usuario normal
  const res = NextResponse.next();
  const supabase = createMiddlewareClient({ req, res });
  const { data: { session } } = await supabase.auth.getSession();

  // Si no hay sesión, redirigir a login
  if (!session) {
    const redirectUrl = new URL("/login", req.url);
    redirectUrl.searchParams.set("redirectTo", req.nextUrl.pathname);
    return NextResponse.redirect(redirectUrl);
  }

  // Usuario autenticado, permitir acceso
  return res;
}

// Configuración específica para proteger todas las rutas admin
export const config = {
  matcher: [
    // Rutas admin con prioridad absoluta
    '/admin',
    '/admin/:path*',
    // Todas las rutas excepto estáticos y favicon
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};