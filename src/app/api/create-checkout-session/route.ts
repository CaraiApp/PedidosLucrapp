import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { supabase } from '@/lib/supabase';

// Check if STRIPE_SECRET_KEY is available
const stripeKey = process.env.STRIPE_SECRET_KEY;
if (!stripeKey) {
  console.warn('Missing STRIPE_SECRET_KEY environment variable');
}

// Initialize Stripe only if key is available
const stripe = stripeKey 
  ? new Stripe(stripeKey, { apiVersion: '2025-02-24.acacia' }) 
  : null;

export async function POST(req: Request) {
  try {
    // Check if Stripe is initialized
    if (!stripe) {
      console.error('Stripe is not initialized - missing API key');
      return NextResponse.json(
        { error: 'Stripe configuration is missing' },
        { status: 500 }
      );
    }
    
    const { priceId, userId, tipoMembresiaId } = await req.json();

    // Verificar que los datos necesarios estén presentes
    if (!priceId || !userId || !tipoMembresiaId) {
      return NextResponse.json(
        { error: 'Faltan datos necesarios para crear la sesión' },
        { status: 400 }
      );
    }

    // Obtener información del usuario para el checkout
    const { data: userData, error: userError } = await supabase
      .from('usuarios')
      .select('email, nombre, apellidos')
      .eq('id', userId)
      .single();

    if (userError) {
      console.error('Error al obtener datos del usuario:', userError);
      return NextResponse.json(
        { error: 'No se pudo obtener información del usuario' },
        { status: 500 }
      );
    }

    // URL para redirigir después del pago
    const successUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/dashboard/pago-completado`;
    const cancelUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/membresias?payment=cancelled`;

    // Crear sesión de checkout
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      mode: 'subscription',
      success_url: successUrl,
      cancel_url: cancelUrl,
      customer_email: userData?.email,
      client_reference_id: userId,
      metadata: {
        userId: userId,
        tipoMembresiaId: tipoMembresiaId,
      },
    });

    return NextResponse.json({ sessionId: session.id });
  } catch (error) {
    console.error('Error al crear sesión de checkout:', error);
    return NextResponse.json(
      { error: 'Error al crear sesión de checkout' },
      { status: 500 }
    );
  }
}