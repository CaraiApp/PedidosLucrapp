/**
 * Script para verificar y gestionar membresías
 * Este script puede ejecutarse periódicamente para:
 * 1. Marcar como caducadas las membresías vencidas
 * 2. Reasignar membresías activas cuando sea necesario
 * 3. Evitar tener múltiples membresías activas para un mismo usuario
 */

import { supabase } from '../lib/supabase.js';

async function verificarMembresiasCaducadas() {
  console.log('Verificando membresías caducadas...');
  
  // 1. Marcar como caducadas las membresías vencidas
  const { data: membresiasCaducadas, error: caducarError } = await supabase
    .from('membresias_usuarios')
    .update({ estado: 'caducada' })
    .eq('estado', 'activa')
    .lt('fecha_fin', new Date().toISOString())
    .select('id, usuario_id');
    
  if (caducarError) {
    console.error('Error al marcar membresías caducadas:', caducarError.message);
    return;
  }
  
  console.log(`${membresiasCaducadas?.length || 0} membresías marcadas como caducadas`);
  
  // Si no hay membresías caducadas, terminamos
  if (!membresiasCaducadas || membresiasCaducadas.length === 0) {
    console.log('No hay membresías caducadas para procesar');
    return;
  }
  
  // 2. Para cada usuario afectado, actualizar su membresía activa
  const usuariosAfectados = [...new Set(membresiasCaducadas.map(m => m.usuario_id))];
  console.log(`${usuariosAfectados.length} usuarios afectados por membresías caducadas`);
  
  for (const userId of usuariosAfectados) {
    console.log(`\nProcesando usuario: ${userId}`);
    
    // 2.1 Verificar si el usuario tiene su membresía activa caducada
    const { data: usuario, error: usuarioError } = await supabase
      .from('usuarios')
      .select('membresia_activa_id')
      .eq('id', userId)
      .single();
      
    if (usuarioError) {
      console.error(`Error al obtener información del usuario ${userId}:`, usuarioError.message);
      continue;
    }
    
    // 2.2 Verificar si la membresía activa está caducada
    const { data: membresiaActiva, error: membresiaError } = await supabase
      .from('membresias_usuarios')
      .select('id, estado, fecha_fin')
      .eq('id', usuario.membresia_activa_id)
      .single();
      
    if (membresiaError) {
      console.error(`Error al obtener membresía activa ${usuario.membresia_activa_id}:`, membresiaError.message);
      continue;
    }
    
    if (membresiaActiva.estado !== 'caducada') {
      console.log(`La membresía activa del usuario ${userId} no está caducada, saltando...`);
      continue;
    }
    
    console.log(`La membresía activa del usuario ${userId} está caducada, buscando alternativa...`);
    
    // 2.3 Buscar otra membresía activa para el usuario
    const { data: membresiaAlternativa, error: alternativaError } = await supabase
      .from('membresias_usuarios')
      .select('id')
      .eq('usuario_id', userId)
      .eq('estado', 'activa')
      .order('fecha_inicio', { ascending: false })
      .limit(1)
      .single();
      
    if (alternativaError && alternativaError.code !== 'PGRST116') { // PGRST116 = No hay resultados
      console.error(`Error al buscar membresía alternativa para ${userId}:`, alternativaError.message);
      continue;
    }
    
    if (membresiaAlternativa) {
      // Si encontramos una membresía activa, la asignamos
      console.log(`Encontrada membresía alternativa: ${membresiaAlternativa.id}`);
      
      const { error: updateError } = await supabase
        .from('usuarios')
        .update({ membresia_activa_id: membresiaAlternativa.id })
        .eq('id', userId);
        
      if (updateError) {
        console.error(`Error al actualizar usuario ${userId} con membresía alternativa:`, updateError.message);
      } else {
        console.log(`Usuario ${userId} actualizado con membresía alternativa ${membresiaAlternativa.id}`);
      }
    } else {
      // Si no hay membresía activa, asignar plan gratuito
      console.log(`No se encontró membresía alternativa para ${userId}, asignando plan gratuito...`);
      
      // ID del tipo de membresía gratuita
      const tipoMembresiaGratuitaId = '13fae609-2679-47fa-9731-e2f1badc4a61'; // Ajustar según tu base de datos
      
      // Buscar si ya tiene una membresía gratuita
      const { data: membresiaGratuita, error: gratuitaError } = await supabase
        .from('membresias_usuarios')
        .select('id')
        .eq('usuario_id', userId)
        .eq('tipo_membresia_id', tipoMembresiaGratuitaId)
        .in('estado', ['activa', 'inactiva'])
        .order('fecha_inicio', { ascending: false })
        .limit(1)
        .single();
        
      if (gratuitaError && gratuitaError.code !== 'PGRST116') {
        console.error(`Error al buscar membresía gratuita para ${userId}:`, gratuitaError.message);
        continue;
      }
      
      if (membresiaGratuita) {
        // Si ya tiene una membresía gratuita, la reactivamos
        console.log(`Reactivando membresía gratuita existente: ${membresiaGratuita.id}`);
        
        const fechaInicio = new Date().toISOString();
        const fechaFin = new Date();
        fechaFin.setFullYear(fechaFin.getFullYear() + 10); // 10 años
        
        const { error: reactivarError } = await supabase
          .from('membresias_usuarios')
          .update({ 
            estado: 'activa',
            fecha_inicio: fechaInicio,
            fecha_fin: fechaFin.toISOString()
          })
          .eq('id', membresiaGratuita.id);
          
        if (reactivarError) {
          console.error(`Error al reactivar membresía gratuita ${membresiaGratuita.id}:`, reactivarError.message);
          continue;
        }
        
        // Actualizar el usuario
        const { error: updateError } = await supabase
          .from('usuarios')
          .update({ membresia_activa_id: membresiaGratuita.id })
          .eq('id', userId);
          
        if (updateError) {
          console.error(`Error al actualizar usuario ${userId} con membresía gratuita:`, updateError.message);
        } else {
          console.log(`Usuario ${userId} actualizado con membresía gratuita reactivada ${membresiaGratuita.id}`);
        }
      } else {
        // Si no tiene una membresía gratuita, creamos una nueva
        console.log(`Creando nueva membresía gratuita para ${userId}`);
        
        const fechaInicio = new Date().toISOString();
        const fechaFin = new Date();
        fechaFin.setFullYear(fechaFin.getFullYear() + 10); // 10 años
        
        const { data: nuevaMembresia, error: nuevaError } = await supabase
          .from('membresias_usuarios')
          .insert({
            usuario_id: userId,
            tipo_membresia_id: tipoMembresiaGratuitaId,
            fecha_inicio: fechaInicio,
            fecha_fin: fechaFin.toISOString(),
            estado: 'activa'
          })
          .select('id')
          .single();
          
        if (nuevaError) {
          console.error(`Error al crear nueva membresía gratuita para ${userId}:`, nuevaError.message);
          continue;
        }
        
        // Actualizar el usuario
        const { error: updateError } = await supabase
          .from('usuarios')
          .update({ membresia_activa_id: nuevaMembresia.id })
          .eq('id', userId);
          
        if (updateError) {
          console.error(`Error al actualizar usuario ${userId} con nueva membresía gratuita:`, updateError.message);
        } else {
          console.log(`Usuario ${userId} actualizado con nueva membresía gratuita ${nuevaMembresia.id}`);
        }
      }
    }
  }
}

async function limpiarMembresiasDuplicadas() {
  console.log('\nLimpiando membresías duplicadas...');
  
  // 1. Obtener todos los usuarios que tienen más de una membresía activa
  const { data: usuariosConMultiples, error: multipleError } = await supabase
    .rpc('usuarios_con_multiples_membresias_activas');
    
  if (multipleError) {
    console.error('Error al buscar usuarios con múltiples membresías activas:', multipleError.message);
    return;
  }
  
  console.log(`${usuariosConMultiples?.length || 0} usuarios tienen múltiples membresías activas`);
  
  // Si no hay usuarios con múltiples membresías, terminamos
  if (!usuariosConMultiples || usuariosConMultiples.length === 0) {
    console.log('No hay usuarios con múltiples membresías activas');
    return;
  }
  
  // 2. Para cada usuario, dejar solo la membresía más reciente activa
  for (const usuario of usuariosConMultiples) {
    console.log(`\nProcesando usuario ${usuario.usuario_id} con ${usuario.count} membresías activas`);
    
    // 2.1 Obtener todas las membresías activas del usuario
    const { data: membresiasActivas, error: activasError } = await supabase
      .from('membresias_usuarios')
      .select('id, tipo_membresia_id, fecha_inicio')
      .eq('usuario_id', usuario.usuario_id)
      .eq('estado', 'activa')
      .order('fecha_inicio', { ascending: false });
      
    if (activasError) {
      console.error(`Error al obtener membresías activas para ${usuario.usuario_id}:`, activasError.message);
      continue;
    }
    
    if (!membresiasActivas || membresiasActivas.length <= 1) {
      console.log(`No se encontraron múltiples membresías activas para ${usuario.usuario_id}`);
      continue;
    }
    
    // 2.2 Dejar activa solo la más reciente (la primera)
    const membresiaReciente = membresiasActivas[0];
    const membresiasADesactivar = membresiasActivas.slice(1);
    
    console.log(`Manteniendo activa la membresía ${membresiaReciente.id}`);
    console.log(`Desactivando ${membresiasADesactivar.length} membresías antiguas`);
    
    // 2.3 Desactivar las membresías antiguas
    for (const membresia of membresiasADesactivar) {
      const { error: desactivarError } = await supabase
        .from('membresias_usuarios')
        .update({ estado: 'inactiva' })
        .eq('id', membresia.id);
        
      if (desactivarError) {
        console.error(`Error al desactivar membresía ${membresia.id}:`, desactivarError.message);
      } else {
        console.log(`Membresía ${membresia.id} desactivada correctamente`);
      }
    }
    
    // 2.4 Verificar que la membresía activa del usuario sea la más reciente
    const { data: usuarioInfo, error: infoError } = await supabase
      .from('usuarios')
      .select('membresia_activa_id')
      .eq('id', usuario.usuario_id)
      .single();
      
    if (infoError) {
      console.error(`Error al obtener información del usuario ${usuario.usuario_id}:`, infoError.message);
      continue;
    }
    
    if (usuarioInfo.membresia_activa_id !== membresiaReciente.id) {
      console.log(`La membresía activa del usuario no es la más reciente. Actualizando...`);
      
      const { error: updateError } = await supabase
        .from('usuarios')
        .update({ membresia_activa_id: membresiaReciente.id })
        .eq('id', usuario.usuario_id);
        
      if (updateError) {
        console.error(`Error al actualizar membresía activa del usuario ${usuario.usuario_id}:`, updateError.message);
      } else {
        console.log(`Usuario ${usuario.usuario_id} actualizado con membresía reciente ${membresiaReciente.id}`);
      }
    } else {
      console.log(`La membresía activa del usuario ya es la más reciente: ${membresiaReciente.id}`);
    }
  }
}

// Ejecutar todas las verificaciones
async function verificarSistemaMembresías() {
  console.log('=== INICIANDO VERIFICACIÓN DE MEMBRESÍAS ===');
  
  try {
    // 1. Verificar membresías caducadas
    await verificarMembresiasCaducadas();
    
    // 2. Limpiar membresías duplicadas
    await limpiarMembresiasDuplicadas();
    
    console.log('\n=== VERIFICACIÓN DE MEMBRESÍAS COMPLETADA ===');
  } catch (error) {
    console.error('Error durante la verificación de membresías:', error);
  }
}

// Ejecutar el script
verificarSistemaMembresías().catch(console.error);