'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import FotoUpload from '@/components/ui/FotoUpload';

type Tab = 'clases' | 'paquetes' | 'maestros' | 'estilos';

interface Clase {
  id: string;
  nombre: string;
  inicio: string;
  fin: string;
  capacidad: number;
  cupo_actual: number;
  tipo: string;
  maestros?: { users?: { nombre: string }; nombre?: string } | null;
}

interface Paquete {
  id: string;
  nombre: string;
  num_clases: number;
  precio: number;
  vigencia_dias: number;
}

interface Maestro {
  id: string;
  nombre: string;
  bio?: string;
  foto_url?: string;
}

interface Estilo {
  id: string;
  nombre: string;
  descripcion?: string;
}

const HORAS = Array.from({ length: 24 }, (_, i) => {
  const h = i.toString().padStart(2, '0');
  return [`${h}:00`, `${h}:30`];
}).flat();

const DURACIONES = [
  { label: '45 min', minutos: 45 },
  { label: '1 hora', minutos: 60 },
  { label: '1h 15min', minutos: 75 },
  { label: '1h 30min', minutos: 90 },
  { label: '2 horas', minutos: 120 },
];

function calcFin(fecha: string, hora: string, durMinutos: number): string {
  if (!fecha || !hora) return '';
  const inicio = new Date(`${fecha}T${hora}:00`);
  const fin = new Date(inicio.getTime() + durMinutos * 60000);
  return fin.toISOString().slice(0, 16);
}

export default function AdminShalaPage() {
  const [tab, setTab] = useState<Tab>('clases');
  const [clases, setClases] = useState<Clase[]>([]);
  const [paquetes, setPaquetes] = useState<Paquete[]>([]);
  const [maestros, setMaestros] = useState<Maestro[]>([]);
  const [estilos, setEstilos] = useState<Estilo[]>([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState('');
  const [saving, setSaving] = useState(false);

  // Clase form - simplified
  const [claseForm, setClaseForm] = useState({
    nombre: '', fecha: '', hora: '07:00', duracion: 60,
    capacidad: '10', tipo: 'regular', maestro_id: '', descripcion: '',
  });

  // Paquete form
  const [paqueteForm, setPaqueteForm] = useState({ nombre: '', num_clases: '', precio: '', vigencia_dias: '30' });

  // Maestro form
  const [maestroForm, setMaestroForm] = useState({ nombre: '', bio: '', foto_url: '' });

  // Estilo form
  const [estiloForm, setEstiloForm] = useState({ nombre: '', descripcion: '' });

  useEffect(() => {
    Promise.all([
      api.get<Clase[]>('/api/shala/clases'),
      api.get<Paquete[]>('/api/shala/paquetes'),
      api.get<Maestro[]>('/api/shala/maestros'),
      api.get<Estilo[]>('/api/shala/estilos'),
    ]).then(([c, p, m, e]) => {
      setClases(c); setPaquetes(p); setMaestros(m); setEstilos(e);
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  function showMsg(m: string) { setMsg(m); setTimeout(() => setMsg(''), 3000); }

  async function crearClase(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const inicio = `${claseForm.fecha}T${claseForm.hora}:00`;
      const finDt = new Date(new Date(inicio).getTime() + claseForm.duracion * 60000);
      const nueva = await api.post<Clase>('/api/shala/clases', {
        nombre: claseForm.nombre,
        inicio,
        fin: finDt.toISOString(),
        capacidad: Number(claseForm.capacidad),
        tipo: claseForm.tipo,
        maestro_id: claseForm.maestro_id || undefined,
        descripcion: claseForm.descripcion || undefined,
      });
      setClases(prev => [nueva, ...prev]);
      setClaseForm({ nombre: '', fecha: '', hora: '07:00', duracion: 60, capacidad: '10', tipo: 'regular', maestro_id: '', descripcion: '' });
      showMsg('✓ Clase agregada');
    } catch (err: unknown) { showMsg(err instanceof Error ? err.message : 'Error'); }
    finally { setSaving(false); }
  }

  async function crearPaquete(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const nuevo = await api.post<Paquete>('/api/shala/paquetes', {
        nombre: paqueteForm.nombre,
        num_clases: Number(paqueteForm.num_clases),
        precio: Number(paqueteForm.precio),
        vigencia_dias: Number(paqueteForm.vigencia_dias),
      });
      setPaquetes(prev => [...prev, nuevo]);
      setPaqueteForm({ nombre: '', num_clases: '', precio: '', vigencia_dias: '30' });
      showMsg('✓ Paquete creado');
    } catch (err: unknown) { showMsg(err instanceof Error ? err.message : 'Error'); }
    finally { setSaving(false); }
  }

  async function crearMaestro(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const nuevo = await api.post<Maestro>('/api/shala/maestros', maestroForm);
      setMaestros(prev => [...prev, nuevo]);
      setMaestroForm({ nombre: '', bio: '', foto_url: '' });
      showMsg('✓ Maestra/o agregada');
    } catch (err: unknown) { showMsg(err instanceof Error ? err.message : 'Error'); }
    finally { setSaving(false); }
  }

  async function crearEstilo(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const nuevo = await api.post<Estilo>('/api/shala/estilos', estiloForm);
      setEstilos(prev => [...prev, nuevo]);
      setEstiloForm({ nombre: '', descripcion: '' });
      showMsg('✓ Estilo creado');
    } catch (err: unknown) { showMsg(err instanceof Error ? err.message : 'Error'); }
    finally { setSaving(false); }
  }

  async function eliminarEstilo(id: string) {
    try {
      await api.delete(`/api/shala/estilos/${id}`);
      setEstilos(prev => prev.filter(e => e.id !== id));
    } catch { showMsg('Error al eliminar'); }
  }

  const tabs: { key: Tab; label: string }[] = [
    { key: 'clases', label: 'Clases' },
    { key: 'paquetes', label: 'Paquetes' },
    { key: 'maestros', label: 'Maestras/os' },
    { key: 'estilos', label: 'Estilos' },
  ];

  const finPreview = calcFin(claseForm.fecha, claseForm.hora, claseForm.duracion);

  return (
    <div>
      <div className="mb-6">
        <div className="w-8 h-px bg-sand mb-4" />
        <h1 className="text-3xl text-tierra">SHALA</h1>
      </div>

      {msg && <div className="mb-4 p-3 bg-sage-muted border border-sage text-sage text-sm rounded-wellness">{msg}</div>}

      <div className="flex gap-6 mb-8 border-b border-beige-lino">
        {tabs.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`pb-3 text-xs tracking-widest uppercase transition-colors ${tab === t.key ? 'text-tierra border-b-2 border-sand' : 'text-tierra-light'}`}>
            {t.label}
          </button>
        ))}
      </div>

      {loading ? <p className="text-tierra-light text-sm tracking-widest uppercase">Cargando...</p> : (
        <>
          {/* ── CLASES ── */}
          {tab === 'clases' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div>
                <h2 className="text-lg text-tierra mb-4">Nueva clase</h2>
                <form onSubmit={crearClase} className="card-wellness space-y-4">

                  {/* Nombre / Estilo */}
                  <div>
                    <label className="label-wellness">Nombre o estilo</label>
                    <input
                      list="estilos-list"
                      value={claseForm.nombre}
                      onChange={e => setClaseForm(p => ({ ...p, nombre: e.target.value }))}
                      className="input-wellness w-full mt-1"
                      placeholder="Ej: Hatha Yoga, Vinyasa..."
                      required
                    />
                    <datalist id="estilos-list">
                      {estilos.map(e => <option key={e.id} value={e.nombre} />)}
                    </datalist>
                  </div>

                  {/* Fecha */}
                  <Input label="Fecha" type="date" value={claseForm.fecha}
                    onChange={e => setClaseForm(p => ({ ...p, fecha: e.target.value }))} required />

                  {/* Hora inicio */}
                  <div>
                    <label className="label-wellness">Hora de inicio</label>
                    <select value={claseForm.hora} onChange={e => setClaseForm(p => ({ ...p, hora: e.target.value }))}
                      className="input-wellness w-full mt-1">
                      {HORAS.map(h => <option key={h} value={h}>{h}</option>)}
                    </select>
                  </div>

                  {/* Duración */}
                  <div>
                    <label className="label-wellness">Duración</label>
                    <div className="flex flex-wrap gap-2 mt-1">
                      {DURACIONES.map(d => (
                        <button key={d.minutos} type="button"
                          onClick={() => setClaseForm(p => ({ ...p, duracion: d.minutos }))}
                          className={`px-3 py-1.5 text-xs rounded-full border transition-colors ${
                            claseForm.duracion === d.minutos
                              ? 'bg-tierra text-white border-tierra'
                              : 'bg-white text-tierra-light border-beige-lino hover:border-tierra-light'
                          }`}>
                          {d.label}
                        </button>
                      ))}
                    </div>
                    {finPreview && (
                      <p className="text-tierra-light text-xs mt-1">
                        Termina a las {new Date(finPreview).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    )}
                  </div>

                  {/* Capacidad */}
                  <Input label="Cupo máximo" type="number" value={claseForm.capacidad}
                    onChange={e => setClaseForm(p => ({ ...p, capacidad: e.target.value }))} required />

                  {/* Tipo */}
                  <div>
                    <label className="label-wellness">Tipo</label>
                    <div className="flex gap-2 mt-1">
                      {['regular', 'especial'].map(t => (
                        <button key={t} type="button"
                          onClick={() => setClaseForm(p => ({ ...p, tipo: t }))}
                          className={`px-4 py-1.5 text-xs rounded-full border transition-colors ${
                            claseForm.tipo === t ? 'bg-tierra text-white border-tierra' : 'bg-white text-tierra-light border-beige-lino'
                          }`}>
                          {t === 'regular' ? 'Regular' : 'Especial'}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Maestra */}
                  <div>
                    <label className="label-wellness">Maestra/o</label>
                    <select value={claseForm.maestro_id} onChange={e => setClaseForm(p => ({ ...p, maestro_id: e.target.value }))}
                      className="input-wellness w-full mt-1">
                      <option value="">— Sin asignar —</option>
                      {maestros.map(m => <option key={m.id} value={m.id}>{m.nombre}</option>)}
                    </select>
                  </div>

                  <Button type="submit" loading={saving}>Agregar clase</Button>
                </form>
              </div>

              {/* Lista clases */}
              <div>
                <h2 className="text-lg text-tierra mb-4">Próximas clases ({clases.length})</h2>
                {clases.length === 0 ? (
                  <div className="card-wellness text-center py-10"><p className="text-tierra-light text-sm">No hay clases programadas</p></div>
                ) : (
                  <div className="space-y-2">
                    {clases.map(c => {
                      const inicio = new Date(c.inicio);
                      return (
                        <div key={c.id} className="card-wellness py-3 flex justify-between items-start">
                          <div>
                            <p className="text-tierra font-medium text-sm">{c.nombre}</p>
                            <p className="text-tierra-light text-xs mt-0.5">
                              {inicio.toLocaleDateString('es-MX', { weekday: 'short', day: 'numeric', month: 'short' })} · {inicio.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}
                            </p>
                            {c.maestros && (
                              <p className="text-tierra-light text-xs">{c.maestros.nombre ?? c.maestros.users?.nombre}</p>
                            )}
                          </div>
                          <span className={`text-xs px-2 py-1 rounded-full shrink-0 ${c.cupo_actual >= c.capacidad ? 'bg-red-50 text-red-400' : 'bg-sage-muted text-sage'}`}>
                            {c.cupo_actual}/{c.capacidad}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ── PAQUETES ── */}
          {tab === 'paquetes' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div>
                <h2 className="text-lg text-tierra mb-4">Nuevo paquete</h2>
                <form onSubmit={crearPaquete} className="card-wellness space-y-4">
                  <Input label="Nombre" value={paqueteForm.nombre} onChange={e => setPaqueteForm(p => ({ ...p, nombre: e.target.value }))} required placeholder="Ej: Paquete 10 clases" />
                  <Input label="Número de clases" type="number" value={paqueteForm.num_clases} onChange={e => setPaqueteForm(p => ({ ...p, num_clases: e.target.value }))} required />
                  <Input label="Precio (MXN)" type="number" value={paqueteForm.precio} onChange={e => setPaqueteForm(p => ({ ...p, precio: e.target.value }))} required />
                  <Input label="Vigencia (días)" type="number" value={paqueteForm.vigencia_dias} onChange={e => setPaqueteForm(p => ({ ...p, vigencia_dias: e.target.value }))} required />
                  <Button type="submit" loading={saving}>Crear paquete</Button>
                </form>
              </div>
              <div>
                <h2 className="text-lg text-tierra mb-4">Paquetes ({paquetes.length})</h2>
                <div className="space-y-3">
                  {paquetes.map(p => (
                    <div key={p.id} className="card-wellness py-3">
                      <p className="text-tierra font-medium">{p.nombre}</p>
                      <p className="text-tierra-light text-xs mt-1">{p.num_clases} clases · <span className="text-sage">${p.precio} MXN</span> · {p.vigencia_dias} días</p>
                    </div>
                  ))}
                  {paquetes.length === 0 && <div className="card-wellness text-center py-8"><p className="text-tierra-light text-sm">No hay paquetes</p></div>}
                </div>
              </div>
            </div>
          )}

          {/* ── MAESTROS ── */}
          {tab === 'maestros' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div>
                <h2 className="text-lg text-tierra mb-4">Nueva maestra/o</h2>
                <form onSubmit={crearMaestro} className="card-wellness space-y-4">
                  <Input label="Nombre completo" value={maestroForm.nombre} onChange={e => setMaestroForm(p => ({ ...p, nombre: e.target.value }))} required />
                  <div>
                    <label className="label-wellness">Bio</label>
                    <textarea value={maestroForm.bio} onChange={e => setMaestroForm(p => ({ ...p, bio: e.target.value }))}
                      className="input-wellness w-full mt-1 h-24 resize-none" placeholder="Descripción breve..." />
                  </div>
                  <FotoUpload value={maestroForm.foto_url} onChange={url => setMaestroForm(p => ({ ...p, foto_url: url }))} folder="maestros" />
                  <Button type="submit" loading={saving}>Agregar maestra/o</Button>
                </form>
              </div>
              <div>
                <h2 className="text-lg text-tierra mb-4">Maestras/os ({maestros.length})</h2>
                <div className="space-y-3">
                  {maestros.map(m => (
                    <div key={m.id} className="card-wellness py-3 flex items-center gap-4">
                      {m.foto_url
                        ? <img src={m.foto_url} alt={m.nombre} className="w-12 h-12 rounded-full object-cover shrink-0 border border-beige-lino" />
                        : <div className="w-12 h-12 rounded-full bg-beige-lino flex items-center justify-center shrink-0 text-tierra-light text-lg">{m.nombre[0]}</div>
                      }
                      <div>
                        <p className="text-tierra font-medium">{m.nombre}</p>
                        {m.bio && <p className="text-tierra-light text-xs mt-0.5 line-clamp-2">{m.bio}</p>}
                      </div>
                    </div>
                  ))}
                  {maestros.length === 0 && <div className="card-wellness text-center py-8"><p className="text-tierra-light text-sm">No hay maestras/os</p></div>}
                </div>
              </div>
            </div>
          )}

          {/* ── ESTILOS ── */}
          {tab === 'estilos' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div>
                <h2 className="text-lg text-tierra mb-4">Nuevo estilo</h2>
                <form onSubmit={crearEstilo} className="card-wellness space-y-4">
                  <Input label="Nombre del estilo" value={estiloForm.nombre} onChange={e => setEstiloForm(p => ({ ...p, nombre: e.target.value }))} required placeholder="Ej: Hatha, Vinyasa, Yin..." />
                  <div>
                    <label className="label-wellness">Descripción</label>
                    <textarea value={estiloForm.descripcion} onChange={e => setEstiloForm(p => ({ ...p, descripcion: e.target.value }))}
                      className="input-wellness w-full mt-1 h-28 resize-none"
                      placeholder="Describe cómo es este estilo, a quién va dirigido, beneficios..." />
                  </div>
                  <Button type="submit" loading={saving}>Agregar estilo</Button>
                </form>
              </div>
              <div>
                <h2 className="text-lg text-tierra mb-4">Catálogo ({estilos.length})</h2>
                <div className="space-y-3">
                  {estilos.map(e => (
                    <div key={e.id} className="card-wellness py-3 flex justify-between items-start gap-3">
                      <div>
                        <p className="text-tierra font-medium">{e.nombre}</p>
                        {e.descripcion && <p className="text-tierra-light text-xs mt-1 leading-relaxed">{e.descripcion}</p>}
                      </div>
                      <button onClick={() => eliminarEstilo(e.id)} className="text-tierra-light text-xs hover:text-red-400 transition-colors shrink-0">✕</button>
                    </div>
                  ))}
                  {estilos.length === 0 && <div className="card-wellness text-center py-8"><p className="text-tierra-light text-sm">Agrega los estilos de yoga que ofreces</p></div>}
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
