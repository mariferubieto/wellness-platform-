import { supabaseAdmin } from '../config/supabase';

export async function getMaestros() {
  const { data, error } = await supabaseAdmin
    .from('maestros')
    .select('id, bio, foto_url, activo, users(nombre, email)')
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
      nombre: user?.nombre ?? '',
      email: user?.email ?? '',
    };
  });
}

export async function createMaestro(user_id: string, bio?: string, foto_url?: string) {
  const { data, error } = await supabaseAdmin
    .from('maestros')
    .insert({ user_id, bio: bio ?? null, foto_url: foto_url ?? null })
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data;
}
