import { supabaseAdmin } from '../config/supabase';

export interface CodigoPromo {
  id: string;
  codigo: string;
  descripcion?: string;
  descuento_tipo: 'porcentaje' | 'monto_fijo';
  descuento_valor: number;
  aplicable_a: string[];
  activo: boolean;
  usos_maximos?: number;
  usos_actuales: number;
  expira_en?: string;
}

export async function getCodigos() {
  const { data, error } = await supabaseAdmin
    .from('codigos_promocionales')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function createCodigo(input: Omit<CodigoPromo, 'id' | 'usos_actuales'>) {
  const { data, error } = await supabaseAdmin
    .from('codigos_promocionales')
    .insert({ ...input, usos_actuales: 0 })
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data;
}

export async function toggleCodigo(id: string, activo: boolean) {
  const { data, error } = await supabaseAdmin
    .from('codigos_promocionales')
    .update({ activo })
    .eq('id', id)
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data;
}

export async function aplicarCodigo(codigo: string, concepto: string, monto: number) {
  const { data, error } = await supabaseAdmin
    .from('codigos_promocionales')
    .select('*')
    .eq('codigo', codigo.toUpperCase())
    .eq('activo', true)
    .single();

  if (error || !data) throw new Error('Código no válido o inactivo');

  const promo = data as CodigoPromo;

  if (promo.usos_maximos && promo.usos_actuales >= promo.usos_maximos) {
    throw new Error('Este código ya alcanzó su límite de usos');
  }

  if (promo.expira_en && new Date(promo.expira_en) < new Date()) {
    throw new Error('Este código ha expirado');
  }

  if (!promo.aplicable_a.includes(concepto)) {
    throw new Error('Este código no aplica para esta compra');
  }

  const descuento = promo.descuento_tipo === 'porcentaje'
    ? Math.round(monto * promo.descuento_valor / 100 * 100) / 100
    : Math.min(promo.descuento_valor, monto);

  const montoFinal = Math.max(0, monto - descuento);

  return {
    valido: true,
    codigo: promo.codigo,
    descuento_tipo: promo.descuento_tipo,
    descuento_valor: promo.descuento_valor,
    descuento_aplicado: descuento,
    monto_original: monto,
    monto_final: montoFinal,
  };
}
