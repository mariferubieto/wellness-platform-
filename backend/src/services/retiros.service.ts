import { supabaseAdmin } from '../config/supabase';

export async function getRetiros() {
  const { data, error } = await supabaseAdmin
    .from('retiros')
    .select('id, nombre, descripcion, lugar, precio, fecha_inicio, fecha_fin, imagen_url, whatsapp_contacto, activo')
    .eq('activo', true)
    .order('fecha_inicio', { ascending: true });

  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function getRetiroById(id: string) {
  const { data, error } = await supabaseAdmin
    .from('retiros')
    .select('id, nombre, descripcion, lugar, incluye, precio, fecha_inicio, fecha_fin, imagen_url, whatsapp_contacto, activo')
    .eq('id', id)
    .single();

  if (error) throw new Error(error.message);
  return data;
}

export async function createRetiro(body: {
  nombre: string;
  descripcion?: string;
  lugar?: string;
  incluye?: string;
  precio: number;
  fecha_inicio?: string;
  fecha_fin?: string;
  imagen_url?: string;
  whatsapp_contacto?: string;
}) {
  const { data, error } = await supabaseAdmin
    .from('retiros')
    .insert({
      nombre: body.nombre,
      descripcion: body.descripcion ?? null,
      lugar: body.lugar ?? null,
      incluye: body.incluye ?? null,
      precio: body.precio,
      fecha_inicio: body.fecha_inicio ?? null,
      fecha_fin: body.fecha_fin ?? null,
      imagen_url: body.imagen_url ?? null,
      whatsapp_contacto: body.whatsapp_contacto ?? null,
    })
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data;
}

export async function updateRetiro(id: string, body: Partial<{
  nombre: string;
  descripcion: string;
  lugar: string;
  incluye: string;
  precio: number;
  fecha_inicio: string;
  fecha_fin: string;
  imagen_url: string;
  whatsapp_contacto: string;
  activo: boolean;
}>) {
  const { data, error } = await supabaseAdmin
    .from('retiros')
    .update(body)
    .eq('id', id)
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data;
}

export async function crearInscripcionRetiro(body: {
  retiro_id: string;
  nombre_completo: string;
  fecha_nacimiento?: string;
  whatsapp: string;
  email: string;
  instagram?: string;
  ciudad?: string;
  razon?: string;
  restricciones_alimenticias?: string;
  user_id?: string;
}) {
  const { data: retiro, error: retiroError } = await supabaseAdmin
    .from('retiros')
    .select('id, activo')
    .eq('id', body.retiro_id)
    .single();

  if (retiroError || !retiro) throw new Error('Retiro no encontrado');
  if (!retiro.activo) throw new Error('Retiro no disponible');

  const { data, error } = await supabaseAdmin
    .from('inscripciones_retiro')
    .insert({
      retiro_id: body.retiro_id,
      nombre_completo: body.nombre_completo,
      fecha_nacimiento: body.fecha_nacimiento ?? null,
      whatsapp: body.whatsapp,
      email: body.email,
      instagram: body.instagram ?? null,
      ciudad: body.ciudad ?? null,
      razon: body.razon ?? null,
      restricciones_alimenticias: body.restricciones_alimenticias ?? null,
      user_id: body.user_id ?? null,
      estado_pago: 'pendiente',
    })
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data;
}
