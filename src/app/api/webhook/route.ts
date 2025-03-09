import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { supabase } from '@/lib/supabase';

// Check if STRIPE_SECRET_KEY is available
const stripeKey = process.env.STRIPE_SECRET_KEY || 'sk_test_placeholder_key_for_build';

// Initialize Stripe with apiVersion as a separate variable to avoid build issues
const apiVersion = '2025-02-24.acacia' as Stripe.LatestApiVersion;
const stripe = new Stripe(stripeKey, { apiVersion });

// Esta función necesita estar marcada como tal para aceptar el body sin parsear
export const config = {
  api: {
    bodyParser: false,
  },
};

async function buffer(readable: ReadableStream<Uint8Array>) {
  const reader = readable.getReader();
  const chunks: Uint8Array[] = [];
  
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  
  // Concatenate all chunks
  const totalLength = chunks.reduce((acc, chunk) => acc + chunk.length, 0);
  const result = new Uint8Array(totalLength);
  let offset = 0;
  for (const chunk of chunks) {
    result.set(chunk, offset);
    offset += chunk.length;
  }
  
  return Buffer.from(result);
}

export async function POST(req: Request) {
  if (req.method !== 'POST') {
    return NextResponse.json({ message: 'Método no permitido' }, { status: 405 });
  }
  
  // Check if we're using a real Stripe key or the placeholder
  if (stripeKey === 'sk_test_placeholder_key_for_build') {
    console.error('Using placeholder Stripe key in webhook - webhooks will not work');
    return NextResponse.json(
      { error: 'Stripe is not properly configured' },
      { status: 500 }
    );
  }

  const buf = await buffer(req.body as unknown as ReadableStream);
  const signature = req.headers.get('stripe-signature');
  
  if (!signature) {
    console.error('Missing stripe-signature header');
    return NextResponse.json(
      { error: 'Missing signature header' },
      { status: 400 }
    );
  }

  let event: Stripe.Event;

  try {
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
    if (!webhookSecret) {
      console.error('Missing STRIPE_WEBHOOK_SECRET environment variable');
      return NextResponse.json(
        { error: 'Webhook secret is not configured' },
        { status: 500 }
      );
    }
    
    event = stripe.webhooks.constructEvent(
      buf.toString(),
      signature,
      webhookSecret
    );
  } catch (err) {
    const error = err as Error;
    console.error(`Error en la firma del webhook: ${error.message}`);
    return NextResponse.json(
      { error: `Error en la firma del webhook` },
      { status: 400 }
    );
  }

  // Manejar los eventos de Stripe que nos interesan
  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session;
    await handleCheckoutSessionCompleted(session);
  }

  return NextResponse.json({ received: true });
}

async function handleCheckoutSessionCompleted(session: Stripe.Checkout.Session) {
  try {
    // Obtener los metadatos del evento
    const { userId, tipoMembresiaId } = session.metadata as {
      userId: string;
      tipoMembresiaId: string;
    };

    if (!userId || !tipoMembresiaId) {
      console.error('Faltan datos en los metadatos de la sesión');
      return;
    }

    // Buscar la membresía actual del usuario
    const { data: membresiaActual, error: membresiaError } = await supabase
      .from('membresias_usuarios')
      .select('id')
      .eq('usuario_id', userId)
      .eq('estado', 'activa')
      .single();

    // Si hay una membresía activa, cambiarla a cancelada
    if (!membresiaError && membresiaActual) {
      await supabase
        .from('membresias_usuarios')
        .update({ estado: 'cancelada' })
        .eq('id', membresiaActual.id);
    }

    // Obtener el tipo de membresía seleccionado
    const { data: tipoMembresia, error: tipoError } = await supabase
      .from('membresia_tipos')
      .select('duracion_meses')
      .eq('id', tipoMembresiaId)
      .single();

    if (tipoError) {
      console.error('Error al obtener el tipo de membresía:', tipoError);
      return;
    }

    // Calcular fechas
    const fechaInicio = new Date();
    const fechaFin = new Date();
    fechaFin.setMonth(fechaFin.getMonth() + tipoMembresia.duracion_meses);

    // Verificar si ya existe una membresía con este tipo
    const { data: membresiaExistente, error: errorMembresiaExistente } = await supabase
      .from('membresias_usuarios')
      .select('id')
      .eq('usuario_id', userId)
      .eq('tipo_membresia_id', tipoMembresiaId)
      .maybeSingle();

    let idMembresia;

    // Si ya existe una membresía con este tipo, la actualizamos en lugar de crear una nueva
    if (membresiaExistente) {
      const { data: membresiaActualizada, error: errorActualizacion } = await supabase
        .from('membresias_usuarios')
        .update({
          fecha_inicio: fechaInicio.toISOString(),
          fecha_fin: fechaFin.toISOString(),
          estado: 'activa',
          stripe_subscription_id: session.subscription as string,
        })
        .eq('id', membresiaExistente.id)
        .select('id')
        .single();

      if (errorActualizacion) {
        console.error('Error al actualizar membresía existente:', errorActualizacion);
        return;
      }

      idMembresia = membresiaActualizada.id;
    } else {
      // Si no existe, crear una nueva
      const { data: nuevaMembresia, error: nuevaMembresiaError } = await supabase
        .from('membresias_usuarios')
        .insert({
          usuario_id: userId,
          tipo_membresia_id: tipoMembresiaId,
          fecha_inicio: fechaInicio.toISOString(),
          fecha_fin: fechaFin.toISOString(),
          estado: 'activa',
          stripe_subscription_id: session.subscription as string,
        })
        .select('id')
        .single();

      if (nuevaMembresiaError) {
        console.error('Error al crear nueva membresía:', nuevaMembresiaError);
        return;
      }

      idMembresia = nuevaMembresia.id;
    }

    // Actualizar la membresía activa en el perfil del usuario
    const { error: updateError } = await supabase
      .from('usuarios')
      .update({ membresia_activa_id: idMembresia })
      .eq('id', userId);

    if (updateError) {
      console.error('Error al actualizar membresía del usuario:', updateError);
    }
    
    // Desactivar otras membresías activas (si existen)
    const { data: otrasMembresias, error: errorConsulta } = await supabase
      .from('membresias_usuarios')
      .select('id')
      .eq('usuario_id', userId)
      .eq('estado', 'activa')
      .neq('id', idMembresia);
      
    if (!errorConsulta && otrasMembresias && otrasMembresias.length > 0) {
      const idsDesactivar = otrasMembresias.map(m => m.id);
      
      const { error: errorDesactivacion } = await supabase
        .from('membresias_usuarios')
        .update({ estado: 'inactiva' })
        .in('id', idsDesactivar);
        
      if (errorDesactivacion) {
        console.error('Error al desactivar otras membresías:', errorDesactivacion);
      }
    }
  } catch (error) {
    console.error('Error general al procesar el pago:', error);
  }
}