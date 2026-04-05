import { supabaseAdmin } from '../config/supabase';
import * as XLSX from 'xlsx';

export async function getDashboardMetrics() {
  const { count: total_usuarios } = await supabaseAdmin
    .from('users')
    .select('*', { count: 'exact', head: true });

  const { count: total_leads } = await supabaseAdmin
    .from('leads')
    .select('*', { count: 'exact', head: true });

  const { count: leads_nuevos } = await supabaseAdmin
    .from('leads')
    .select('*', { count: 'exact', head: true })
    .eq('estado', 'nuevo');

  return {
    total_usuarios: total_usuarios ?? 0,
    total_leads: total_leads ?? 0,
    leads_nuevos: leads_nuevos ?? 0,
  };
}

export interface CRMFilters {
  fuente?: string;
  intereses?: string;
  estado?: string;
  page?: number;
  limit?: number;
}

export async function getCRMContacts(filters: CRMFilters = {}) {
  const page = filters.page ?? 1;
  const limit = filters.limit ?? 50;
  const offset = (page - 1) * limit;

  let usersQuery = supabaseAdmin
    .from('users')
    .select('id, nombre, email, telefono, fecha_nacimiento, rol, fuente, tags, created_at')
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (filters.fuente) usersQuery = usersQuery.eq('fuente', filters.fuente);

  let leadsQuery = supabaseAdmin
    .from('leads')
    .select('id, nombre, email, telefono, fuente, intereses, estado, ultimo_contacto, created_at')
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (filters.fuente) leadsQuery = leadsQuery.eq('fuente', filters.fuente);
  if (filters.estado) leadsQuery = leadsQuery.eq('estado', filters.estado);

  const [usersResult, leadsResult] = await Promise.all([usersQuery, leadsQuery]);

  return {
    usuarios: usersResult.data ?? [],
    leads: leadsResult.data ?? [],
    page,
    limit,
  };
}

export async function getCumpleanosMes() {
  const mes = new Date().getMonth() + 1;
  const { data, error } = await supabaseAdmin
    .from('users')
    .select('id, nombre, email, telefono, fecha_nacimiento')
    .filter('fecha_nacimiento', 'not.is', null);

  if (error) throw new Error('Error al obtener cumpleaños');

  return (data ?? []).filter((u) => {
    if (!u.fecha_nacimiento) return false;
    const mes_nacimiento = new Date(u.fecha_nacimiento + 'T00:00:00').getMonth() + 1;
    return mes_nacimiento === mes;
  });
}

export async function exportCRMToExcel() {
  const { data: usuarios } = await supabaseAdmin
    .from('users')
    .select('nombre, email, telefono, fecha_nacimiento, rol, fuente, tags, created_at')
    .order('created_at', { ascending: false });

  const { data: leads } = await supabaseAdmin
    .from('leads')
    .select('nombre, email, telefono, fuente, intereses, estado, ultimo_contacto, created_at')
    .order('created_at', { ascending: false });

  const wb = XLSX.utils.book_new();

  const wsUsuarios = XLSX.utils.json_to_sheet(
    (usuarios ?? []).map((u) => ({
      Nombre: u.nombre,
      Email: u.email,
      Teléfono: u.telefono ?? '',
      'Fecha de nacimiento': u.fecha_nacimiento ?? '',
      Rol: u.rol,
      Fuente: u.fuente ?? '',
      Intereses: (u.tags ?? []).join(', '),
      'Fecha de registro': new Date(u.created_at).toLocaleDateString('es-MX'),
    }))
  );
  XLSX.utils.book_append_sheet(wb, wsUsuarios, 'Usuarios');

  const wsLeads = XLSX.utils.json_to_sheet(
    (leads ?? []).map((l) => ({
      Nombre: l.nombre ?? '',
      Email: l.email ?? '',
      Teléfono: l.telefono ?? '',
      Fuente: l.fuente ?? '',
      Intereses: (l.intereses ?? []).join(', '),
      Estado: l.estado,
      'Último contacto': l.ultimo_contacto
        ? new Date(l.ultimo_contacto).toLocaleDateString('es-MX')
        : '',
      'Fecha de registro': new Date(l.created_at).toLocaleDateString('es-MX'),
    }))
  );
  XLSX.utils.book_append_sheet(wb, wsLeads, 'Leads');

  return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
}
