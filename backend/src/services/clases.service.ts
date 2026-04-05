import { supabaseAdmin } from '../config/supabase';

export interface CreateClaseInput {
  maestro_id?: string;
  nombre: string;
  descripcion?: string;
  inicio: string;
  fin: string;
  capacidad: number;
  tipo?: 'regular' | 'especial';
  precio_especial?: number;
}

export async function getClases(tipo?: string) {
  const ahora = new Date().toISOString();
  let query = supabaseAdmin
    .from('clases')
    .select('id, nombre, descripcion, inicio, fin, capacidad, cupo_actual, tipo, precio_especial, activo, maestros(id, users(nombre))')
    .eq('activo', true)
    .gte('inicio', ahora)
    .order('inicio');

  if (tipo) {
    query = query.eq('tipo', tipo);
  }

  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function createClase(input: CreateClaseInput) {
  const { data, error } = await supabaseAdmin
    .from('clases')
    .insert({
      maestro_id: input.maestro_id ?? null,
      nombre: input.nombre,
      descripcion: input.descripcion ?? null,
      inicio: input.inicio,
      fin: input.fin,
      capacidad: input.capacidad,
      tipo: input.tipo ?? 'regular',
      precio_especial: input.precio_especial ?? null,
    })
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data;
}

export async function updateClase(id: string, updates: Partial<CreateClaseInput & { activo: boolean }>) {
  const ALLOWED = ['maestro_id', 'nombre', 'descripcion', 'inicio', 'fin', 'capacidad', 'tipo', 'precio_especial', 'activo'];
  const filtered = Object.fromEntries(
    Object.entries(updates).filter(([k]) => ALLOWED.includes(k))
  );

  const { data, error } = await supabaseAdmin
    .from('clases')
    .update(filtered)
    .eq('id', id)
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data;
}

export async function deleteClase(id: string) {
  const { error } = await supabaseAdmin
    .from('clases')
    .update({ activo: false })
    .eq('id', id);

  if (error) throw new Error(error.message);
}
