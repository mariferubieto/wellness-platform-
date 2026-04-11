'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';

interface PaqueteUsuario {
  id: string;
  clases_restantes: number;
  expira_en: string;
  activo: boolean;
  paquetes_catalogo: { nombre: string; num_clases: number } | null;
}

interface Reserva {
  id: string;
  estado: string;
  credito_devuelto: boolean;
  created_at: string;
  clases: { id: string; nombre: string; inicio: string; tipo: string } | null;
}

export default function MisPaquetesPage() {
  const [paquetes, setPaquetes] = useState<PaqueteUsuario[]>([]);
  const [reservas, setReservas] = useState<Reserva[]>([]);
  const [loading, setLoading] = useState(true);
  const [cancelando, setCancelando] = useState<string | null>(null);
  const [mensaje, setMensaje] = useState('');
  const mensajeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (mensajeTimerRef.current) clearTimeout(mensajeTimerRef.current);
    };
  }, []);

  async function loadData() {
    const [p, r] = await Promise.all([
      api.get<PaqueteUsuario[]>('/api/shala/paquetes/mis-paquetes').catch(() => [] as PaqueteUsuario[]),
      api.get<Reserva[]>('/api/shala/reservas/mis-reservas').catch(() => [] as Reserva[]),
    ]);
    setPaquetes(p);
    setReservas(r);
  }

  useEffect(() => {
    loadData().finally(() => setLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleCancelar(reservaId: string) {
    setCancelando(reservaId);
    try {
      const result = await api.delete<{ credito_devuelto: boolean }>(`/api/shala/reservas/${reservaId}`);
      if (mensajeTimerRef.current) clearTimeout(mensajeTimerRef.current);
      setMensaje(
        result.credito_devuelto
          ? 'Reserva cancelada. Tu crédito fue devuelto.'
          : 'Reserva cancelada. No se devolvió crédito (cancelación tardía).'
      );
      mensajeTimerRef.current = setTimeout(() => setMensaje(''), 4000);
      await loadData();
    } catch (err: unknown) {
      setMensaje(err instanceof Error ? err.message : 'Error al cancelar');
    } finally {
      setCancelando(null);
    }
  }

  const reservasActivas = reservas.filter(r => r.estado === 'activa');
  const historial = reservas.filter(r => r.estado !== 'activa');

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-tierra-light text-sm tracking-widest uppercase">Cargando...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen px-4 py-12">
      <div className="max-w-3xl mx-auto">

        <div className="mb-10">
          <div className="w-8 h-px bg-sand mb-4" />
          <h1 className="text-3xl text-tierra">Mis paquetes</h1>
        </div>

        {mensaje && (
          <div className="mb-6 p-4 bg-sage-muted border border-sage text-sage text-sm rounded-wellness">
            {mensaje}
          </div>
        )}

        <section className="mb-10">
          <p className="label-wellness mb-4">Paquetes activos</p>
          {paquetes.length === 0 ? (
            <div className="card-wellness text-center py-8">
              <p className="text-tierra-light text-sm mb-4">No tienes paquetes activos</p>
              <Link href="/shala" className="btn-secondary text-xs">
                Ver paquetes disponibles
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {paquetes.map(p => (
                <div key={p.id} className="card-wellness">
                  <p className="text-xs text-tierra-light mb-1">{p.paquetes_catalogo?.nombre}</p>
                  <p className="text-3xl font-light text-tierra">{p.clases_restantes}</p>
                  <p className="text-tierra-light text-sm">
                    crédito{p.clases_restantes !== 1 ? 's' : ''} restante{p.clases_restantes !== 1 ? 's' : ''}
                  </p>
                  <p className="text-tierra-light text-xs mt-3">
                    Expira: {new Date(p.expira_en).toLocaleDateString('es-MX', { day: 'numeric', month: 'long', year: 'numeric' })}
                  </p>
                </div>
              ))}
            </div>
          )}
        </section>

        {reservasActivas.length > 0 && (
          <section className="mb-10">
            <p className="label-wellness mb-4">Clases reservadas</p>
            <div className="space-y-3">
              {reservasActivas.map(r => (
                <div key={r.id} className="card-wellness flex items-center justify-between">
                  <div>
                    <p className="text-tierra text-sm font-medium">{r.clases?.nombre}</p>
                    <p className="text-tierra-light text-xs mt-1">
                      {r.clases?.inicio
                        ? new Date(r.clases.inicio).toLocaleString('es-MX', {
                            weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit',
                          })
                        : '—'}
                    </p>
                  </div>
                  <button
                    onClick={() => handleCancelar(r.id)}
                    disabled={cancelando === r.id}
                    className="text-xs text-tierra-light hover:text-red-500 transition-colors disabled:opacity-50"
                  >
                    {cancelando === r.id ? 'Cancelando...' : 'Cancelar'}
                  </button>
                </div>
              ))}
            </div>
          </section>
        )}

        {historial.length > 0 && (
          <section>
            <p className="label-wellness mb-4">Historial</p>
            <div className="space-y-2">
              {historial.slice(0, 10).map(r => (
                <div key={r.id} className="flex items-center justify-between py-3 border-b border-beige-lino last:border-0">
                  <div>
                    <p className="text-tierra-mid text-sm">{r.clases?.nombre ?? '—'}</p>
                    <p className="text-tierra-light text-xs">
                      {r.clases?.inicio ? new Date(r.clases.inicio).toLocaleDateString('es-MX') : '—'}
                    </p>
                  </div>
                  <span className={`text-xs px-2 py-1 rounded-full ${
                    r.estado === 'asistio' ? 'bg-sage-muted text-sage' : 'bg-beige-lino text-tierra-light'
                  }`}>
                    {r.estado === 'asistio' ? 'Asistió' : 'Cancelada'}
                  </span>
                </div>
              ))}
            </div>
          </section>
        )}

      </div>
    </div>
  );
}
