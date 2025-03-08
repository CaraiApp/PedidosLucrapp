import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { Usuario, SupabaseError, DatosFacturacion } from '@/types';

interface AuthState {
  user: Usuario | null;
  isLoading: boolean;
  error: string | null;
}

export function useAuth() {
  const router = useRouter();
  const [state, setState] = useState<AuthState>({
    user: null,
    isLoading: true,
    error: null,
  });

  useEffect(() => {
    // Verificar sesión actual al montar el componente
    const checkSession = async () => {
      try {
        setState(prev => ({ ...prev, isLoading: true, error: null }));
        
        // Obtener sesión activa
        const { data: sessionData } = await supabase.auth.getSession();
        
        if (!sessionData.session) {
          setState({ 
            user: null, 
            isLoading: false, 
            error: null 
          });
          return;
        }
        
        // Obtener datos del usuario básicos primero
        const { data: userData, error: userError } = await supabase
          .from('usuarios')
          .select('*')
          .eq('id', sessionData.session.user.id)
          .single();
          
        // Si obtenemos el usuario correctamente, intentamos obtener su membresía activa
        if (!userError && userData) {
          if (userData.membresia_activa_id) {
            // Obtener la membresía activa del usuario
            const { data: membresiaData, error: membresiaError } = await supabase
              .from('membresias_usuarios')
              .select(`
                id,
                tipo_membresia:membresia_tipos(*),
                fecha_inicio,
                fecha_fin,
                estado
              `)
              .eq('id', userData.membresia_activa_id)
              .single();
              
            if (!membresiaError && membresiaData) {
              // Agregar la membresía al objeto de usuario
              userData.membresia_activa = membresiaData;
            } else {
              console.log('No se pudo cargar la membresía activa:', membresiaError);
              userData.membresia_activa = null;
            }
          } else {
            userData.membresia_activa = null;
          }
        }
          
        if (userError) {
          console.error('Error al obtener datos del usuario:', userError);
          // Si no encontramos el usuario o hay otro error, creamos un usuario básico
          if (userError.code === 'PGRST116') { // No hay resultados
            // Intentar crear el usuario en la tabla personalizada
            console.log("Creando usuario en la tabla personalizada");
            const { data: newUser, error: insertError } = await supabase
              .from('usuarios')
              .insert({
                id: sessionData.session.user.id,
                email: sessionData.session.user.email,
                username: sessionData.session.user.email?.split('@')[0] || 'usuario',
                created_at: new Date().toISOString()
              })
              .select('*')
              .single();
              
            if (insertError) {
              console.error('Error al crear nuevo usuario:', insertError);
              throw insertError;
            }
            
            // Asignar membresía gratuita por defecto al usuario nuevo
            try {
              console.log("Asignando membresía gratuita por defecto");
              
              // Calcular fechas
              const fechaInicio = new Date().toISOString();
              const fechaFin = new Date();
              fechaFin.setFullYear(fechaFin.getFullYear() + 1); // Plan gratuito por 1 año
              
              // Crear registro de membresía
              const { data: membresia, error: membresiaError } = await supabase
                .from("membresias_usuarios")
                .insert({
                  usuario_id: newUser.id,
                  membresia_id: "13fae609-2679-47fa-9731-e2f1badc4a61", // ID de la membresía gratuita
                  fecha_inicio: fechaInicio,
                  fecha_fin: fechaFin.toISOString(),
                  estado: "activa"
                })
                .select()
                .single();
                
              if (membresiaError) throw membresiaError;
              
              // Actualizar el usuario para establecer esta membresía como la activa
              const { error: updateError } = await supabase
                .from("usuarios")
                .update({ membresia_activa_id: membresia.id })
                .eq("id", newUser.id);
                
              if (updateError) throw updateError;
              
              // Obtener datos actualizados del usuario
              const { data: updatedUser, error: fetchError } = await supabase
                .from('usuarios')
                .select(`
                  *,
                  membresia_activa: membresias_usuarios!left(
                    id,
                    tipo_membresia:membresia_tipos(*),
                    fecha_inicio,
                    fecha_fin,
                    estado
                  )
                `)
                .eq('id', newUser.id)
                .single();
                
              if (fetchError) throw fetchError;
              
              return setState({
                user: updatedUser,
                isLoading: false,
                error: null
              });
              
            } catch (membresiaErr) {
              console.error('Error al asignar membresía gratuita:', membresiaErr);
              // Si falla la asignación de membresía, continuamos con el usuario básico
              return setState({
                user: newUser,
                isLoading: false,
                error: null
              });
            }
          }
          
          throw userError;
        }
        
        setState({
          user: userData,
          isLoading: false,
          error: null
        });
      } catch (err) {
        console.error('Error al verificar sesión:', err);
        setState({
          user: null,
          isLoading: false,
          error: 'Error al verificar la sesión'
        });
      }
    };
    
    checkSession();
    
    // Suscribirse a cambios en la autenticación
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_OUT') {
        setState({ user: null, isLoading: false, error: null });
      } else if (event === 'SIGNED_IN' || event === 'USER_UPDATED') {
        // Actualizar estado cuando cambia la sesión
        checkSession();
      }
    });
    
    // Limpiar suscripción
    return () => {
      subscription.unsubscribe();
    };
  }, []);
  
  // Función para iniciar sesión
  const signIn = async (email: string, password: string) => {
    try {
      setState(prev => ({ ...prev, isLoading: true, error: null }));
      
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password
      });
      
      if (error) throw error;
      
      // La actualización del estado se hará automáticamente por el listener
    } catch (err) {
      const error = err as SupabaseError;
      console.error('Error al iniciar sesión:', error.message);
      setState(prev => ({ 
        ...prev, 
        isLoading: false, 
        error: 'Credenciales inválidas. Por favor, verifica tu email y contraseña.'
      }));
      return false;
    }
    return true;
  };
  
  // Función para cerrar sesión
  const signOut = async () => {
    try {
      setState(prev => ({ ...prev, isLoading: true }));
      
      const { error } = await supabase.auth.signOut();
      
      if (error) throw error;
      
      router.push('/login');
      // La actualización del estado se hará automáticamente por el listener
    } catch (err) {
      const error = err as SupabaseError;
      console.error('Error al cerrar sesión:', error.message);
      setState(prev => ({ 
        ...prev, 
        isLoading: false, 
        error: 'Error al cerrar sesión. Por favor, intenta nuevamente.'
      }));
    }
  };
  
  // Función para registrar nuevo usuario
  const signUp = async (email: string, password: string, username: string) => {
    try {
      setState(prev => ({ ...prev, isLoading: true, error: null }));
      
      // Registrar usuario en Auth
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
      });
      
      if (error) throw error;
      
      if (data?.user) {
        // Crear registro en tabla personalizada
        const { error: userError } = await supabase
          .from('usuarios')
          .insert({
            id: data.user.id,
            email: data.user.email,
            username,
          });
          
        if (userError) throw userError;
      }
      
      return true;
    } catch (err) {
      const error = err as SupabaseError;
      console.error('Error al registrarse:', error.message);
      
      let errorMessage = 'Error al crear cuenta. Por favor, intenta nuevamente.';
      
      if (error.code === '23505') {
        errorMessage = 'El email o nombre de usuario ya está en uso.';
      }
      
      setState(prev => ({ ...prev, isLoading: false, error: errorMessage }));
      return false;
    } finally {
      setState(prev => ({ ...prev, isLoading: false }));
    }
  };
  
  // Función para actualizar perfil
  const updateProfile = async (profileData: Partial<Usuario>) => {
    try {
      if (!state.user) throw new Error('No hay usuario autenticado');
      
      setState(prev => ({ ...prev, isLoading: true, error: null }));
      
      // Filtrar solo los campos que pertenecen a la tabla usuarios
      const usuariosFields = {
        username: profileData.username,
        nombre: profileData.nombre,
        apellidos: profileData.apellidos,
        telefono: profileData.telefono,
        empresa: profileData.empresa,
        email: profileData.email,
        razon_social: profileData.razon_social,
        direccion_fiscal: profileData.direccion_fiscal,
        codigo_postal: profileData.codigo_postal,
        ciudad: profileData.ciudad,
        provincia: profileData.provincia,
        pais: profileData.pais
      };
      
      // Eliminar campos undefined
      const filteredUsuariosData = Object.entries(usuariosFields)
        .filter(([_, value]) => value !== undefined)
        .reduce((obj, [key, value]) => ({ ...obj, [key]: value }), {});
      
      console.log('Actualizando campos en tabla usuarios:', filteredUsuariosData);
      
      // Actualizar datos en la tabla usuarios (si hay campos para actualizar)
      if (Object.keys(filteredUsuariosData).length > 0) {
        const { error } = await supabase
          .from('usuarios')
          .update(filteredUsuariosData)
          .eq('id', state.user.id);
          
        if (error) throw error;
      }
      
      // Verificar si hay datos de facturación para actualizar
      if (
        profileData.razon_social || 
        profileData.cif || 
        profileData.direccion_fiscal || 
        profileData.direccion || 
        profileData.nombre_empresa ||
        profileData.codigo_postal ||
        profileData.ciudad ||
        profileData.pais
      ) {
        try {
          console.log("Actualizando datos de facturación");
          
          // Primero verificar si existe un registro en datos_facturacion
          const { data: existingData, error: checkError } = await supabase
            .from('datos_facturacion')
            .select('id')
            .eq('usuario_id', state.user.id)
            .maybeSingle();
            
          if (checkError) {
            console.error('Error al verificar datos de facturación:', checkError);
          }
          
          // Preparar datos para tabla datos_facturacion
          const facturacionData: Partial<DatosFacturacion> = {
            usuario_id: state.user.id,
            nombre_empresa: profileData.razon_social || profileData.nombre_empresa || profileData.empresa || '',
            cif: profileData.cif || '',
            direccion: profileData.direccion_fiscal || profileData.direccion || '',
            telefono: profileData.telefono || '',
          };
          
          // Añadir campos opcionales solo si tienen valor
          if (profileData.codigo_postal) facturacionData.codigo_postal = profileData.codigo_postal;
          if (profileData.ciudad) facturacionData.ciudad = profileData.ciudad;
          if (profileData.pais) facturacionData.pais = profileData.pais;
          if (profileData.email_facturacion || state.user?.email) {
            facturacionData.email_facturacion = profileData.email_facturacion || state.user?.email;
          }
          
          console.log('Datos a guardar en facturación:', facturacionData);
          
          if (existingData) {
            // Actualizar registro existente
            console.log('Actualizando registro existente de facturación con ID:', existingData.id);
            const { error: updateError } = await supabase
              .from('datos_facturacion')
              .update(facturacionData)
              .eq('id', existingData.id);
              
            if (updateError) {
              console.error('Error al actualizar datos de facturación:', updateError);
              throw updateError;
            }
          } else {
            // Crear nuevo registro
            console.log('Creando nuevo registro de facturación');
            const { error: insertError } = await supabase
              .from('datos_facturacion')
              .insert([facturacionData]);
              
            if (insertError) {
              console.error('Error al insertar datos de facturación:', insertError);
              throw insertError;
            }
          }
        } catch (facturacionError: any) {
          console.error('Error al actualizar datos de facturación:', facturacionError.message || facturacionError);
          // Continuamos aunque falle la actualización de datos_facturacion
        }
      }
      
      // Recargar datos del usuario para asegurar que tenemos la información actualizada
      try {
        // Obtener datos básicos del usuario
        const { data: refreshedUser, error: refreshError } = await supabase
          .from('usuarios')
          .select('*')
          .eq('id', state.user.id)
          .single();
          
        if (refreshError) throw refreshError;
        
        // Si el usuario tiene una membresía activa, obtenerla
        if (refreshedUser.membresia_activa_id) {
          const { data: membresiaData, error: membresiaError } = await supabase
            .from('membresias_usuarios')
            .select(`
              id,
              tipo_membresia:membresia_tipos(*),
              fecha_inicio,
              fecha_fin,
              estado
            `)
            .eq('id', refreshedUser.membresia_activa_id)
            .single();
            
          if (!membresiaError && membresiaData) {
            // Agregar la membresía al objeto de usuario
            refreshedUser.membresia_activa = membresiaData;
          } else {
            refreshedUser.membresia_activa = null;
          }
        } else {
          refreshedUser.membresia_activa = null;
        }
        
        // Actualizar estado con los datos frescos del usuario
        setState({
          user: refreshedUser,
          isLoading: false,
          error: null
        });
      } catch (refreshError) {
        console.error('Error al recargar datos del usuario:', refreshError);
        // Actualizar estado local con los datos que tenemos
        setState(prev => ({ 
          ...prev, 
          user: prev.user ? { ...prev.user, ...profileData } : null,
          isLoading: false
        }));
      }
      
      return true;
    } catch (err) {
      const error = err as SupabaseError;
      console.error('Error al actualizar perfil:', error.message);
      setState(prev => ({ 
        ...prev, 
        isLoading: false, 
        error: 'Error al actualizar perfil. Por favor, intenta nuevamente.'
      }));
      return false;
    }
  };
  
  // Función para verificar si el usuario tiene acceso a una ruta administrativa
  const isAdmin = () => {
    // Lista de correos electrónicos de administradores
    const adminEmails = [
      'admin@lucrapp.com',
      'luiscrouseillesvillena@gmail.com',
      'luis@lucrapp.com',
      'luisocro@gmail.com' // Superadmin principal
    ];
    
    // Verificar si el email del usuario está en la lista de administradores
    return state.user?.email && adminEmails.includes(state.user.email);
  };
  
  // Función para verificar si el usuario es superadmin
  const isSuperAdmin = () => {
    return state.user?.email === 'luisocro@gmail.com';
  };
  
  return {
    user: state.user,
    isLoading: state.isLoading,
    error: state.error,
    signIn,
    signOut,
    signUp,
    updateProfile,
    isAdmin,
    isSuperAdmin
  };
}