'use client';

import { useEffect, useRef, useState } from 'react';
import { api } from '@/lib/api';

interface ClaseDeReserva {
  id: string;
  nombre: string;
  inicio: string;
  fin: string;
  tipo: string;
  espacio_tipo?: string;
}

interface Reserva {
  id: string;
  estado: string;
  credito_devuelto?: boolean;
  created_at: string;
  clases?: ClaseDeReserva | null;
}

const ESPACIO_LABELS: Record<string, string> = {
  salon: 'Salón',
  jardin: 'Jardín',
};

export default function MisReservasPage() {
  const [reservas, setReservas] = useState<Reserva[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'proximas' | 'historial'>('proximas');
  const [cancelando, setCancelando] = useState<string | null>(null);
  const [msg, setMsg] = useState('');
  const [error, setError] = useState('');
  const msgTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const errTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  async function loadReservas() {
    const data = await api.get<Reserva[]>('/api/shala/reservas/mis-reservas');
    setReservas(data);
  }

  useEffect(() => {
    loadReservas().catch(() => {}).finally(() => setLoading(false));
  }, []);

  function showMsg(ok: boolean, m: string) {
    if (ok) {
      if (msgTimerRef.current) clearTimeout(msgTimerRef.current);
      setMsg(m);
      msgTimerRef.current = setTimeout(() => setMsg(''), 4000);
    } else {
      if (errTimerRef.current) clearTimeout(errTimerRef.current);
      setError(m);
      errTimerRef.current = setTimeout(() => setError(''), 4000);
    }
  }

  async function cancelar(reservaId: string) {
    setCancelando(reservaId);
    try {
      const result = await api.delete<{ credito_devuelto: boolean }>(`/api/shala/reservas/${reservaId}`);
      await loadReservas();
      showMsg(true, result.credito_devuelto
        ? '✓ Reserva cancelada — crédito devuelto'
        : '✓ Reserva cancelada (sin crédito — menos de 2 horas)'
      );
    } catch (err: unknown) {
      showMsg(false, err instanceof Error ? err.message : 'No se pudo cancelar');
    } finally {
      setCancelando(null);
    }
  }

  const ahora = new Date();

  const proximas = reservas.filter(r => {
    if (r.estado !== 'activa') return false;
    return r.clases && new Date(r.clases.inicio) > ahora;
  }).sort((a, b) =>
    new Date(a.clases!.inicio).getTime() - new Date(b.clases!.inicio).getTime()
  );

  const historial = reservas.filter(r => {
    const pasada = r.clases && new Date(r.clases.inicio) <= ahora;
    const cancelada = r.estado === 'cancelada';
    return pasada || cancelada;
  }).sort((a, b) =>
    new Date(b.clases?.inicio ?? b.created_at).getTime() -
    new Date(a.clases?.inicio ?? a.created_at).getTime()
  );

  function puedeCancel(reserva: Reserva): boolean {
    if (!reserva.clases) return false;
    return new Date(reserva.clases.inicio).getTime() > ahora.getTime();
  }

  function formatFechaHora(iso: string) {
    const d = new Date(iso);
    const fecha = d.toLocaleDateString('es-MX', { weekday: 'short', day: 'numeric', month: 'short' });
    const hora = d.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' });
    return `${fecha} · ${hora}`;
  }

  return (
    <div className="min-h-screen px-4 py-12">
      <div className="max-w-2xl mx-auto">

        <div className="mb-8">
          <div className="w-8 h-px bg-sand mb-4" />
          <h1 className="text-3xl text-tierra">Mis Reservas</h1>
        </div>

        {msg && <div className="mb-6 p-4 bg-sage-muted border border-sage text-sage text-sm rounded-wellness">{msg}</div>}
        {error && <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-600 text-sm rounded-wellness">{error}</div>}

        {/* Tabs */}
        <div className="flex gap-6 border-b border-beige-lino mb-8">
          {[
            { key: 'proximas' as const, label: `Próximas (${proximas.length})` },
            { key: 'historial' as const, label: 'Historial' },
          ].map(t => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`pb-3 text-xs tracking-widest uppercase transition-colors ${
                tab === t.key ? 'text-tierra border-b-2 border-sand' : 'text-tierra-light'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {loading ? (
          <p className="text-tierra-light text-sm tracking-widest uppercase">Cargando...</p>
        ) : (
          <>
            {/* Próximas */}
            {tab === 'proximas' && (
              <div className="space-y-4">
                {proximas.length === 0 ? (
                  <div className="card-wellness text-center py-10">
                    <p className="text-tierra-light text-sm">No tienes clases reservadas próximamente</p>
                    <a href="/shala/calendario" className="text-sage text-xs mt-2 block hover:underline">
                      Ver calendario →
                    </a>
                  </div>
                ) : (
                  proximas.map(r => (
                    <div key={r.id} className="card-wellness">
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="text-tierra font-medium">{r.clases!.nombre}</p>
                          <p className="text-tierra-light text-sm mt-1">{formatFechaHora(r.clases!.inicio)}</p>
                          {r.clases!.espacio_tipo && (
                            <p className="text-tierra-light text-xs mt-0.5">
                              {ESPACIO_LABELS[r.clases!.espacio_tipo] ?? r.clases!.espacio_tipo}
                            </p>
                          )}
                        </div>
                        {puedeCancel(r) && (
                          <button
                            onClick={() => cancelar(r.id)}
                            disabled={cancelando === r.id}
                            className="text-tierra-light text-xs hover:text-red-400 transition-colors disabled:opacity-50 shrink-0 ml-4"
                          >
                            {cancelando === r.id ? 'Cancelando...' : 'Cancelar'}
                          </button>
                        )}
                      </div>
                      <p className="text-tierra-light/50 text-xs mt-3">
                        Cancelaciones con más de 2 horas de anticipación devuelven el crédito
                      </p>
                    </div>
                  ))
                )}
              </div>
            )}

            {/* Historial */}
            {tab === 'historial' && (
              <div className="space-y-3">
                {historial.length === 0 ? (
                  <div className="card-wellness text-center py-10">
                    <p className="text-tierra-light text-sm">Sin historial de clases</p>
                  </div>
                ) : (
                  historial.map(r => (
                    <div key={r.id} className={`card-wellness py-3 ${r.estado === 'cancelada' ? 'opacity-60' : ''}`}>
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="text-tierra text-sm font-medium">{r.clases?.nombre ?? '—'}</p>
                          <p className="text-tierra-light text-xs mt-0.5">
                            {r.clases ? formatFechaHora(r.clases.inicio) : '—'}
                          </p>
                        </div>
                        <span className={`text-xs px-2 py-1 rounded-full shrink-0 ml-3 ${
                          r.estado === 'cancelada' ? 'bg-red-50 text-red-400' : 'bg-sage-muted text-sage'
                        }`}>
                          {r.estado === 'cancelada' ? 'Cancelada' : 'Asistida'}
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
