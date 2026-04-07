// backend/src/services/newsletter.service.ts
import { supabaseAdmin } from '../config/supabase';
import * as XLSX from 'xlsx';

export async function suscribir(
  email: string,
  nombre?: string,
  fuente?: string
) {
  const { data, error } = await supabaseAdmin
    .from('newsletter_suscriptores')
    .upsert(
      { email, nombre: nombre ?? null, fuente: fuente ?? 'web', activo: true },
      { onConflict: 'email' }
    )
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data;
}

export async function cancelarSuscripcion(email: string) {
  const { data, error } = await supabaseAdmin
    .from('newsletter_suscriptores')
    .update({ activo: false })
    .eq('email', email)
    .select()
    .single();
  if (error) throw new Error(error.message);
  if (!data) throw new Error('Email no encontrado');
  return data;
}

export async function getSuscriptores() {
  const { data, error } = await supabaseAdmin
    .from('newsletter_suscriptores')
    .select('id, email, nombre, fuente, activo, created_at')
    .eq('activo', true)
    .order('created_at', { ascending: false });
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function exportSuscriptoresToExcel(): Promise<Buffer> {
  const suscriptores = await getSuscriptores();
  const rows = suscriptores.map(s => ({
    Email: s.email,
    Nombre: s.nombre ?? '',
    Fuente: s.fuente ?? '',
    Fecha: new Date(s.created_at).toLocaleDateString('es-MX'),
  }));
  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Suscriptores');
  return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
}
