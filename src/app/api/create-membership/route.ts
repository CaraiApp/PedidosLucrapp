import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Crear cliente supabase con la API key del servidor para evitar RLS
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
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
    const existingMembership = existingMemberships?.find(m => m.tipo_membresia_id === tipoMembresiaId);
    
    let membershipId;

    if (existingMembership) {
      // 3A. Si existe, actualizarla en lugar de crear una nueva
      const { data: updatedMembership, error: updateError } = await supabaseAdmin
        .from('membresias_usuarios')
        .update({
          fecha_inicio: fechaInicio || new Date().toISOString(),
          fecha_fin: fechaFin || new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
          estado: estado || 'activa'
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
    } else {
      // 3B. Si no existe, crear una nueva
      const { data: newMembership, error: insertError } = await supabaseAdmin
        .from('membresias_usuarios')
        .insert({
          usuario_id: userId,
          tipo_membresia_id: tipoMembresiaId,
          fecha_inicio: fechaInicio || new Date().toISOString(),
          fecha_fin: fechaFin || new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
          estado: estado || 'activa'
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
    }

    // 4. Desactivar otras membresías activas (si existen)
    if (existingMemberships && existingMemberships.length > 0) {
      const otherActiveIds = existingMemberships
        .filter(m => m.estado === 'activa' && m.id !== membershipId)
        .map(m => m.id);

      if (otherActiveIds.length > 0) {
        const { error: deactivateError } = await supabaseAdmin
          .from('membresias_usuarios')
          .update({ estado: 'inactiva' })
          .in('id', otherActiveIds);

        if (deactivateError) {
          console.error('Error al desactivar otras membresías:', deactivateError);
          // No bloqueamos la operación por esto
        }
      }
    }

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