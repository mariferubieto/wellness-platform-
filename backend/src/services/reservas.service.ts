import { supabaseAdmin } from '../config/supabase';

interface ClaseRow {
  id: string;
  capacidad: number;
  cupo_actual: number;
  tipo: string;
  activo: boolean;
  inicio: string;
}

interface PaqueteActivoRow {
  id: string;
  clases_restantes: number;
  expira_en: string;
}

interface ReservaRow {
  id: string;
  user_id: string;
  clase_id: string;
  estado: string;
  paquete_usuario_id: string | null;
  clases: {
    inicio: string;
    cupo_actual: number;
  };
}

async function getClaseById(claseId: string): Promise<ClaseRow> {
  const { data, error } = await supabaseAdmin
    .from('clases')
    .select('id, capacidad, cupo_actual, tipo, activo, inicio')
    .eq('id', claseId)
    .single();
  if (error || !data) throw new Error('Clase no encontrada');
  return data as ClaseRow;
}

async function getPaqueteActivo(userId: string): Promise<PaqueteActivoRow | null> {
  const ahora = new Date().toISOString();
  const { data, error } = await supabaseAdmin
    .from('paquetes_usuario')
    .select('id, clases_restantes, expira_en')
    .eq('user_id', userId)
    .eq('activo', true)
    .gt('clases_restantes', 0)
    .gt('expira_en', ahora)
    .order('expira_en')
    .limit(1)
    .single();

  if (error || !data) return null;
  return data as PaqueteActivoRow;
}

export async function crearReserva(userId: string, claseId: string) {
  const clase = await getClaseById(claseId);

  if (!clase.activo) throw new Error('Esta clase no está disponible');
  if (clase.tipo === 'especial') throw new Error('Las clases especiales requieren pago individual');
  if (clase.cupo_actual >= clase.capacidad) throw new Error('No hay cupo disponible en esta clase');

  const paquete = await getPaqueteActivo(userId);
  if (!paquete) throw new Error('No tienes un paquete activo con créditos disponibles');

  const { data: reserva, error: reservaError } = await supabaseAdmin
    .from('reservas')
    .insert({
      user_id: userId,
      clase_id: claseId,
      paquete_usuario_id: paquete.id,
      estado: 'activa',
    })
    .select()
    .single();

  if (reservaError) throw new Error(reservaError.message);

  const { error: paqueteError } = await supabaseAdmin
    .from('paquetes_usuario')
    .update({ clases_restantes: paquete.clases_restantes - 1 })
    .eq('id', paquete.id);

  if (paqueteError) throw new Error(paqueteError.message);

  const { error: cupoError } = await supabaseAdmin
    .from('clases')
    .update({ cupo_actual: clase.cupo_actual + 1 })
    .eq('id', claseId);

  if (cupoError) throw new Error(cupoError.message);

  return reserva;
}

export async function cancelarReserva(reservaId: string, userId: string) {
  const { data: reserva, error: rError } = await supabaseAdmin
    .from('reservas')
    .select('id, user_id, estado, paquete_usuario_id, clase_id, clases(inicio, cupo_actual)')
    .eq('id', reservaId)
    .single();

  if (rError || !reserva) throw new Error('Reserva no encontrada');

  const r = reserva as unknown as ReservaRow;
  if (r.user_id !== userId) throw new Error('No puedes cancelar esta reserva');
  if (r.estado !== 'activa') throw new Error('Solo se pueden cancelar reservas activas');

  const inicioMs = new Date(r.clases.inicio).getTime();
  const ahoraMs = Date.now();

  if (inicioMs < ahoraMs) throw new Error('No se puede cancelar una clase que ya ocurrió');

  const horasAntes = (inicioMs - ahoraMs) / (1000 * 60 * 60);
  const creditoDevuelto = horasAntes >= 2;

  const { error: updateError } = await supabaseAdmin
    .from('reservas')
    .update({ estado: 'cancelada', credito_devuelto: creditoDevuelto })
    .eq('id', reservaId);

  if (updateError) throw new Error(updateError.message);

  if (creditoDevuelto && r.paquete_usuario_id) {
    const { data: pu } = await supabaseAdmin
      .from('paquetes_usuario')
      .select('clases_restantes')
      .eq('id', r.paquete_usuario_id)
      .single() as { data: { clases_restantes: number } | null };

    if (pu) {
      await supabaseAdmin
        .from('paquetes_usuario')
        .update({ clases_restantes: pu.clases_restantes + 1 })
        .eq('id', r.paquete_usuario_id);
    }
  }

  const { error: cupoError } = await supabaseAdmin
    .from('clases')
    .update({ cupo_actual: Math.max(0, r.clases.cupo_actual - 1) })
    .eq('id', r.clase_id);

  if (cupoError) throw new Error(cupoError.message);

  return { credito_devuelto: creditoDevuelto };
}

export async function getMisReservas(userId: string) {
  const { data, error } = await supabaseAdmin
    .from('reservas')
    .select('id, estado, credito_devuelto, created_at, clases(id, nombre, inicio, fin, tipo)')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) throw new Error(error.message);
  return data ?? [];
}
