// src/scripts/verificar-estructura.mjs
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://xmldtgmmduvvraknfwfp.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhtbGR0Z21tZHV2dnJha25md2ZwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDExNzUwMzAsImV4cCI6MjA1Njc1MTAzMH0.__tJ5KZUbMDd7tv5UiWNNQAqKxrFKTtwyGF51qOnXTw'
const supabase = createClient(supabaseUrl, supabaseKey)

async function verificarEstructuraMembresia() {
  console.log('Verificando estructura de las tablas de membresía...')
  
  // 1. Verificar tabla membresia_tipos
  const { data: tipoMembresia, error: tipoError } = await supabase
    .from('membresia_tipos')
    .select('*')
    .limit(1)
  
  if (tipoError) {
    console.error('Error al consultar membresia_tipos:', tipoError.message)
  } else {
    console.log('Tabla membresia_tipos encontrada')
    console.log('Estructura de membresia_tipos:', tipoMembresia[0] ? Object.keys(tipoMembresia[0]) : 'Sin datos')
    if (tipoMembresia[0]) console.log(tipoMembresia[0])
  }
  
  // 2. Verificar tabla membresias_usuarios
  const { data: membresiasUsuarios, error: membresiasError } = await supabase
    .from('membresias_usuarios')
    .select('*')
    .limit(1)
  
  if (membresiasError) {
    console.error('Error al consultar membresias_usuarios:', membresiasError.message)
  } else {
    console.log('Tabla membresias_usuarios encontrada')
    console.log('Estructura de membresias_usuarios:', membresiasUsuarios[0] ? Object.keys(membresiasUsuarios[0]) : 'Sin datos')
    if (membresiasUsuarios[0]) console.log(membresiasUsuarios[0])
  }
  
  // 3. Verificar relación en tabla usuarios
  const { data: usuarioMembresia, error: usuarioError } = await supabase
    .from('usuarios')
    .select('*')
    .limit(1)
  
  if (usuarioError) {
    console.error('Error al consultar usuarios:', usuarioError.message)
  } else {
    console.log('Tabla usuarios encontrada')
    console.log('Campos de usuarios:', usuarioMembresia[0] ? Object.keys(usuarioMembresia[0]) : 'Sin datos')
    if (usuarioMembresia[0]) console.log(usuarioMembresia[0])
  }
}

// Ejecutar la verificación
verificarEstructuraMembresia().catch(console.error)