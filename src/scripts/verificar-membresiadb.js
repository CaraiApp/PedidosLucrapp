// src/scripts/verificar-membresiadb.js
import { supabase } from '../lib/supabase.js';

async function verificarEstructuraMembresia() {
  console.log('Verificando estructura de las tablas de membresía...');
  
  // 1. Verificar tabla membresia_tipos
  const { data: tipoMembresia, error: tipoError } = await supabase
    .from('membresia_tipos')
    .select('*')
    .limit(1);
  
  if (tipoError) {
    console.error('Error al consultar membresia_tipos:', tipoError.message);
  } else {
    console.log('Tabla membresia_tipos encontrada');
    console.log('Estructura de membresia_tipos:', tipoMembresia[0] ? Object.keys(tipoMembresia[0]) : 'Sin datos');
  }
  
  // 2. Verificar tabla membresias_usuarios
  const { data: membresiasUsuarios, error: membresiasError } = await supabase
    .from('membresias_usuarios')
    .select('*')
    .limit(1);
  
  if (membresiasError) {
    console.error('Error al consultar membresias_usuarios:', membresiasError.message);
  } else {
    console.log('Tabla membresias_usuarios encontrada');
    console.log('Estructura de membresias_usuarios:', membresiasUsuarios[0] ? Object.keys(membresiasUsuarios[0]) : 'Sin datos');
  }
  
  // 3. Verificar relación en tabla usuarios
  const { data: usuarioMembresia, error: usuarioError } = await supabase
    .from('usuarios')
    .select(`
      id,
      membresia_activa_id
    `)
    .limit(1);
  
  if (usuarioError) {
    console.error('Error al consultar usuarios:', usuarioError.message);
  } else {
    console.log('Tabla usuarios encontrada');
    console.log('Verifica si existe membresia_activa_id:', usuarioMembresia[0] ? Object.keys(usuarioMembresia[0]).includes('membresia_activa_id') : 'Sin datos');
  }
}

// Ejecutar la verificación
verificarEstructuraMembresia().catch(console.error);