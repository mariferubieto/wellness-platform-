'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';

type Tab = 'clases' | 'paquetes' | 'maestros';

interface Clase {
  id: string;
  nombre: string;
  inicio: string;
  fin: string;
  capacidad: number;
  cupo_actual: number;
  tipo: string;
  maestros?: { users: { nombre: string } } | null;
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

export default function AdminShalaPage() {
  const [tab, setTab] = useState<Tab>('clases');
  const [clases, setClases] = useState<Clase[]>([]);
  const [paquetes, setPaquetes] = useState<Paquete[]>([]);
  const [maestros, setMaestros] = useState<Maestro[]>([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState('');

  // Forms
  const [claseForm, setClaseForm] = useState({ nombre: '', inicio: '', fin: '', capacidad: '10', tipo: 'regular', maestro_id: '', descripcion: '' });
  const [paqueteForm, setPaqueteForm] = useState({ nombre: '', num_clases: '', precio: '', vigencia_dias: '30' });
  const [maestroForm, setMaestroForm] = useState({ nombre: '', bio: '', foto_url: '' });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    Promise.all([
      api.get<Clase[]>('/api/shala/clases'),
      api.get<Paquete[]>('/api/shala/paquetes'),
      api.get<Maestro[]>('/api/shala/maestros'),
    ]).then(([c, p, m]) => {
      setClases(c);
      setPaquetes(p);
      setMaestros(m);
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  function showMsg(m: string) {
    setMsg(m);
    setTimeout(() => setMsg(''), 3000);
  }

  async function crearClase(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const nueva = await api.post<Clase>('/api/shala/clases', {
        ...claseForm,
        capacidad: Number(claseForm.capacidad),
        maestro_id: claseForm.maestro_id || undefined,
      });
      setClases(prev => [nueva, ...prev]);
      setClaseForm({ nombre: '', inicio: '', fin: '', capacidad: '10', tipo: 'regular', maestro_id: '', descripcion: '' });
      showMsg('Clase creada');
    } catch (err: unknown) {
      showMsg(err instanceof Error ? err.message : 'Error');
    } finally { setSaving(false); }
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
      showMsg('Paquete creado');
    } catch (err: unknown) {
      showMsg(err instanceof Error ? err.message : 'Error');
    } finally { setSaving(false); }
  }

  async function crearMaestro(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const nuevo = await api.post<Maestro>('/api/shala/maestros', maestroForm);
      setMaestros(prev => [...prev, nuevo]);
      setMaestroForm({ nombre: '', bio: '', foto_url: '' });
      showMsg('Maestra/o creado');
    } catch (err: unknown) {
      showMsg(err instanceof Error ? err.message : 'Error');
    } finally { setSaving(false); }
  }

  const tabs: { key: Tab; label: string }[] = [
    { key: 'clases', label: 'Clases' },
    { key: 'paquetes', label: 'Paquetes' },
    { key: 'maestros', label: 'Maestras/os' },
  ];

  return (
    <div>
      <div className="mb-8">
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
          {/* CLASES */}
          {tab === 'clases' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div>
                <h2 className="text-lg text-tierra mb-4">Nueva clase</h2>
                <form onSubmit={crearClase} className="card-wellness space-y-4">
                  <Input label="Nombre de la clase" value={claseForm.nombre} onChange={e => setClaseForm(p => ({ ...p, nombre: e.target.value }))} required />
                  <Input label="Inicio" type="datetime-local" value={claseForm.inicio} onChange={e => setClaseForm(p => ({ ...p, inicio: e.target.value }))} required />
                  <Input label="Fin" type="datetime-local" value={claseForm.fin} onChange={e => setClaseForm(p => ({ ...p, fin: e.target.value }))} required />
                  <Input label="Capacidad" type="number" value={claseForm.capacidad} onChange={e => setClaseForm(p => ({ ...p, capacidad: e.target.value }))} required />
                  <div>
                    <label className="label-wellness">Tipo</label>
                    <select value={claseForm.tipo} onChange={e => setClaseForm(p => ({ ...p, tipo: e.target.value }))}
                      className="input-wellness w-full mt-1">
                      <option value="regular">Regular</option>
                      <option value="especial">Especial</option>
                    </select>
                  </div>
                  <div>
                    <label className="label-wellness">Maestra/o (opcional)</label>
                    <select value={claseForm.maestro_id} onChange={e => setClaseForm(p => ({ ...p, maestro_id: e.target.value }))}
                      className="input-wellness w-full mt-1">
                      <option value="">— Sin asignar —</option>
                      {maestros.map(m => <option key={m.id} value={m.id}>{m.nombre}</option>)}
                    </select>
                  </div>
                  <Button type="submit" loading={saving}>Crear clase</Button>
                </form>
              </div>
              <div>
                <h2 className="text-lg text-tierra mb-4">Clases programadas ({clases.length})</h2>
                {clases.length === 0 ? (
                  <div className="card-wellness text-center py-8"><p className="text-tierra-light text-sm">No hay clases</p></div>
                ) : (
                  <div className="space-y-3">
                    {clases.map(c => (
                      <div key={c.id} className="card-wellness py-3">
                        <p className="text-tierra font-medium">{c.nombre}</p>
                        <p className="text-tierra-light text-xs mt-1">
                          {new Date(c.inicio).toLocaleString('es-MX', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                        </p>
                        <p className="text-tierra-light text-xs">Cupo: {c.cupo_actual}/{c.capacidad} · {c.tipo}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* PAQUETES */}
          {tab === 'paquetes' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div>
                <h2 className="text-lg text-tierra mb-4">Nuevo paquete</h2>
                <form onSubmit={crearPaquete} className="card-wellness space-y-4">
                  <Input label="Nombre del paquete" value={paqueteForm.nombre} onChange={e => setPaqueteForm(p => ({ ...p, nombre: e.target.value }))} required placeholder="Ej: Paquete 10 clases" />
                  <Input label="Número de clases" type="number" value={paqueteForm.num_clases} onChange={e => setPaqueteForm(p => ({ ...p, num_clases: e.target.value }))} required />
                  <Input label="Precio (MXN)" type="number" value={paqueteForm.precio} onChange={e => setPaqueteForm(p => ({ ...p, precio: e.target.value }))} required />
                  <Input label="Vigencia (días)" type="number" value={paqueteForm.vigencia_dias} onChange={e => setPaqueteForm(p => ({ ...p, vigencia_dias: e.target.value }))} required />
                  <Button type="submit" loading={saving}>Crear paquete</Button>
                </form>
              </div>
              <div>
                <h2 className="text-lg text-tierra mb-4">Paquetes activos ({paquetes.length})</h2>
                {paquetes.length === 0 ? (
                  <div className="card-wellness text-center py-8"><p className="text-tierra-light text-sm">No hay paquetes</p></div>
                ) : (
                  <div className="space-y-3">
                    {paquetes.map(p => (
                      <div key={p.id} className="card-wellness py-3">
                        <p className="text-tierra font-medium">{p.nombre}</p>
                        <p className="text-tierra-light text-xs mt-1">{p.num_clases} clases · ${p.precio} MXN · {p.vigencia_dias} días</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* MAESTROS */}
          {tab === 'maestros' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div>
                <h2 className="text-lg text-tierra mb-4">Nueva maestra/o</h2>
                <form onSubmit={crearMaestro} className="card-wellness space-y-4">
                  <Input label="Nombre completo" value={maestroForm.nombre} onChange={e => setMaestroForm(p => ({ ...p, nombre: e.target.value }))} required />
                  <div>
                    <label className="label-wellness">Bio (opcional)</label>
                    <textarea value={maestroForm.bio} onChange={e => setMaestroForm(p => ({ ...p, bio: e.target.value }))}
                      className="input-wellness w-full mt-1 h-24 resize-none" placeholder="Descripción breve..." />
                  </div>
                  <Input label="URL de foto (opcional)" value={maestroForm.foto_url} onChange={e => setMaestroForm(p => ({ ...p, foto_url: e.target.value }))} placeholder="https://..." />
                  <Button type="submit" loading={saving}>Agregar maestra/o</Button>
                </form>
              </div>
              <div>
                <h2 className="text-lg text-tierra mb-4">Maestras/os ({maestros.length})</h2>
                {maestros.length === 0 ? (
                  <div className="card-wellness text-center py-8"><p className="text-tierra-light text-sm">No hay maestras/os</p></div>
                ) : (
                  <div className="space-y-3">
                    {maestros.map(m => (
                      <div key={m.id} className="card-wellness py-3 flex items-center gap-3">
                        {m.foto_url && <img src={m.foto_url} alt={m.nombre} className="w-10 h-10 rounded-full object-cover" />}
                        <div>
                          <p className="text-tierra font-medium">{m.nombre}</p>
                          {m.bio && <p className="text-tierra-light text-xs mt-0.5 line-clamp-1">{m.bio}</p>}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
