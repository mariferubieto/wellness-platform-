'use client';

import { useEffect, useState, useCallback } from 'react';
import { api } from '@/lib/api';
import FotoUpload from '@/components/ui/FotoUpload';

/* ─── Types ─────────────────────────────────────────── */
interface Diplomado {
  id: string;
  nombre: string;
  descripcion?: string;
  temario?: string[];
  calendario?: string[];
  precio: number;
  generacion: string;
  activo: boolean;
}

interface CursoAyurveda {
  id: string;
  tipo: 'cocina' | 'pranayamas' | 'extras';
  nombre: string;
  descripcion?: string;
  temario?: string[];
  fechas?: string[];
  precio: number;
  foto_url?: string;
  cupo_maximo?: number;
  activo: boolean;
  tipo_acceso: 'pago' | 'whatsapp' | 'gratis';
}

interface Inscripcion {
  id: string;
  nombre_completo: string;
  email_gmail: string;
  whatsapp: string;
  estado_pago: string;
  created_at: string;
  diplomados: { nombre: string; generacion: string } | null;
}

type TabId = 'diplomados' | 'cocina' | 'pranayamas' | 'extras' | 'inscripciones';

const TABS: { id: TabId; label: string }[] = [
  { id: 'diplomados', label: 'Diplomados' },
  { id: 'cocina', label: 'Clases de Cocina' },
  { id: 'pranayamas', label: 'Pranayamas' },
  { id: 'extras', label: 'Cursos Extras' },
  { id: 'inscripciones', label: 'Inscripciones' },
];

/* ─── Helpers ────────────────────────────────────────── */
function parseLines(text: string): string[] {
  return text.split('\n').map(s => s.trim()).filter(Boolean);
}

/* ─── Diplomados Tab ─────────────────────────────────── */
function DiplomadosTab() {
  const [diplomados, setDiplomados] = useState<Diplomado[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({
    nombre: '', descripcion: '', temario: '', calendario: '', precio: '', generacion: '',
  });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.get<Diplomado[]>('/api/ayurveda/diplomados');
      setDiplomados(data);
    } catch { /* empty */ } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      await api.post('/api/ayurveda/diplomados', {
        nombre: form.nombre,
        descripcion: form.descripcion || undefined,
        temario: form.temario ? parseLines(form.temario) : undefined,
        calendario: form.calendario ? parseLines(form.calendario) : undefined,
        precio: Number(form.precio),
        generacion: form.generacion,
      });
      setForm({ nombre: '', descripcion: '', temario: '', calendario: '', precio: '', generacion: '' });
      await load();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error');
    } finally { setSaving(false); }
  }

  async function handleToggle(id: string, activo: boolean) {
    try {
      await api.patch(`/api/ayurveda/diplomados/${id}`, { activo: !activo });
      await load();
    } catch { /* empty */ }
  }

  return (
    <div className="space-y-8">
      {/* Form */}
      <div className="card-wellness">
        <h2 className="text-lg text-tierra mb-6">Nuevo diplomado</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="label-wellness">Nombre *</label>
              <input className="input-wellness mt-1" value={form.nombre}
                onChange={e => setForm(f => ({ ...f, nombre: e.target.value }))} required />
            </div>
            <div>
              <label className="label-wellness">Generación *</label>
              <input className="input-wellness mt-1" placeholder="ej: Generación 2026-A"
                value={form.generacion}
                onChange={e => setForm(f => ({ ...f, generacion: e.target.value }))} required />
            </div>
            <div>
              <label className="label-wellness">Precio (MXN) *</label>
              <input className="input-wellness mt-1" type="number" min="0" step="0.01"
                value={form.precio}
                onChange={e => setForm(f => ({ ...f, precio: e.target.value }))} required />
            </div>
            <div>
              <label className="label-wellness">Descripción</label>
              <input className="input-wellness mt-1" value={form.descripcion}
                onChange={e => setForm(f => ({ ...f, descripcion: e.target.value }))} />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="label-wellness">Temario (una línea por módulo)</label>
              <textarea className="input-wellness mt-1 h-28" value={form.temario}
                placeholder="Módulo 1: Introducción&#10;Módulo 2: Doshas&#10;..."
                onChange={e => setForm(f => ({ ...f, temario: e.target.value }))} />
            </div>
            <div>
              <label className="label-wellness">Calendario (una línea por fecha)</label>
              <textarea className="input-wellness mt-1 h-28" value={form.calendario}
                placeholder="Sábado 10 de mayo, 9am–1pm&#10;Sábado 17 de mayo, 9am–1pm&#10;..."
                onChange={e => setForm(f => ({ ...f, calendario: e.target.value }))} />
            </div>
          </div>
          {error && <p className="text-red-400 text-xs">{error}</p>}
          <div className="flex justify-end">
            <button type="submit" disabled={saving} className="btn-wellness">
              {saving ? 'Guardando...' : 'Crear diplomado'}
            </button>
          </div>
        </form>
      </div>

      {/* List */}
      {loading ? <p className="text-tierra-light text-sm tracking-widest">Cargando...</p> : (
        <div className="space-y-3">
          {diplomados.map(d => (
            <div key={d.id} className="card-wellness flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <p className="text-tierra font-medium">{d.nombre}</p>
                <p className="text-tierra-light text-xs mt-0.5">{d.generacion} · ${d.precio.toLocaleString('es-MX')} MXN</p>
                {d.descripcion && <p className="text-tierra-mid text-xs mt-1">{d.descripcion}</p>}
                {d.temario && d.temario.length > 0 && (
                  <p className="text-tierra-light text-xs mt-1">{d.temario.length} módulos</p>
                )}
              </div>
              <button
                onClick={() => handleToggle(d.id, d.activo)}
                className={`text-xs px-3 py-1.5 rounded-full whitespace-nowrap transition-colors ${
                  d.activo ? 'bg-sage-muted text-sage' : 'bg-beige text-tierra-light'
                }`}
              >
                {d.activo ? 'Activo' : 'Inactivo'}
              </button>
            </div>
          ))}
          {diplomados.length === 0 && (
            <p className="text-tierra-light text-sm text-center py-8">No hay diplomados creados</p>
          )}
        </div>
      )}
    </div>
  );
}

/* ─── Curso Tab (cocina / pranayamas / extras) ───────────── */
interface CursoTabProps { tipo: 'cocina' | 'pranayamas' | 'extras'; label: string; }

function CursoTab({ tipo, label }: CursoTabProps) {
  const [cursos, setCursos] = useState<CursoAyurveda[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({
    nombre: '', descripcion: '', temario: '', fechas: '', precio: '', foto_url: '', cupo_maximo: '',
    tipo_acceso: 'pago' as 'pago' | 'whatsapp' | 'gratis',
  });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.get<CursoAyurveda[]>(`/api/ayurveda/cursos/${tipo}`);
      setCursos(data);
    } catch { /* empty */ } finally { setLoading(false); }
  }, [tipo]);

  useEffect(() => { load(); }, [load]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      await api.post('/api/ayurveda/cursos', {
        tipo,
        nombre: form.nombre,
        descripcion: form.descripcion || undefined,
        temario: form.temario ? parseLines(form.temario) : undefined,
        fechas: form.fechas ? parseLines(form.fechas) : undefined,
        precio: Number(form.precio) || 0,
        foto_url: form.foto_url || undefined,
        cupo_maximo: form.cupo_maximo ? Number(form.cupo_maximo) : undefined,
        tipo_acceso: form.tipo_acceso,
      });
      setForm({ nombre: '', descripcion: '', temario: '', fechas: '', precio: '', foto_url: '', cupo_maximo: '', tipo_acceso: 'pago' });
      await load();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error');
    } finally { setSaving(false); }
  }

  async function handleDelete(id: string) {
    try {
      await api.delete(`/api/ayurveda/cursos/${id}`);
      await load();
    } catch { /* empty */ }
  }

  return (
    <div className="space-y-8">
      {/* Form */}
      <div className="card-wellness">
        <h2 className="text-lg text-tierra mb-6">Nuevo curso — {label}</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <FotoUpload
            value={form.foto_url}
            onChange={url => setForm(f => ({ ...f, foto_url: url }))}
            folder={`ayurveda/${tipo}`}
          />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="label-wellness">Nombre *</label>
              <input className="input-wellness mt-1" value={form.nombre}
                onChange={e => setForm(f => ({ ...f, nombre: e.target.value }))} required />
            </div>
            <div>
              <label className="label-wellness">Precio (MXN)</label>
              <input className="input-wellness mt-1" type="number" min="0" step="0.01"
                value={form.precio}
                onChange={e => setForm(f => ({ ...f, precio: e.target.value }))} />
            </div>
            <div className="md:col-span-2">
              <label className="label-wellness">Descripción</label>
              <textarea className="input-wellness mt-1 h-20" value={form.descripcion}
                onChange={e => setForm(f => ({ ...f, descripcion: e.target.value }))} />
            </div>
            <div>
              <label className="label-wellness">Cupo máximo</label>
              <input className="input-wellness mt-1" type="number" min="1"
                value={form.cupo_maximo}
                onChange={e => setForm(f => ({ ...f, cupo_maximo: e.target.value }))} />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="label-wellness">Temario / Contenido (una línea por tema)</label>
              <textarea className="input-wellness mt-1 h-28" value={form.temario}
                placeholder="Tema 1&#10;Tema 2&#10;..."
                onChange={e => setForm(f => ({ ...f, temario: e.target.value }))} />
            </div>
            <div>
              <label className="label-wellness">Fechas y horarios (una línea por fecha)</label>
              <textarea className="input-wellness mt-1 h-28" value={form.fechas}
                placeholder="Lunes 5 de mayo, 6pm–8pm&#10;Lunes 12 de mayo, 6pm–8pm&#10;..."
                onChange={e => setForm(f => ({ ...f, fechas: e.target.value }))} />
            </div>
          </div>
          <div>
            <label className="label-wellness">Tipo de acceso</label>
            <select
              value={form.tipo_acceso}
              onChange={e => setForm(f => ({ ...f, tipo_acceso: e.target.value as 'pago' | 'whatsapp' | 'gratis' }))}
              className="input-wellness mt-1"
            >
              <option value="pago">Pago (MercadoPago)</option>
              <option value="whatsapp">WhatsApp (contacto directo)</option>
              <option value="gratis">Recopilación de datos</option>
            </select>
          </div>
          {error && <p className="text-red-400 text-xs">{error}</p>}
          <div className="flex justify-end">
            <button type="submit" disabled={saving} className="btn-wellness">
              {saving ? 'Guardando...' : 'Crear curso'}
            </button>
          </div>
        </form>
      </div>

      {/* List */}
      {loading ? <p className="text-tierra-light text-sm tracking-widest">Cargando...</p> : (
        <div className="space-y-3">
          {cursos.map(c => (
            <div key={c.id} className="card-wellness flex items-start gap-4">
              {c.foto_url && (
                <img src={c.foto_url} alt={c.nombre}
                  className="w-16 h-16 rounded-wellness object-cover border border-beige-lino flex-shrink-0" />
              )}
              <div className="flex-1 min-w-0">
                <p className="text-tierra font-medium">{c.nombre}</p>
                {c.precio > 0 && (
                  <p className="text-tierra-light text-xs mt-0.5">${c.precio.toLocaleString('es-MX')} MXN</p>
                )}
                {c.descripcion && <p className="text-tierra-mid text-xs mt-1">{c.descripcion}</p>}
                {c.fechas && c.fechas.length > 0 && (
                  <p className="text-tierra-light text-xs mt-1">{c.fechas.length} fechas</p>
                )}
              </div>
              <button
                onClick={() => handleDelete(c.id)}
                className="text-xs text-red-400 hover:text-red-600 transition-colors whitespace-nowrap"
              >
                Eliminar
              </button>
            </div>
          ))}
          {cursos.length === 0 && (
            <p className="text-tierra-light text-sm text-center py-8">No hay cursos de este tipo</p>
          )}
        </div>
      )}
    </div>
  );
}

/* ─── Inscripciones Tab ──────────────────────────────── */
function InscripcionesTab() {
  const [inscripciones, setInscripciones] = useState<Inscripcion[]>([]);
  const [loading, setLoading] = useState(true);
  const [generacionFiltro, setGeneracionFiltro] = useState('');
  const [exportando, setExportando] = useState(false);
  const [exportError, setExportError] = useState('');

  useEffect(() => {
    api.get<Inscripcion[]>('/api/admin/ayurveda/alumnos')
      .then(setInscripciones)
      .catch(() => setInscripciones([]))
      .finally(() => setLoading(false));
  }, []);

  const generaciones = Array.from(
    new Set(inscripciones.map(i => i.diplomados?.generacion).filter(Boolean))
  ) as string[];

  const filtradas = generacionFiltro
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
      const res = await fetch(
        `${API_URL}/api/admin/ayurveda/exportar/${encodeURIComponent(generacionFiltro)}`,
        { headers: { Authorization: `Bearer ${session.access_token}` } }
      );
      if (!res.ok) { const e = await res.json().catch(() => ({ error: 'Error' })); throw new Error(e.error); }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `ayurveda-${generacionFiltro.replace(/\s+/g, '-')}-${new Date().toISOString().split('T')[0]}.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err: unknown) {
      setExportError(err instanceof Error ? err.message : 'Error al exportar');
    } finally { setExportando(false); }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-end gap-4 flex-wrap">
        <div>
          <label className="label-wellness block mb-2">Filtrar por generación</label>
          <select
            value={generacionFiltro}
            onChange={e => setGeneracionFiltro(e.target.value)}
            className="px-4 py-2 bg-white border border-beige-lino rounded-wellness text-sm text-tierra focus:outline-none focus:border-sage"
          >
            <option value="">Todas</option>
            {generaciones.map(g => <option key={g} value={g}>{g}</option>)}
          </select>
        </div>
        {generacionFiltro && (
          <button onClick={handleExportar} disabled={exportando}
            className="btn-secondary text-xs">
            {exportando ? 'Exportando...' : `Exportar ${generacionFiltro}`}
          </button>
        )}
      </div>
      {exportError && <p className="text-red-400 text-xs">{exportError}</p>}

      {loading ? (
        <p className="text-tierra-light text-sm tracking-widest">Cargando...</p>
      ) : filtradas.length === 0 ? (
        <div className="card-wellness text-center py-12">
          <p className="text-tierra-light text-sm">No hay inscripciones</p>
        </div>
      ) : (
        <div className="bg-white border border-beige-lino rounded-wellness overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-beige-lino">
                {['Nombre', 'WhatsApp', 'Gmail', 'Generación', 'Pago', 'Fecha'].map(h => (
                  <th key={h} className="label-wellness text-left px-4 py-3">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtradas.map((insc, i) => (
                <tr key={insc.id}
                  className={`border-b border-beige-lino last:border-0 ${i % 2 === 0 ? 'bg-white' : 'bg-beige/30'}`}>
                  <td className="px-4 py-3 text-tierra">{insc.nombre_completo}</td>
                  <td className="px-4 py-3 text-tierra-mid">{insc.whatsapp}</td>
                  <td className="px-4 py-3 text-tierra-light text-xs">{insc.email_gmail}</td>
                  <td className="px-4 py-3 text-tierra-light text-xs">{insc.diplomados?.generacion ?? '—'}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-1 rounded-full ${
                      insc.estado_pago === 'completado' ? 'bg-sage-muted text-sage' :
                      insc.estado_pago === 'fallido' ? 'bg-red-50 text-red-400' :
                      'bg-beige text-tierra-light'
                    }`}>{insc.estado_pago}</span>
                  </td>
                  <td className="px-4 py-3 text-tierra-light text-xs">
                    {new Date(insc.created_at).toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' })}
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

/* ─── Main Page ──────────────────────────────────────── */
export default function AdminAyurvedaPage() {
  const [activeTab, setActiveTab] = useState<TabId>('diplomados');

  return (
    <div>
      <div className="mb-8">
        <div className="w-8 h-px bg-sand mb-4" />
        <h1 className="text-3xl text-tierra">AYURVEDA</h1>
        <p className="text-tierra-light text-sm mt-1">Gestión de programas y cursos</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-8 flex-wrap border-b border-beige-lino">
        {TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2.5 text-xs tracking-widest uppercase transition-colors -mb-px border-b-2 ${
              activeTab === tab.id
                ? 'border-tierra text-tierra font-medium'
                : 'border-transparent text-tierra-light hover:text-tierra'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {activeTab === 'diplomados' && <DiplomadosTab />}
      {activeTab === 'cocina' && <CursoTab tipo="cocina" label="Clases de Cocina" />}
      {activeTab === 'pranayamas' && <CursoTab tipo="pranayamas" label="Pranayamas" />}
      {activeTab === 'extras' && <CursoTab tipo="extras" label="Cursos Extras" />}
      {activeTab === 'inscripciones' && <InscripcionesTab />}
    </div>
  );
}
