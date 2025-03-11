import { NextResponse } from 'next/server';
import { MembershipService } from '@/lib/membership-service';

export async function GET(request: Request) {
  try {
    // Obtener ID de usuario de la consulta
    const url = new URL(request.url);
    const userId = url.searchParams.get('userId');
    
    if (!userId) {
      return NextResponse.json({ error: 'Se requiere un ID de usuario' }, { status: 400 });
    }
    
    // Obtener la membresía usando el servicio
    const membership = await MembershipService.getActiveMembership(userId);
    
    // Devolver la respuesta
    return NextResponse.json({
      success: true,
      membership: membership,
      isTemporal: membership?.estado === 'temporal'
    });
  } catch (error: any) {
    console.error('Error en API test-membership:', error);
    return NextResponse.json({ 
      success: false, 
      error: error.message || 'Error al obtener membresía'
    }, { status: 500 });
  }
}