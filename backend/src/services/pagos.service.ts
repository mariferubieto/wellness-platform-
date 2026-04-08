// backend/src/services/pagos.service.ts
import MercadoPagoConfig, { Preference, Payment } from 'mercadopago';
import { supabaseAdmin } from '../config/supabase';

const client = new MercadoPagoConfig({
  accessToken: process.env.MP_ACCESS_TOKEN!,
});

const preferenceClient = new Preference(client);
const paymentClient = new Payment(client);

export interface CrearPreferenciaParams {
  user_id?: string;
  concepto: 'paquete_shala' | 'diplomado' | 'retiro' | 'evento';
  concepto_id: string;
  monto: number;
  titulo: string;
  back_url_base: string;
}

export async function crearPreferenciaMercadoPago(params: CrearPreferenciaParams): Promise<{ init_point: string; pago_id: string }> {
  const { data: pago, error: pagoError } = await supabaseAdmin
    .from('pagos')
    .insert({
      user_id: params.user_id ?? null,
      monto: params.monto,
      moneda: 'MXN',
      proveedor: 'mercadopago',
      estado: 'pendiente',
      concepto: params.concepto,
      concepto_id: params.concepto_id,
    })
    .select('id')
    .single();

  if (pagoError || !pago) throw new Error('Error al crear registro de pago');

  const result = await preferenceClient.create({
    body: {
      items: [
        {
          id: params.concepto_id,
          title: params.titulo,
          quantity: 1,
          unit_price: params.monto,
          currency_id: 'MXN',
        },
      ],
      back_urls: {
        success: `${params.back_url_base}/pagos/exito?pago_id=${pago.id}`,
        failure: `${params.back_url_base}/pagos/error?pago_id=${pago.id}`,
        pending: `${params.back_url_base}/pagos/pendiente?pago_id=${pago.id}`,
      },
      auto_return: 'approved',
      external_reference: pago.id,
      notification_url: `${process.env.BACKEND_URL}/api/pagos/mercadopago/webhook`,
    },
  });

  if (!result.init_point) throw new Error('Error al crear preferencia de Mercado Pago');

  await supabaseAdmin
    .from('pagos')
    .update({ metadata: { mp_preference_id: result.id } })
    .eq('id', pago.id);

  return { init_point: result.init_point, pago_id: pago.id };
}

export async function procesarWebhook(data: { type: string; data: { id: string } }): Promise<void> {
  if (data.type !== 'payment') return;

  const mpPaymentId = data.data.id;
  const payment = await paymentClient.get({ id: mpPaymentId });
  const externalRef = payment.external_reference;
  const mpStatus = payment.status;

  if (!externalRef) return;

  const estadoMap: Record<string, string> = {
    approved: 'aprobado',
    rejected: 'rechazado',
    pending: 'pendiente',
    in_process: 'pendiente',
  };

  const nuevoEstado = estadoMap[mpStatus ?? ''] ?? 'pendiente';

  const { data: pago, error } = await supabaseAdmin
    .from('pagos')
    .update({
      estado: nuevoEstado,
      referencia_externa: String(mpPaymentId),
    })
    .eq('id', externalRef)
    .select('id, concepto, concepto_id, user_id, monto')
    .single();

  if (error || !pago) return;

  if (nuevoEstado === 'aprobado') {
    await activarCompra(pago);
  }
}

async function activarCompra(pago: {
  id: string;
  concepto: string;
  concepto_id: string;
  user_id: string | null;
  monto: number;
}): Promise<void> {
  if (pago.concepto === 'paquete_shala' && pago.user_id) {
    const { data: catalogo } = await supabaseAdmin
      .from('paquetes_catalogo')
      .select('num_clases, vigencia_dias')
      .eq('id', pago.concepto_id)
      .single();

    if (!catalogo) return;

    const expira = new Date();
    expira.setDate(expira.getDate() + (catalogo.vigencia_dias ?? 30));

    await supabaseAdmin.from('paquetes_usuario').insert({
      user_id: pago.user_id,
      paquete_id: pago.concepto_id,
      clases_restantes: catalogo.num_clases,
      expira_en: expira.toISOString(),
      pago_id: pago.id,
      activo: true,
    });
  }

  if (pago.concepto === 'diplomado') {
    await supabaseAdmin
      .from('inscripciones_diplomado')
      .update({ estado_pago: 'completado', pago_id: pago.id })
      .eq('pago_id', pago.id);
  }

  if (pago.concepto === 'retiro') {
    await supabaseAdmin
      .from('inscripciones_retiro')
      .update({ estado_pago: 'completado', pago_id: pago.id })
      .eq('pago_id', pago.id);
  }

  if (pago.concepto === 'evento') {
    await supabaseAdmin
      .from('inscripciones_evento')
      .update({ pago_id: pago.id })
      .eq('pago_id', pago.id);
  }
}

export async function getEstadoPago(pagoId: string) {
  const { data, error } = await supabaseAdmin
    .from('pagos')
    .select('id, estado, concepto, monto, created_at')
    .eq('id', pagoId)
    .single();
  if (error) throw new Error('Pago no encontrado');
  return data;
}
