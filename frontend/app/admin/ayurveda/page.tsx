'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import Button from '@/components/ui/Button';

interface Inscripcion {
  id: string;
  nombre_completo: string;
  email_gmail: string;
  whatsapp: string;
  fecha_nacimiento?: string;
  razon?: string;
  estado_pago: string;
  created_at: string;
  diplomados: { nombre: string; generacion: string } | null;
}

interface Diplomado {
  id: string;
  nombre: string;
  generacion: string;
  precio: number;
  activo: boolean;
}

export default function AdminAyurvedaPage() {
  const [inscripciones, setInscripciones] = useState<Inscripcion[]>([]);
  const [diplomados, setDiplomados] = useState<Diplomado[]>([]);
  const [generacionFiltro, setGeneracionFiltro] = useState('');
  const [generaciones, setGeneraciones] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [exportando, setExportando] = useState(false);
  const [exportError, setExportError] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    Promise.all([
      api.get<Inscripcion[]>('/api/admin/ayurveda/alumnos').catch(() => [] as Inscripcion[]),
      api.get<Diplomado[]>('/api/ayurveda/diplomados').catch(() => [] as Diplomado[]),
    ])
      .then(([insc, dips]) => {
        setInscripciones(insc);
        setDiplomados(dips);
        const gens = Array.from(new Set(insc.map(i => i.diplomados?.generacion).filter(Boolean))) as string[];
        setGeneraciones(gens);
      })
      .catch((err: unknown) => setError(err instanceof Error ? err.message : 'Error'))
      .finally(() => setLoading(false));
  }, []);

  const inscripcionesFiltradas = generacionFiltro
    ? inscripciones.filter(i => i.diplomados?.generacion === generacionFiltro)
    : inscripciones;

  async function handleExportar() {
    if (!generacionFiltro) return;
    setExportando(true);
    setExportError('');
    try {
      const { createSupabaseClient } = await import('@/lib/supabase');
      const supabase = createSupabaseClient();
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) throw new Error('Sin sesión');

      const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
      const genEncoded = encodeURIComponent(generacionFiltro);
      const res = await fetch(`${API_URL}/api/admin/ayurveda/exportar/${genEncoded}`, {
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
      a.download = `ayurveda-${generacionFiltro.replace(/\s+/g, '-')}-${new Date().toISOString().split('T')[0]}.xlsx`;
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
      <div className="mb-8 flex items-start justify-between">
        <div>
          <div className="w-8 h-px bg-sand mb-4" />
          <h1 className="text-3xl text-tierra">AYURVEDA — Inscripciones</h1>
          <p className="text-tierra-light text-sm mt-1">{inscripciones.length} inscripciones totales</p>
        </div>
      </div>

      {error && <p className="text-red-500 text-sm mb-4">{error}</p>}

      {/* Diplomados activos */}
      {diplomados.length > 0 && (
        <div className="mb-8">
          <h2 className="text-lg text-tierra mb-3">Diplomados activos</h2>
          <div className="flex flex-wrap gap-3">
            {diplomados.map(d => (
              <div key={d.id} className="bg-white border border-beige-lino rounded-wellness px-4 py-3">
                <p className="text-sm text-tierra">{d.nombre}</p>
                <p className="text-xs text-tierra-light">{d.generacion} · ${d.precio.toLocaleString('es-MX')} MXN</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Filtro por generación */}
      <div className="mb-6 flex items-center gap-4 flex-wrap">
        <div>
          <label className="label-wellness block mb-2">Filtrar por generación</label>
          <select
            value={generacionFiltro}
            onChange={e => setGeneracionFiltro(e.target.value)}
            className="px-4 py-2 bg-white border border-beige-lino rounded-wellness text-sm text-tierra focus:outline-none focus:border-sage"
          >
            <option value="">Todas las generaciones</option>
            {generaciones.map(g => (
              <option key={g} value={g}>{g}</option>
            ))}
          </select>
        </div>
        {generacionFiltro && (
          <div className="mt-6">
            <Button variant="secondary" onClick={handleExportar} loading={exportando}>
              Exportar {generacionFiltro}
            </Button>
          </div>
        )}
      </div>

      {exportError && <p className="text-red-400 text-xs mb-4">{exportError}</p>}

      {/* Tabla de inscripciones */}
      {loading ? (
        <p className="text-tierra-light text-sm tracking-widest uppercase">Cargando...</p>
      ) : inscripcionesFiltradas.length === 0 ? (
        <div className="card-wellness text-center py-12">
          <p className="text-tierra-light text-sm">No hay inscripciones</p>
        </div>
      ) : (
        <div className="bg-white border border-beige-lino rounded-wellness overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-beige-lino">
                <th className="label-wellness text-left px-4 py-3">Nombre</th>
                <th className="label-wellness text-left px-4 py-3">WhatsApp</th>
                <th className="label-wellness text-left px-4 py-3">Gmail</th>
                <th className="label-wellness text-left px-4 py-3">Generación</th>
                <th className="label-wellness text-left px-4 py-3">Pago</th>
                <th className="label-wellness text-left px-4 py-3">Fecha</th>
              </tr>
            </thead>
            <tbody>
              {inscripcionesFiltradas.map((insc, i) => (
                <tr
                  key={insc.id}
                  className={`border-b border-beige-lino last:border-0 ${i % 2 === 0 ? 'bg-white' : 'bg-beige/30'}`}
                >
                  <td className="px-4 py-3 text-tierra">{insc.nombre_completo}</td>
                  <td className="px-4 py-3 text-tierra-mid">{insc.whatsapp}</td>
                  <td className="px-4 py-3 text-tierra-light text-xs">{insc.email_gmail}</td>
                  <td className="px-4 py-3 text-tierra-light text-xs">{insc.diplomados?.generacion ?? '—'}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-1 rounded-full ${
                      insc.estado_pago === 'completado'
                        ? 'bg-sage-muted text-sage'
                        : insc.estado_pago === 'fallido'
                        ? 'bg-red-50 text-red-400'
                        : 'bg-beige text-tierra-light'
                    }`}>
                      {insc.estado_pago}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-tierra-light text-xs">
                    {new Date(insc.created_at).toLocaleDateString('es-MX', {
                      day: 'numeric', month: 'short', year: 'numeric',
                    })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
