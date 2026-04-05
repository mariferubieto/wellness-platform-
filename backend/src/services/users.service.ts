import { supabaseAdmin } from '../config/supabase';

const CAMPOS_ACTUALIZABLES = ['nombre', 'telefono', 'fecha_nacimiento', 'tags'];

export async function getUserById(id: string) {
  const { data, error } = await supabaseAdmin
    .from('users')
    .select('id, nombre, email, telefono, fecha_nacimiento, rol, fuente, tags, created_at')
    .eq('id', id)
    .single();

  if (error) throw new Error('Usuario no encontrado');
  return data;
}

export async function updateUser(id: string, updates: Record<string, unknown>) {
  const safeUpdates: Record<string, unknown> = {};
  for (const key of CAMPOS_ACTUALIZABLES) {
    if (key in updates) safeUpdates[key] = updates[key];
  }

  if (Object.keys(safeUpdates).length === 0) {
    throw new Error('No hay campos válidos para actualizar');
  }

  const { data, error } = await supabaseAdmin
    .from('users')
    .update(safeUpdates)
    .eq('id', id)
    .select()
    .single();

  if (error) throw new Error('Error al actualizar usuario');
  return data;
}
