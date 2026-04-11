import { supabaseAdmin } from '../config/supabase';

export interface CreateClaseInput {
  maestro_id?: string;
  nombre: string;
  descripcion?: string;
  inicio: string;
  fin: string;
  capacidad: number;
  espacio_tipo?: 'salon' | 'jardin';
  tipo?: 'regular' | 'especial';
  precio_especial?: number;
}

export async function getClases(tipo?: string, desde?: string, hasta?: string) {
  const ahora = desde ?? new Date().toISOString();
  let query = supabaseAdmin
    .from('clases')
    .select('id, nombre, descripcion, inicio, fin, capacidad, cupo_actual, tipo, precio_especial, activo, espacio_tipo, maestros(id, users(nombre))')
    .eq('activo', true)
    .gte('inicio', ahora)
    .order('inicio');

  if (tipo) {
    query = query.eq('tipo', tipo);
  }
  if (hasta) {
    query = query.lte('inicio', hasta);
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
      espacio_tipo: input.espacio_tipo ?? 'salon',
      tipo: input.tipo ?? 'regular',
      precio_especial: input.precio_especial ?? null,
    })
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data;
}

export async function createClasesBatch(inputs: CreateClaseInput[]) {
  if (inputs.length === 0) throw new Error('Se requiere al menos una clase');
  const rows = inputs.map(input => ({
    maestro_id: input.maestro_id ?? null,
    nombre: input.nombre,
    descripcion: input.descripcion ?? null,
    inicio: input.inicio,
    fin: input.fin,
    capacidad: input.capacidad,
    espacio_tipo: input.espacio_tipo ?? 'salon',
    tipo: input.tipo ?? 'regular',
    precio_especial: input.precio_especial ?? null,
  }));

  const { data, error } = await supabaseAdmin
    .from('clases')
    .insert(rows)
    .select();

  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function updateClase(id: string, updates: Partial<CreateClaseInput & { activo: boolean }>) {
  const ALLOWED = ['maestro_id', 'nombre', 'descripcion', 'inicio', 'fin', 'capacidad', 'espacio_tipo', 'tipo', 'precio_especial', 'activo'];
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
