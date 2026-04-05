import { supabaseAdmin } from '../config/supabase';
import * as XLSX from 'xlsx';

export async function getAyurvedaAlumnos(generacion?: string) {
  const query = supabaseAdmin
    .from('inscripciones_diplomado')
    .select('id, nombre_completo, email_gmail, whatsapp, fecha_nacimiento, razon, estado_pago, created_at, diplomados(nombre, generacion)');

  const { data, error } = generacion
    ? await query.eq('diplomados.generacion', generacion).order('created_at', { ascending: false })
    : await query.order('created_at', { ascending: false });

  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function exportAyurvedaAlumnosToExcel(generacion: string): Promise<Buffer> {
  const { data, error } = await supabaseAdmin
    .from('inscripciones_diplomado')
    .select('id, nombre_completo, email_gmail, whatsapp, fecha_nacimiento, razon, estado_pago, created_at, diplomados(nombre, generacion)')
    .eq('diplomados.generacion', generacion)
    .order('created_at', { ascending: false });

  if (error) throw new Error(error.message);

  const alumnos = data ?? [];

  const rows = (alumnos as Array<Record<string, unknown>>).map((a) => {
    const diplomado = a.diplomados as { nombre: string; generacion: string } | null;
    return {
      'Nombre completo': a.nombre_completo,
      'Email Gmail': a.email_gmail,
      'WhatsApp': a.whatsapp,
      'Fecha de nacimiento': a.fecha_nacimiento ? new Date(a.fecha_nacimiento as string).toLocaleDateString('es-MX') : '—',
      'Razón': a.razon ?? '—',
      'Estado pago': a.estado_pago,
      'Diplomado': diplomado?.nombre ?? '—',
      'Generación': diplomado?.generacion ?? generacion,
      'Fecha inscripción': new Date(a.created_at as string).toLocaleDateString('es-MX'),
    };
  });

  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Alumnos Ayurveda');
  return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }) as Buffer;
}
