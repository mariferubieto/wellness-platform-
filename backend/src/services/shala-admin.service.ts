import { supabaseAdmin } from '../config/supabase';
import * as XLSX from 'xlsx';

export async function getShalaAlumnos() {
  const { data, error } = await supabaseAdmin
    .from('users')
    .select('id, nombre, email, telefono, created_at, paquetes_usuario(id, clases_restantes, expira_en, activo)')
    .eq('rol', 'user')
    .order('nombre');

  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function getShalaLeads() {
  const { data, error } = await supabaseAdmin
    .from('leads')
    .select('id, nombre, email, telefono, fuente, intereses, estado, created_at')
    .eq('fuente', 'shala')
    .order('created_at', { ascending: false });

  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function exportShalaAlumnosToExcel(): Promise<Buffer> {
  const alumnos = await getShalaAlumnos();

  const rows = (alumnos as Array<Record<string, unknown>>).map((u) => {
    const paquetes = (u.paquetes_usuario as Array<{ activo: boolean; clases_restantes: number; expira_en: string }>) ?? [];
    const activo = paquetes.find(p => p.activo && p.clases_restantes > 0);
    return {
      Nombre: u.nombre,
      Email: u.email,
      Teléfono: u.telefono ?? '',
      'Clases restantes': activo?.clases_restantes ?? 0,
      'Expira': activo?.expira_en ? new Date(activo.expira_en).toLocaleDateString('es-MX') : '—',
      'Registrada': new Date(u.created_at as string).toLocaleDateString('es-MX'),
    };
  });

  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Alumnos SHALA');
  return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }) as Buffer;
}

export async function exportShalaLeadsToExcel(): Promise<Buffer> {
  const leads = await getShalaLeads();

  const rows = (leads as Array<Record<string, unknown>>).map((l) => ({
    Nombre: l.nombre ?? '',
    Email: l.email ?? '',
    Teléfono: l.telefono ?? '',
    Fuente: l.fuente,
    Intereses: Array.isArray(l.intereses) ? (l.intereses as string[]).join(', ') : '',
    Estado: l.estado,
    Fecha: new Date(l.created_at as string).toLocaleDateString('es-MX'),
  }));

  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Leads SHALA');
  return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }) as Buffer;
}
