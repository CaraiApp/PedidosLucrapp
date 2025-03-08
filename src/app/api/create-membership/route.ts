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

    // Insertar membresía usando cliente con Service Role
    const { data: membresia, error: membresiaError } = await supabaseAdmin
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

    if (membresiaError) {
      console.error('Error al crear membresía:', membresiaError);
      return NextResponse.json(
        { error: `Error al crear membresía: ${membresiaError.message}` },
        { status: 500 }
      );
    }

    // Actualizar referencia en usuario
    const { error: updateError } = await supabaseAdmin
      .from('usuarios')
      .update({ membresia_activa_id: membresia.id })
      .eq('id', userId);

    if (updateError) {
      console.error('Error al actualizar usuario:', updateError);
      return NextResponse.json(
        { error: `Error al actualizar usuario: ${updateError.message}` },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, membresia });
  } catch (error: any) {
    console.error('Error en API create-membership:', error);
    return NextResponse.json(
      { error: `Error al procesar la solicitud: ${error.message}` },
      { status: 500 }
    );
  }
}