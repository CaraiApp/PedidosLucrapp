import { createMiddlewareClient } from "@supabase/auth-helpers-nextjs";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Este middleware protege todas las rutas que comienzan con /dashboard, /proveedores, /articulos, /listas
export async function middleware(req: NextRequest) {
  const res = NextResponse.next();
  const supabase = createMiddlewareClient({ req, res });

  const {
    data: { session },
  } = await supabase.auth.getSession();

  // Si el usuario no está autenticado y está intentando acceder a rutas protegidas
  if (
    !session &&
    (req.nextUrl.pathname.startsWith("/dashboard") ||
      req.nextUrl.pathname.startsWith("/proveedores") ||
      req.nextUrl.pathname.startsWith("/articulos") ||
      req.nextUrl.pathname.startsWith("/listas-compra") ||
      req.nextUrl.pathname.startsWith("/membresias"))
  ) {
    // Crear la URL de redirección al login
    const redirectUrl = new URL("/login", req.url);
    
    // Guardar la URL original para redirección después del login
    if (req.nextUrl.pathname) {
      redirectUrl.searchParams.set("redirectTo", req.nextUrl.pathname);
    }
    
    return NextResponse.redirect(redirectUrl);
  }

  // Si el usuario ya está autenticado e intenta acceder a página de login o registro, redirigir al dashboard
  if (
    session &&
    (req.nextUrl.pathname.startsWith("/login") ||
      req.nextUrl.pathname.startsWith("/register"))
  ) {
    // Agregamos un pequeño retraso para asegurar que la sesión esté completamente cargada
    return NextResponse.redirect(new URL("/dashboard", req.url));
  }

  return res;
}

// Configurar rutas para las que se aplicará el middleware
export const config = {
  matcher: [
    "/dashboard/:path*",
    "/proveedores/:path*",
    "/articulos/:path*",
    "/listas-compra/:path*",
    "/membresias/:path*",
    "/login",
    "/register",
  ],
};
