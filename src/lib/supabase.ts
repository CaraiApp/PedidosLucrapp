import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Funciones de utilidad para trabajar con Supabase

// Verificar si un usuario ha alcanzado el límite de un recurso
export async function verificarLimiteAlcanzado(
  tipo: "proveedores" | "articulos" | "listas",
  userId: string
) {
  console.log(`Verificando límite de ${tipo} para usuario ${userId}`); // Log para verificar
  
  // Forzar un límite muy bajo para pruebas (eliminar en producción)
  if (tipo === "listas") {
    console.log("OVERRIDE: Forzando verificación limitada para listas");
    
    // Contar listas actuales
    const { count, error: countError } = await supabase
      .from("listas_compra")
      .select("*", { count: "exact", head: true })
      .eq("usuario_id", userId);
    
    if (countError) {
      console.error("Error al contar listas:", countError);
      return true; // En caso de error, restringir por seguridad
    }
    
    console.log(`Usuario tiene ${count} listas, límite forzado: 3`);
    const excedido = count !== null && count >= 3;
    console.log(`Límite excedido: ${excedido}`);
    
    // Límite bajo para pruebas: solo 3 listas
    return excedido;
  }
  try {
    // 1. Obtener la membresía activa del usuario
    const { data: userData, error: userError } = await supabase
      .from("usuarios")
      .select(
        `
        membresia_activa: membresias_usuarios!left(
          tipo_membresia: membresia_tipos(*)
        )
      `
      )
      .eq("id", userId)
      .single();

    if (userError) {
      console.error("Error al obtener información de membresía:", userError);
      return true; // En caso de error, restringir por seguridad
    }

    // Si no tiene membresía activa, asignar valores por defecto de la membresía gratuita
    if (!userData || !userData.membresia_activa || !userData.membresia_activa.tipo_membresia) {
      console.log("Usuario sin membresía activa. Usando límites por defecto.");
      
      // Límites por defecto para la membresía gratuita
      let limiteDefecto = 0;
      switch (tipo) {
        case "proveedores":
          limiteDefecto = 5;
          break;
        case "articulos":
          limiteDefecto = 50;
          break;
        case "listas":
          limiteDefecto = 10;
          break;
      }
      
      // Contar recursos actuales
      let tabla: string;
      switch (tipo) {
        case "proveedores":
          tabla = "proveedores";
          break;
        case "articulos":
          tabla = "articulos";
          break;
        case "listas":
          tabla = "listas_compra";
          break;
        default:
          return true; // Tipo no reconocido, restringir por seguridad
      }
      
      // Contar recursos actuales
      console.log(`Contando ${tipo} en tabla ${tabla} para usuario ${userId}`);
      
      const { count, error: countError } = await supabase
        .from(tabla)
        .select("*", { count: "exact", head: true })
        .eq("usuario_id", userId);
        
      if (countError) {
        console.error(`Error al contar ${tipo}:`, countError);
        return true;
      }
      
      console.log(`Usuario tiene ${count} ${tipo} de un límite de ${limiteDefecto}`);
      
      const limiteAlcanzado = count !== null && count >= limiteDefecto;
      console.log(`Límite alcanzado: ${limiteAlcanzado}`);
      
      return limiteAlcanzado;
    }

    const membresia = userData.membresia_activa;

    // Si la membresía no tiene límite para este recurso, no hay restricción
    let limiteField: string;

    switch (tipo) {
      case "proveedores":
        limiteField = "limite_proveedores";
        break;
      case "articulos":
        limiteField = "limite_articulos";
        break;
      case "listas":
        limiteField = "limite_listas";
        break;
      default:
        return true; // Tipo no reconocido, restringir por seguridad
    }

    const limite = membresia.tipo_membresia[limiteField];

    // Si no hay límite (null o 0), retornar false (no alcanzado)
    if (!limite) {
      return false;
    }

    // 2. Contar cantidad actual de recursos
    let tabla: string;

    switch (tipo) {
      case "proveedores":
        tabla = "proveedores";
        break;
      case "articulos":
        tabla = "articulos";
        break;
      case "listas":
        tabla = "listas_compra";
        break;
      default:
        return true; // Tipo no reconocido, restringir por seguridad
    }

    console.log(`Contando ${tipo} en tabla ${tabla} para usuario ${userId} (membresía activa)`);
    
    const { count, error: countError } = await supabase
      .from(tabla)
      .select("*", { count: "exact", head: true })
      .eq("usuario_id", userId);

    if (countError) {
      console.error(`Error al contar ${tipo}:`, countError);
      return true; // En caso de error, restringir por seguridad
    }

    console.log(`Usuario tiene ${count} ${tipo} de un límite de ${limite} (membresía activa)`);
    
    // 3. Verificar si ha alcanzado el límite
    const limiteAlcanzado = count !== null && count >= limite;
    console.log(`Límite alcanzado (membresía activa): ${limiteAlcanzado}`);
    
    return limiteAlcanzado;
  } catch (error) {
    console.error("Error al verificar límite:", error);
    return true; // En caso de error, restringir por seguridad
  }
}

// Obtener estadísticas de uso
export async function obtenerEstadisticasUso(userId: string) {
  try {
    // Realizar todas las consultas en paralelo para optimizar
    const [proveedoresRes, articulosRes, listasRes, membresiaRes] =
      await Promise.all([
        // Contar proveedores
        supabase
          .from("proveedores")
          .select("*", { count: "exact", head: true })
          .eq("usuario_id", userId),

        // Contar artículos
        supabase
          .from("articulos")
          .select("*", { count: "exact", head: true })
          .eq("usuario_id", userId),

        // Contar listas de compra
        supabase
          .from("listas_compra")
          .select("*", { count: "exact", head: true })
          .eq("usuario_id", userId),

        // Obtener información de membresía - usando LEFT JOIN en lugar de INNER JOIN
        supabase
          .from("usuarios")
          .select("membresia_activa_id")
          .eq("id", userId)
          .single(),
      ]);

    // Manejar errores
    if (
      proveedoresRes.error ||
      articulosRes.error ||
      listasRes.error ||
      membresiaRes.error
    ) {
      console.error(
        "Error al obtener estadísticas:",
        proveedoresRes.error ||
          articulosRes.error ||
          listasRes.error ||
          membresiaRes.error
      );
      return null;
    }

    // Si no se encontró información de membresía, usar valores por defecto
    let membresiaData = null;
    
    // Verificamos si hay una membresía activa
    if (membresiaRes.data && membresiaRes.data.membresia_activa_id) {
      try {
        // Obtenemos los detalles de la membresía
        const { data: membresiaUsuario, error: membresiaError } = await supabase
          .from("membresias_usuarios")
          .select(`
            *,
            tipo_membresia: membresia_tipos(*)
          `)
          .eq("id", membresiaRes.data.membresia_activa_id)
          .single();
          
        if (!membresiaError && membresiaUsuario) {
          membresiaData = membresiaUsuario;
        }
      } catch (err) {
        console.error("Error al cargar detalles de membresía:", err);
      }
    }
    
    // Si no hay membresía, usamos valores por defecto
    if (!membresiaData) {
      console.log("No se encontró información de membresía para el usuario. Usando valores por defecto.");
      return {
        totalProveedores: proveedoresRes.count || 0,
        totalArticulos: articulosRes.count || 0,
        totalListas: listasRes.count || 0,
        membresia: {
          id: "default",
          tipo_id: "13fae609-2679-47fa-9731-e2f1badc4a61", // ID de la membresía gratuita
          nombre: "Plan Básico",
          limiteProveedores: 5,
          limiteArticulos: 50,
          limiteListas: 10,
          fechaInicio: new Date().toISOString(),
          fechaFin: new Date(new Date().setFullYear(new Date().getFullYear() + 1)).toISOString(),
        },
      };
    }

    // Si tenemos membresía válida, usamos sus valores
    const tipoMembresia = membresiaData.tipo_membresia;

    return {
      totalProveedores: proveedoresRes.count || 0,
      totalArticulos: articulosRes.count || 0,
      totalListas: listasRes.count || 0,
      membresia: {
        id: membresiaData.id,
        tipo_id: tipoMembresia.id,
        nombre: tipoMembresia.nombre,
        limiteProveedores: tipoMembresia.limite_proveedores || 0,
        limiteArticulos: tipoMembresia.limite_articulos || 0,
        limiteListas: tipoMembresia.limite_listas || 0,
        fechaInicio: membresiaData.fecha_inicio,
        fechaFin: membresiaData.fecha_fin,
      },
    };
  } catch (error) {
    console.error("Error al obtener estadísticas:", error);
    return null;
  }
}
