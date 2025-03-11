import { NextResponse } from 'next/server';
import { MembershipService } from '@/lib/membership-service';
import { createClient } from '@supabase/supabase-js';

// Cliente Supabase con privilegios de administrador para operaciones RLS
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || '',
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

export async function GET(request: Request) {
  try {
    // Obtener ID de usuario de la consulta
    const url = new URL(request.url);
    const userId = url.searchParams.get('userId');
    
    if (!userId) {
      return NextResponse.json({ error: 'Se requiere un ID de usuario' }, { status: 400 });
    }
    
    // 1. Intentar obtener membresía usando el cliente admin primero (para bypass RLS)
    try {
      console.log("Consultando membresía con privilegios admin para:", userId);
      
      // Buscar si el usuario tiene una membresía activa
      const { data: activeMembership, error: membershipError } = await supabaseAdmin
        .from('membresias_usuarios')
        .select(`
          id,
          usuario_id,
          tipo_membresia_id,
          fecha_inicio,
          fecha_fin,
          estado,
          tipo_membresia:membresia_tipos(*)
        `)
        .eq('usuario_id', userId)
        .eq('estado', 'activa')
        .gte('fecha_fin', new Date().toISOString())
        .order('fecha_inicio', { ascending: false })
        .limit(1);
        
      if (!membershipError && activeMembership && activeMembership.length > 0) {
        console.log("✅ Membresía encontrada con privilegios admin:", activeMembership[0].id);
        return NextResponse.json({
          success: true,
          membership: activeMembership[0],
          isTemporal: false,
          source: 'admin'
        });
      } else if (membershipError) {
        console.error("Error al buscar membresía con admin:", membershipError);
      } else {
        console.log("No se encontró membresía activa con admin");
      }
    } catch (adminError) {
      console.error("Error al consultar con cliente admin:", adminError);
    }
    
    // 2. Usar el servicio de membresía como respaldo
    const membership = await MembershipService.getActiveMembership(userId);
    
    // Devolver la respuesta
    return NextResponse.json({
      success: true,
      membership: membership,
      isTemporal: membership?.estado === 'temporal',
      source: 'service'
    });
  } catch (error: any) {
    console.error('Error en API test-membership:', error);
    // En caso de error, crear una membresía temporal de respaldo
    try {
      // Obtener el userId nuevamente
      const url = new URL(request.url);
      const userId = url.searchParams.get('userId') || 'unknown';
      
      // Determinar si es un administrador (por defecto no lo es en este contexto)
      const isAdminOrSpecial = false;
      
      // Crear membresía temporal básica
      const temporaryMembership = {
        id: 'temp-api-' + Date.now(),
        usuario_id: userId,
        tipo_membresia_id: 'basic',
        fecha_inicio: new Date().toISOString(),
        fecha_fin: new Date(new Date().setFullYear(new Date().getFullYear() + 1)).toISOString(),
        estado: 'temporal',
        tipo_membresia: {
          id: 'basic',
          nombre: 'Plan Temporal ⚠️',
          descripcion: 'Esta membresía es temporal y puede afectar algunas funcionalidades.',
          precio: 0,
          tiene_ai: isAdminOrSpecial,
          limite_listas: isAdminOrSpecial ? 100 : 10,
          limite_proveedores: isAdminOrSpecial ? 50 : 5, 
          limite_articulos: isAdminOrSpecial ? 500 : 50,
          duracion_meses: 12
        }
      };
      
      return NextResponse.json({
        success: true,
        membership: temporaryMembership,
        isTemporal: true,
        source: 'fallback',
        error: error.message
      });
    } catch (fallbackError) {
      return NextResponse.json({ 
        success: false, 
        error: error.message || 'Error al obtener membresía'
      }, { status: 500 });
    }
  }
}