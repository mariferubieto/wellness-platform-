import { supabaseAdmin } from '../config/supabase';

export async function getEventos() {
  const { data, error } = await supabaseAdmin
    .from('eventos')
    .select('id, nombre, descripcion, lugar, flyer_url, precio, fecha, tipo_acceso, whatsapp_contacto, activo')
    .eq('activo', true)
    .order('fecha', { ascending: true });

  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function getEventoById(id: string) {
  const { data, error } = await supabaseAdmin
    .from('eventos')
    .select('id, nombre, descripcion, lugar, flyer_url, precio, fecha, tipo_acceso, whatsapp_contacto, activo')
    .eq('id', id)
    .single();

  if (error) throw new Error(error.message);
  return data;
}

export async function createEvento(body: {
  nombre: string;
  descripcion?: string;
  lugar?: string;
  flyer_url?: string;
  precio?: number;
  fecha?: string;
  tipo_acceso?: string;
  whatsapp_contacto?: string;
}) {
  const { data, error } = await supabaseAdmin
    .from('eventos')
    .insert({
      nombre: body.nombre,
      descripcion: body.descripcion ?? null,
      lugar: body.lugar ?? null,
      flyer_url: body.flyer_url ?? null,
      precio: body.precio ?? null,
      fecha: body.fecha ?? null,
      tipo_acceso: body.tipo_acceso ?? 'pago',
      whatsapp_contacto: body.whatsapp_contacto ?? null,
    })
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data;
}

export async function updateEvento(id: string, body: Partial<{
  nombre: string;
  descripcion: string;
  lugar: string;
  flyer_url: string;
  precio: number;
  fecha: string;
  tipo_acceso: string;
  whatsapp_contacto: string;
  activo: boolean;
}>) {
  const { data, error } = await supabaseAdmin
    .from('eventos')
    .update(body)
    .eq('id', id)
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data;
}

export async function crearInscripcionEvento(body: {
  evento_id: string;
  nombre_completo: string;
  email: string;
  whatsapp: string;
  user_id?: string;
}) {
  const { data: evento, error: eventoError } = await supabaseAdmin
    .from('eventos')
    .select('id, activo, tipo_acceso')
    .eq('id', body.evento_id)
    .single();

  if (eventoError || !evento) throw new Error('Evento no encontrado');
  if (!evento.activo) throw new Error('Evento no disponible');

  const { data, error } = await supabaseAdmin
    .from('inscripciones_evento')
    .insert({
      evento_id: body.evento_id,
      nombre_completo: body.nombre_completo,
      email: body.email,
      whatsapp: body.whatsapp,
      user_id: body.user_id ?? null,
      estado_pago: 'pendiente',
    })
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data;
}
