'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import Button from '@/components/ui/Button';

interface Retiro {
  id: string;
  nombre: string;
  lugar?: string;
  fecha_inicio?: string;
  fecha_fin?: string;
  precio: number;
  tipo_acceso: 'pago' | 'whatsapp';
}

interface Evento {
  id: string;
  nombre: string;
  fecha?: string;
  tipo_acceso: string;
  precio?: number | null;
}

interface Inscrito {
  id: string;
  nombre_completo: string;
  email: string;
  whatsapp: string;
  estado_pago: string;
  created_at: string;
}

type VistaActual = { tipo: 'retiro'; id: string; nombre: string } | { tipo: 'evento'; id: string; nombre: string } | null;

export default function AdminMariferPage() {
  const [retiros, setRetiros] = useState<Retiro[]>([]);
  const [eventos, setEventos] = useState<Evento[]>([]);
  const [inscritos, setInscritos] = useState<Inscrito[]>([]);
  const [vistaActual, setVistaActual] = useState<VistaActual>(null);
  const [loading, setLoading] = useState(true);
  const [loadingInscritos, setLoadingInscritos] = useState(false);
  const [exportando, setExportando] = useState(false);
  const [exportError, setExportError] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    Promise.all([
      api.get<Retiro[]>('/api/retiros').catch(() => [] as Retiro[]),
      api.get<Evento[]>('/api/eventos').catch(() => [] as Evento[]),
    ])
      .then(([r, e]) => { setRetiros(r); setEventos(e); })
      .catch((err: unknown) => setError(err instanceof Error ? err.message : 'Error'))
      .finally(() => setLoading(false));
  }, []);

  async function verInscritos(tipo: 'retiro' | 'evento', id: string, nombre: string) {
    setVistaActual({ tipo, id, nombre });
    setLoadingInscritos(true);
    setInscritos([]);
    try {
      const endpoint = tipo === 'retiro'
        ? `/api/admin/retiros/${id}/inscritos`
        : `/api/admin/eventos/${id}/inscritos`;
      const data = await api.get<Inscrito[]>(endpoint);
      setInscritos(data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error');
    } finally {
      setLoadingInscritos(false);
    }
  }

  async function handleTipoAcceso(retiroId: string, tipo: 'pago' | 'whatsapp') {
    try {
      await api.patch(`/api/retiros/${retiroId}`, { tipo_acceso: tipo });
      setRetiros(prev => prev.map(r => r.id === retiroId ? { ...r, tipo_acceso: tipo } : r));
    } catch {
      setError('Error al actualizar tipo de acceso');
    }
  }

  async function handleExportar() {
    if (!vistaActual) return;
    setExportando(true);
    setExportError('');
    try {
      const { createSupabaseClient } = await import('@/lib/supabase');
      const supabase = createSupabaseClient();
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) throw new Error('Sin sesión');

      const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
      const endpoint = vistaActual.tipo === 'retiro'
        ? `/api/admin/exportar/retiro/${vistaActual.id}`
        : `/api/admin/exportar/evento/${vistaActual.id}`;

      const res = await fetch(`${API_URL}${endpoint}`, {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({ error: `Error ${res.status}` }));
        throw new Error(errData.error || `Error ${res.status}`);
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${vistaActual.tipo}-${vistaActual.nombre.replace(/\s+/g, '-')}-${new Date().toISOString().split('T')[0]}.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err: unknown) {
      setExportError(err instanceof Error ? err.message : 'Error al exportar');
    } finally {
      setExportando(false);
    }
  }

  return (
    <div>
      <div className="mb-8">
        <div className="w-8 h-px bg-sand mb-4" />
        <h1 className="text-3xl text-tierra">MARIFER — Retiros & Eventos</h1>
      </div>

      {error && <p className="text-red-500 text-sm mb-4">{error}</p>}

      {loading ? (
        <p className="text-tierra-light text-sm tracking-widest uppercase">Cargando...</p>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">

          {/* Retiros */}
          <div>
            <h2 className="text-lg text-tierra mb-3">Retiros</h2>
            {retiros.length === 0 ? (
              <p className="text-tierra-light text-sm">No hay retiros</p>
            ) : (
              <div className="space-y-2">
                {retiros.map(r => (
                  <div
                    key={r.id}
                    className={`bg-white border rounded-wellness px-4 py-3 transition-colors ${
                      vistaActual?.id === r.id ? 'border-sage bg-sage-muted/30' : 'border-beige-lino hover:border-sage'
                    }`}
                  >
                    <div
                      className="cursor-pointer"
                      onClick={() => verInscritos('retiro', r.id, r.nombre)}
                    >
                      <p className="text-sm text-tierra">{r.nombre}</p>
                      <p className="text-xs text-tierra-light">{r.lugar ?? '—'} · ${r.precio.toLocaleString('es-MX')} MXN</p>
                    </div>
                    <div className="mt-2 flex items-center gap-2">
                      <select
                        value={r.tipo_acceso}
                        onChange={e => handleTipoAcceso(r.id, e.target.value as 'pago' | 'whatsapp')}
                        className="text-xs border border-beige-lino rounded px-2 py-1 text-tierra-light bg-white"
                        onClick={e => e.stopPropagation()}
                      >
                        <option value="pago">Pago</option>
                        <option value="whatsapp">WhatsApp</option>
                      </select>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Eventos */}
          <div>
            <h2 className="text-lg text-tierra mb-3">Eventos</h2>
            {eventos.length === 0 ? (
              <p className="text-tierra-light text-sm">No hay eventos</p>
            ) : (
              <div className="space-y-2">
                {eventos.map(e => (
                  <div
                    key={e.id}
                    className={`bg-white border rounded-wellness px-4 py-3 cursor-pointer transition-colors ${
                      vistaActual?.id === e.id ? 'border-sage bg-sage-muted/30' : 'border-beige-lino hover:border-sage'
                    }`}
                    onClick={() => verInscritos('evento', e.id, e.nombre)}
                  >
                    <p className="text-sm text-tierra">{e.nombre}</p>
                    <p className="text-xs text-tierra-light">
                      {e.tipo_acceso}
                      {e.precio != null ? ` · $${e.precio.toLocaleString('es-MX')} MXN` : ''}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Inscritos */}
      {vistaActual && (
        <div>
          <div className="mb-4 flex items-center justify-between">
            <div>
              <div className="w-6 h-px bg-sand mb-2" />
              <h2 className="text-xl text-tierra">Inscritos — {vistaActual.nombre}</h2>
              <p className="text-tierra-light text-sm mt-1">{inscritos.length} inscripciones</p>
            </div>
            <Button variant="secondary" onClick={handleExportar} loading={exportando}>
              Exportar Excel
            </Button>
          </div>

          {exportError && <p className="text-red-400 text-xs mb-3">{exportError}</p>}

          {loadingInscritos ? (
            <p className="text-tierra-light text-sm tracking-widest uppercase">Cargando...</p>
          ) : inscritos.length === 0 ? (
            <div className="card-wellness text-center py-10">
              <p className="text-tierra-light text-sm">Sin inscripciones aún</p>
            </div>
          ) : (
            <div className="bg-white border border-beige-lino rounded-wellness overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-beige-lino">
                    <th className="label-wellness text-left px-4 py-3">Nombre</th>
                    <th className="label-wellness text-left px-4 py-3">Email</th>
                    <th className="label-wellness text-left px-4 py-3">WhatsApp</th>
                    <th className="label-wellness text-left px-4 py-3">Pago</th>
                    <th className="label-wellness text-left px-4 py-3">Fecha</th>
                  </tr>
                </thead>
                <tbody>
                  {inscritos.map((ins, i) => (
                    <tr
                      key={ins.id}
                      className={`border-b border-beige-lino last:border-0 ${i % 2 === 0 ? 'bg-white' : 'bg-beige/30'}`}
                    >
                      <td className="px-4 py-3 text-tierra">{ins.nombre_completo}</td>
                      <td className="px-4 py-3 text-tierra-light text-xs">{ins.email}</td>
                      <td className="px-4 py-3 text-tierra-mid">{ins.whatsapp}</td>
                      <td className="px-4 py-3">
                        <span className={`text-xs px-2 py-1 rounded-full ${
                          ins.estado_pago === 'completado'
                            ? 'bg-sage-muted text-sage'
                            : ins.estado_pago === 'fallido'
                            ? 'bg-red-50 text-red-400'
                            : 'bg-beige text-tierra-light'
                        }`}>
                          {ins.estado_pago}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-tierra-light text-xs">
                        {new Date(ins.created_at).toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
