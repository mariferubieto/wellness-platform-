import { supabaseAdmin } from '../config/supabase';

export async function getMaestros() {
  const { data, error } = await supabaseAdmin
    .from('maestros')
    .select('id, nombre, bio, foto_url, activo, users(nombre, email)')
    .eq('activo', true)
    .order('id');

  if (error) throw new Error(error.message);

  return (data ?? []).map((m: Record<string, unknown>) => {
    const user = m.users as { nombre: string; email: string } | null;
    return {
      id: m.id,
      bio: m.bio,
      foto_url: m.foto_url,
      activo: m.activo,
      nombre: (m.nombre as string) || user?.nombre || '',
      email: user?.email ?? '',
    };
  });
}

export async function createMaestro(nombre: string, bio?: string, foto_url?: string, user_id?: string) {
  const { data, error } = await supabaseAdmin
    .from('maestros')
    .insert({ nombre, user_id: user_id ?? null, bio: bio ?? null, foto_url: foto_url ?? null })
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data;
}
