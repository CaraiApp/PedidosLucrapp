import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { supabase } from '@/lib/supabase';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-02-24.acacia',
});

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

  const buf = await buffer(req.body as unknown as ReadableStream);
  const signature = req.headers.get('stripe-signature')!;

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(
      buf.toString(),
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
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

    // Crear nueva membresía
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

    // Actualizar la membresía activa en el perfil del usuario
    const { error: updateError } = await supabase
      .from('usuarios')
      .update({ membresia_activa_id: nuevaMembresia.id })
      .eq('id', userId);

    if (updateError) {
      console.error('Error al actualizar membresía del usuario:', updateError);
    }
  } catch (error) {
    console.error('Error general al procesar el pago:', error);
  }
}