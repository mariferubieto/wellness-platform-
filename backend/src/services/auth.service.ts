import { supabaseAdmin } from '../config/supabase';

interface RegisterInput {
  nombre: string;
  email: string;
  password: string;
  telefono?: string;
  fecha_nacimiento?: string;
  fuente?: string;
}

export async function registerUser(input: RegisterInput) {
  const { nombre, email, password, telefono, fecha_nacimiento, fuente } = input;

  const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });

  if (authError) {
    if (authError.message.includes('already registered')) {
      throw new Error('El email ya está registrado');
    }
    throw new Error(authError.message);
  }

  const { data: user, error: profileError } = await supabaseAdmin
    .from('users')
    .insert({
      auth_id: authData.user.id,
      nombre,
      email,
      telefono,
      fecha_nacimiento,
      fuente: fuente || 'directo',
      rol: 'user',
    })
    .select()
    .single();

  if (profileError) {
    await supabaseAdmin.auth.admin.deleteUser(authData.user.id);
    throw new Error('Error al crear el perfil de usuario');
  }

  return user;
}
