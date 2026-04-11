// frontend/lib/pagos.ts
import { api } from './api';

interface IniciarPagoParams {
  concepto: 'paquete_shala' | 'diplomado' | 'retiro' | 'evento';
  concepto_id: string;
  monto: number;
  titulo: string;
}

interface PreferenciaResponse {
  init_point: string;
  pago_id: string;
}

export async function iniciarPago(params: IniciarPagoParams): Promise<void> {
  const result = await api.post<PreferenciaResponse>('/api/pagos/mercadopago/crear', params);
  window.location.href = result.init_point;
}
