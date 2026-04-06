import { supabaseAdmin } from '../config/supabase';
import * as XLSX from 'xlsx';

export async function getRetiroInscritos(retiroId: string) {
  const { data, error } = await supabaseAdmin
    .from('inscripciones_retiro')
    .select('id, nombre_completo, email, whatsapp, fecha_nacimiento, ciudad, instagram, razon, restricciones_alimenticias, estado_pago, created_at')
    .eq('retiro_id', retiroId)
    .order('created_at', { ascending: false });

  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function exportRetiroToExcel(retiroId: string): Promise<Buffer> {
  const { data, error } = await supabaseAdmin
    .from('inscripciones_retiro')
    .select('id, nombre_completo, email, whatsapp, fecha_nacimiento, ciudad, instagram, razon, restricciones_alimenticias, estado_pago, created_at, retiros(nombre)')
    .eq('retiro_id', retiroId)
    .order('created_at', { ascending: false });

  if (error) throw new Error(error.message);

  const inscritos = data ?? [];

  const rows = (inscritos as Array<Record<string, unknown>>).map((i) => {
    const retiro = i.retiros as { nombre: string } | null;
    return {
      'Nombre completo': i.nombre_completo,
      'Email': i.email,
      'WhatsApp': i.whatsapp,
      'Fecha de nacimiento': i.fecha_nacimiento ? new Date(i.fecha_nacimiento as string).toLocaleDateString('es-MX') : '—',
      'Ciudad': i.ciudad ?? '—',
      'Instagram': i.instagram ?? '—',
      'Razón': i.razon ?? '—',
      'Restricciones alimenticias': i.restricciones_alimenticias ?? '—',
      'Estado pago': i.estado_pago,
      'Retiro': retiro?.nombre ?? '—',
      'Fecha inscripción': new Date(i.created_at as string).toLocaleDateString('es-MX'),
    };
  });

  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Inscritos Retiro');
  return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }) as Buffer;
}

export async function getEventoInscritos(eventoId: string) {
  const { data, error } = await supabaseAdmin
    .from('inscripciones_evento')
    .select('id, nombre_completo, email, whatsapp, estado_pago, created_at')
    .eq('evento_id', eventoId)
    .order('created_at', { ascending: false });

  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function exportEventoToExcel(eventoId: string): Promise<Buffer> {
  const { data, error } = await supabaseAdmin
    .from('inscripciones_evento')
    .select('id, nombre_completo, email, whatsapp, estado_pago, created_at, eventos(nombre)')
    .eq('evento_id', eventoId)
    .order('created_at', { ascending: false });

  if (error) throw new Error(error.message);

  const inscritos = data ?? [];

  const rows = (inscritos as Array<Record<string, unknown>>).map((i) => {
    const evento = i.eventos as { nombre: string } | null;
    return {
      'Nombre completo': i.nombre_completo,
      'Email': i.email,
      'WhatsApp': i.whatsapp,
      'Estado pago': i.estado_pago,
      'Evento': evento?.nombre ?? '—',
      'Fecha inscripción': new Date(i.created_at as string).toLocaleDateString('es-MX'),
    };
  });

  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Inscritos Evento');
  return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }) as Buffer;
}
