import { supabaseAdmin } from '../config/supabase';

export async function getDiplomados() {
  const { data, error } = await supabaseAdmin
    .from('diplomados')
    .select('id, nombre, descripcion, precio, generacion, activo')
    .eq('activo', true)
    .order('created_at', { ascending: false });

  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function getDiplomadoById(id: string) {
  const { data, error } = await supabaseAdmin
    .from('diplomados')
    .select('id, nombre, descripcion, temario, calendario, precio, generacion, activo')
    .eq('id', id)
    .single();

  if (error) throw new Error(error.message);
  return data;
}

export async function createDiplomado(body: {
  nombre: string;
  descripcion?: string;
  temario?: string[];
  calendario?: string[];
  precio: number;
  generacion: string;
}) {
  const { data, error } = await supabaseAdmin
    .from('diplomados')
    .insert({
      nombre: body.nombre,
      descripcion: body.descripcion ?? null,
      temario: body.temario ?? null,
      calendario: body.calendario ?? null,
      precio: body.precio,
      generacion: body.generacion,
    })
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data;
}

export async function updateDiplomado(
  id: string,
  body: Partial<{
    nombre: string;
    descripcion: string;
    temario: string[];
    calendario: string[];
    precio: number;
    generacion: string;
    activo: boolean;
  }>
) {
  const { data, error } = await supabaseAdmin
    .from('diplomados')
    .update(body)
    .eq('id', id)
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data;
}

export async function crearInscripcion(body: {
  diplomado_id: string;
  nombre_completo: string;
  fecha_nacimiento?: string;
  whatsapp: string;
  email_gmail: string;
  razon?: string;
  user_id?: string;
}) {
  // Verify diplomado exists and is active
  const { data: diplomado, error: dipError } = await supabaseAdmin
    .from('diplomados')
    .select('id, activo')
    .eq('id', body.diplomado_id)
    .single();

  if (dipError || !diplomado) throw new Error('Diplomado no encontrado');
  if (!diplomado.activo) throw new Error('Diplomado no disponible');

  const { data, error } = await supabaseAdmin
    .from('inscripciones_diplomado')
    .insert({
      diplomado_id: body.diplomado_id,
      nombre_completo: body.nombre_completo,
      fecha_nacimiento: body.fecha_nacimiento ?? null,
      whatsapp: body.whatsapp,
      email_gmail: body.email_gmail,
      razon: body.razon ?? null,
      user_id: body.user_id ?? null,
      estado_pago: 'pendiente',
    })
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data;
}
