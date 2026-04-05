import { supabaseAdmin } from '../config/supabase';

export async function getPaquetesCatalogo() {
  const { data, error } = await supabaseAdmin
    .from('paquetes_catalogo')
    .select('id, nombre, num_clases, precio, vigencia_dias')
    .eq('activo', true)
    .order('precio');

  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function getMisPaquetes(userId: string) {
  const ahora = new Date().toISOString();
  const { data, error } = await supabaseAdmin
    .from('paquetes_usuario')
    .select('id, clases_restantes, expira_en, activo, paquetes_catalogo(nombre, num_clases)')
    .eq('user_id', userId)
    .eq('activo', true)
    .gt('expira_en', ahora)
    .order('expira_en');

  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function otorgarPaquete(userId: string, paqueteId: string, monto: number) {
  const { data: pago, error: pagoError } = await supabaseAdmin
    .from('pagos')
    .insert({
      user_id: userId,
      monto,
      concepto: 'paquete_shala',
      concepto_id: paqueteId,
      estado: 'aprobado',
      proveedor: 'manual_admin',
    })
    .select()
    .single();

  if (pagoError) throw new Error(pagoError.message);

  const { data: catalogo, error: catalogoError } = await supabaseAdmin
    .from('paquetes_catalogo')
    .select('num_clases, vigencia_dias, precio')
    .eq('id', paqueteId)
    .single();

  if (catalogoError) throw new Error(catalogoError.message);

  const expira = new Date();
  expira.setDate(expira.getDate() + (catalogo.vigencia_dias as number));

  const { data: paqueteUsuario, error: puError } = await supabaseAdmin
    .from('paquetes_usuario')
    .insert({
      user_id: userId,
      paquete_id: paqueteId,
      clases_restantes: catalogo.num_clases,
      expira_en: expira.toISOString(),
      pago_id: (pago as { id: string }).id,
      activo: true,
    })
    .select()
    .single();

  if (puError) throw new Error(puError.message);
  return paqueteUsuario;
}
