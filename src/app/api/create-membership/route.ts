import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Crear cliente supabase con la API key del servidor para evitar RLS
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

export async function POST(request: Request) {
  try {
    const { userId, tipoMembresiaId, fechaInicio, fechaFin, estado } = await request.json();

    // Validar parámetros requeridos
    if (!userId || !tipoMembresiaId) {
      return NextResponse.json(
        { error: 'Faltan parámetros requeridos: userId y tipoMembresiaId son obligatorios' },
        { status: 400 }
      );
    }

    // 1. Buscar si el usuario ya tiene membresías
    const { data: existingMemberships, error: queryError } = await supabaseAdmin
      .from('membresias_usuarios')
      .select('id, estado, tipo_membresia_id')
      .eq('usuario_id', userId);

    if (queryError) {
      console.error('Error al consultar membresías existentes:', queryError);
      return NextResponse.json(
        { error: `Error al consultar membresías existentes: ${queryError.message}` },
        { status: 500 }
      );
    }

    // 2. Verificar si ya existe una membresía con el mismo tipo
    // MODIFICADO: Primero desactivamos TODAS las membresías existentes
    console.log("Desactivando todas las membresías existentes antes de crear/actualizar");
    
    if (existingMemberships && existingMemberships.length > 0) {
      const allExistingIds = existingMemberships.map(m => m.id);
      
      const { error: deactivateError } = await supabaseAdmin
        .from('membresias_usuarios')
        .update({ estado: 'inactiva' })
        .in('id', allExistingIds);

      if (deactivateError) {
        console.error('Error al desactivar membresías existentes:', deactivateError);
        // No bloqueamos, continuamos con la operación
      } else {
        console.log(`Desactivadas ${allExistingIds.length} membresías existentes`);
      }
    }
    
    // Ahora creamos una nueva membresía o reactivamos una existente del mismo tipo
    const existingMembership = existingMemberships?.find(m => m.tipo_membresia_id === tipoMembresiaId);
    
    let membershipId;

    if (existingMembership) {
      // 3A. Si existe del mismo tipo, la reactivamos y actualizamos
      console.log(`Reactivando membresía existente ${existingMembership.id} del tipo ${tipoMembresiaId}`);
      
      const { data: updatedMembership, error: updateError } = await supabaseAdmin
        .from('membresias_usuarios')
        .update({
          fecha_inicio: fechaInicio || new Date().toISOString(),
          fecha_fin: fechaFin || new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
          estado: 'activa' // Siempre activamos, independientemente del parámetro estado
        })
        .eq('id', existingMembership.id)
        .select()
        .single();

      if (updateError) {
        console.error('Error al actualizar membresía existente:', updateError);
        return NextResponse.json(
          { error: `Error al actualizar membresía existente: ${updateError.message}` },
          { status: 500 }
        );
      }

      membershipId = updatedMembership.id;
      console.log(`Membresía ${membershipId} actualizada correctamente`);
    } else {
      // 3B. Si no existe del mismo tipo, crear una nueva
      console.log(`Creando nueva membresía de tipo ${tipoMembresiaId}`);
      
      const { data: newMembership, error: insertError } = await supabaseAdmin
        .from('membresias_usuarios')
        .insert({
          usuario_id: userId,
          tipo_membresia_id: tipoMembresiaId,
          fecha_inicio: fechaInicio || new Date().toISOString(),
          fecha_fin: fechaFin || new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
          estado: 'activa' // Siempre activamos, independientemente del parámetro estado
        })
        .select()
        .single();

      if (insertError) {
        console.error('Error al crear membresía:', insertError);
        return NextResponse.json(
          { error: `Error al crear membresía: ${insertError.message}` },
          { status: 500 }
        );
      }

      membershipId = newMembership.id;
      console.log(`Nueva membresía ${membershipId} creada correctamente`);
    }

    // Ya se han desactivado todas las membresías anteriormente, este paso ya no es necesario
    console.log("Todas las otras membresías ya están desactivadas");

    // 5. Actualizar referencia en usuario
    const { error: updateUserError } = await supabaseAdmin
      .from('usuarios')
      .update({ membresia_activa_id: membershipId })
      .eq('id', userId);

    if (updateUserError) {
      console.error('Error al actualizar usuario:', updateUserError);
      return NextResponse.json(
        { error: `Error al actualizar usuario: ${updateUserError.message}` },
        { status: 500 }
      );
    }

    // 6. Obtener la membresía actualizada para responder
    const { data: finalMembership, error: getMembershipError } = await supabaseAdmin
      .from('membresias_usuarios')
      .select('*')
      .eq('id', membershipId)
      .single();

    if (getMembershipError) {
      console.error('Error al obtener la membresía final:', getMembershipError);
      // No bloqueamos la operación por esto
    }

    return NextResponse.json({ 
      success: true, 
      membresia: finalMembership,
      updated: !!existingMembership
    });
  } catch (error: any) {
    console.error('Error en API create-membership:', error);
    return NextResponse.json(
      { error: `Error al procesar la solicitud: ${error.message}` },
      { status: 500 }
    );
  }
}