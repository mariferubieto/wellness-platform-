'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';

interface Maestro { id: string; nombre: string; }
interface Estilo { id: string; nombre: string; }

interface ClasePlantilla {
  hora_inicio: string; // "HH:MM"
  hora_fin: string;    // "HH:MM"
  nombre: string;
  espacio_tipo: 'salon' | 'jardin';
  capacidad: number;
  maestro_id?: string;
  tipo: 'regular' | 'especial';
}

interface ClaseBorrador extends ClasePlantilla {
  fecha: string; // "YYYY-MM-DD"
  _key: string;  // unique key for React rendering
}

// 0=Lun, 1=Mar, ..., 6=Dom (Monday-first)
type SemanaBase = Record<number, ClasePlantilla[]>;

const DIAS_SEMANA = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
const HORAS = Array.from({ length: 24 }, (_, i) => {
  const h = i.toString().padStart(2, '0');
  return [`${h}:00`, `${h}:30`];
}).flat();

const DEFAULT_PLANTILLA: ClasePlantilla = {
  hora_inicio: '07:00',
  hora_fin: '08:00',
  nombre: '',
  espacio_tipo: 'salon',
  capacidad: 10,
  tipo: 'regular',
};

function getDiasDelMes(year: number, month: number): string[] {
  const dias: string[] = [];
  const d = new Date(year, month, 1);
  while (d.getMonth() === month) {
    dias.push(d.toISOString().slice(0, 10));
    d.setDate(d.getDate() + 1);
  }
  return dias;
}

// Returns Monday-first week grids: string[][] where each inner array is Mon-Sun
function getCalendarioGrid(year: number, month: number): (string | null)[][] {
  const dias: (string | null)[] = [];
  const primer = new Date(year, month, 1);
  // Monday-first offset (0=Mon...6=Sun)
  const offset = (primer.getDay() + 6) % 7;
  for (let i = 0; i < offset; i++) dias.push(null);
  const ultimo = new Date(year, month + 1, 0).getDate();
  for (let d = 1; d <= ultimo; d++) {
    dias.push(`${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`);
  }
  while (dias.length % 7 !== 0) dias.push(null);
  const semanas: (string | null)[][] = [];
  for (let i = 0; i < dias.length; i += 7) semanas.push(dias.slice(i, i + 7));
  return semanas;
}

function diaToWeekday(fecha: string): number {
  // Returns 0=Lun ... 6=Dom
  const d = new Date(fecha + 'T12:00:00');
  return (d.getDay() + 6) % 7;
}

function uniqueKey() {
  return Math.random().toString(36).slice(2);
}

export default function PlanificadorPage() {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth());
  const [semanaBase, setSemanaBase] = useState<SemanaBase>({ 0: [], 1: [], 2: [], 3: [], 4: [], 5: [], 6: [] });
  const [borradores, setBorradores] = useState<ClaseBorrador[]>([]);
  const [copiando, setCopiando] = useState<ClasePlantilla | null>(null);
  const [editando, setEditando] = useState<{ borrador: ClaseBorrador; index: number } | null>(null);
  const [maestros, setMaestros] = useState<Maestro[]>([]);
  const [estilos, setEstilos] = useState<Estilo[]>([]);
  const [guardando, setGuardando] = useState(false);
  const [msg, setMsg] = useState('');

  useEffect(() => {
    Promise.all([
      api.get<Maestro[]>('/api/shala/maestros'),
      api.get<Estilo[]>('/api/shala/estilos'),
    ]).then(([m, e]) => { setMaestros(m); setEstilos(e); }).catch(() => {});
  }, []);

  function showMsg(m: string) { setMsg(m); setTimeout(() => setMsg(''), 4000); }

  function addPlantillaAlDia(dia: number) {
    setSemanaBase(prev => ({
      ...prev,
      [dia]: [...(prev[dia] ?? []), { ...DEFAULT_PLANTILLA }],
    }));
  }

  function updatePlantilla(dia: number, idx: number, field: keyof ClasePlantilla, value: string | number) {
    setSemanaBase(prev => {
      const updated = [...(prev[dia] ?? [])];
      updated[idx] = { ...updated[idx], [field]: value };
      if (field === 'espacio_tipo') {
        updated[idx].capacidad = value === 'salon' ? 10 : 70;
      }
      return { ...prev, [dia]: updated };
    });
  }

  function removePlantilla(dia: number, idx: number) {
    setSemanaBase(prev => ({
      ...prev,
      [dia]: prev[dia].filter((_, i) => i !== idx),
    }));
  }

  function aplicarAlMes() {
    const diasDelMes = getDiasDelMes(year, month);
    const nuevas: ClaseBorrador[] = [];
    for (const fecha of diasDelMes) {
      const diaSemana = diaToWeekday(fecha);
      const plantillas = semanaBase[diaSemana] ?? [];
      for (const p of plantillas) {
        nuevas.push({ ...p, fecha, _key: uniqueKey() });
      }
    }
    setBorradores(nuevas);
    showMsg(`${nuevas.length} clases generadas — revisa y guarda`);
  }

  function addClaseDia(fecha: string) {
    const nuevaBorrador: ClaseBorrador = {
      ...DEFAULT_PLANTILLA,
      fecha,
      _key: uniqueKey(),
    };
    setBorradores(prev => {
      const updated = [...prev, nuevaBorrador];
      setEditando({ borrador: nuevaBorrador, index: updated.length - 1 });
      return updated;
    });
  }

  function copiarClase(b: ClaseBorrador) {
    const { fecha: _f, _key: _k, ...plantilla } = b;
    setCopiando(plantilla);
    showMsg('Clase copiada — haz clic en un día para pegar');
  }

  function pegarEnDia(fecha: string) {
    if (!copiando) return;
    const nuevo: ClaseBorrador = { ...copiando, fecha, _key: uniqueKey() };
    setBorradores(prev => {
      const updated = [...prev, nuevo];
      setEditando({ borrador: nuevo, index: updated.length - 1 });
      return updated;
    });
    setCopiando(null);
  }

  function eliminarBorrador(key: string) {
    setBorradores(prev => prev.filter(b => b._key !== key));
  }

  function guardarEdicion(updated: ClaseBorrador) {
    setBorradores(prev => prev.map(b => b._key === updated._key ? updated : b));
    setEditando(null);
  }

  async function guardarMes() {
    if (borradores.length === 0) { showMsg('No hay clases en el borrador'); return; }
    setGuardando(true);
    try {
      const payload = borradores.map(b => ({
        nombre: b.nombre,
        inicio: `${b.fecha}T${b.hora_inicio}:00`,
        fin: `${b.fecha}T${b.hora_fin}:00`,
        capacidad: b.capacidad,
        espacio_tipo: b.espacio_tipo,
        maestro_id: b.maestro_id || undefined,
        tipo: b.tipo,
      }));
      const result = await api.post<{ created: number }>('/api/shala/clases/batch', { clases: payload });
      showMsg(`✓ ${result.created} clases guardadas exitosamente`);
      setBorradores([]);
    } catch (err: unknown) {
      showMsg(err instanceof Error ? err.message : 'Error al guardar');
    } finally {
      setGuardando(false);
    }
  }

  const MESES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
  const grid = getCalendarioGrid(year, month);
  const borradoresPorFecha: Record<string, ClaseBorrador[]> = {};
  for (const b of borradores) {
    if (!borradoresPorFecha[b.fecha]) borradoresPorFecha[b.fecha] = [];
    borradoresPorFecha[b.fecha].push(b);
  }

  return (
    <div>
      <div className="mb-6">
        <div className="w-8 h-px bg-sand mb-4" />
        <h1 className="text-3xl text-tierra">Planificador de Clases</h1>
      </div>

      {msg && (
        <div className="mb-4 p-3 bg-sage-muted border border-sage text-sage text-sm rounded-wellness">{msg}</div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-[320px_1fr] gap-8">

        {/* ── Panel Semana Tipo ── */}
        <div>
          <div className="card-wellness">
            <h2 className="text-sm tracking-widest uppercase text-tierra mb-4">Semana tipo</h2>
            <p className="text-tierra-light text-xs mb-4">Define las clases que se repiten cada semana. Luego aplica al mes.</p>

            {DIAS_SEMANA.map((dia, idx) => (
              <div key={idx} className="mb-4">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs tracking-widest uppercase text-tierra-light">{dia}</span>
                  <button
                    onClick={() => addPlantillaAlDia(idx)}
                    className="text-xs text-sage hover:text-tierra transition-colors"
                  >+ clase</button>
                </div>
                {(semanaBase[idx] ?? []).map((p, pidx) => (
                  <div key={pidx} className="bg-white border border-beige-lino rounded-wellness p-3 mb-2 space-y-2">
                    <div className="flex gap-2">
                      <select
                        value={p.hora_inicio}
                        onChange={e => updatePlantilla(idx, pidx, 'hora_inicio', e.target.value)}
                        className="input-wellness text-xs flex-1"
                      >
                        {HORAS.map(h => <option key={h} value={h}>{h}</option>)}
                      </select>
                      <span className="text-tierra-light text-xs self-center">–</span>
                      <select
                        value={p.hora_fin}
                        onChange={e => updatePlantilla(idx, pidx, 'hora_fin', e.target.value)}
                        className="input-wellness text-xs flex-1"
                      >
                        {HORAS.map(h => <option key={h} value={h}>{h}</option>)}
                      </select>
                    </div>
                    <input
                      list={`estilos-list-${idx}-${pidx}`}
                      value={p.nombre}
                      onChange={e => updatePlantilla(idx, pidx, 'nombre', e.target.value)}
                      className="input-wellness text-xs w-full"
                      placeholder="Nombre / estilo..."
                    />
                    <datalist id={`estilos-list-${idx}-${pidx}`}>
                      {estilos.map(e => <option key={e.id} value={e.nombre} />)}
                    </datalist>
                    <div className="flex gap-2">
                      <select
                        value={p.espacio_tipo}
                        onChange={e => updatePlantilla(idx, pidx, 'espacio_tipo', e.target.value)}
                        className="input-wellness text-xs flex-1"
                      >
                        <option value="salon">Salón (10)</option>
                        <option value="jardin">Jardín (70)</option>
                      </select>
                      <select
                        value={p.maestro_id ?? ''}
                        onChange={e => updatePlantilla(idx, pidx, 'maestro_id', e.target.value)}
                        className="input-wellness text-xs flex-1"
                      >
                        <option value="">— Maestra/o —</option>
                        {maestros.map(m => <option key={m.id} value={m.id}>{m.nombre}</option>)}
                      </select>
                    </div>
                    <button
                      onClick={() => removePlantilla(idx, pidx)}
                      className="text-tierra-light text-xs hover:text-red-400"
                    >✕ eliminar</button>
                  </div>
                ))}
                {(semanaBase[idx] ?? []).length === 0 && (
                  <p className="text-tierra-light/50 text-xs italic">Sin clases</p>
                )}
              </div>
            ))}

            <div className="mt-4 pt-4 border-t border-beige-lino">
              <button onClick={aplicarAlMes} className="btn-secondary w-full">
                Aplicar al mes →
              </button>
            </div>
          </div>
        </div>

        {/* ── Calendario Mensual ── */}
        <div>
          {/* Navegación mes */}
          <div className="flex items-center justify-between mb-4">
            <button
              onClick={() => { if (month === 0) { setMonth(11); setYear(y => y - 1); } else setMonth(m => m - 1); }}
              className="text-tierra-light hover:text-tierra text-sm px-2"
            >← anterior</button>
            <h2 className="text-lg text-tierra">{MESES[month]} {year}</h2>
            <button
              onClick={() => { if (month === 11) { setMonth(0); setYear(y => y + 1); } else setMonth(m => m + 1); }}
              className="text-tierra-light hover:text-tierra text-sm px-2"
            >siguiente →</button>
          </div>

          {/* Header días de semana */}
          <div className="grid grid-cols-7 mb-2">
            {DIAS_SEMANA.map(d => (
              <div key={d} className="text-center text-xs tracking-widest uppercase text-tierra-light pb-1">{d}</div>
            ))}
          </div>

          {/* Grid */}
          <div className="space-y-1">
            {grid.map((semana, si) => (
              <div key={si} className="grid grid-cols-7 gap-1">
                {semana.map((fecha, di) => {
                  if (!fecha) return <div key={di} className="min-h-[80px]" />;
                  const clasesDelDia = borradoresPorFecha[fecha] ?? [];
                  const diaNum = parseInt(fecha.slice(8, 10));
                  const esModoCopiado = !!copiando;

                  return (
                    <div
                      key={fecha}
                      className={`min-h-[80px] bg-white border rounded-wellness p-1 ${esModoCopiado ? 'border-sage cursor-pointer hover:bg-sage-muted' : 'border-beige-lino'}`}
                      onClick={esModoCopiado ? () => pegarEnDia(fecha) : undefined}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs text-tierra-light">{diaNum}</span>
                        {!esModoCopiado && (
                          <button
                            onClick={e => { e.stopPropagation(); addClaseDia(fecha); }}
                            className="text-tierra-light/50 hover:text-sage text-xs leading-none"
                          >+</button>
                        )}
                        {esModoCopiado && (
                          <span className="text-sage text-xs">pegar</span>
                        )}
                      </div>
                      <div className="space-y-0.5">
                        {clasesDelDia.map(b => (
                          <div
                            key={b._key}
                            className={`rounded px-1 py-0.5 text-[10px] flex items-center justify-between gap-0.5 ${b.espacio_tipo === 'jardin' ? 'bg-sage-muted text-sage' : 'bg-sand/20 text-tierra-mid'}`}
                          >
                            <span className="truncate flex-1">{b.hora_inicio} {b.nombre || '—'}</span>
                            <button
                              onClick={e => {
                                e.stopPropagation();
                                const idx = borradores.findIndex(x => x._key === b._key);
                                setEditando({ borrador: b, index: idx });
                              }}
                              className="hover:opacity-70 shrink-0"
                              title="Editar"
                            >✎</button>
                            <button
                              onClick={e => { e.stopPropagation(); copiarClase(b); }}
                              className="hover:opacity-70 shrink-0"
                              title="Copiar"
                            >⧉</button>
                            <button
                              onClick={e => { e.stopPropagation(); eliminarBorrador(b._key); }}
                              className="hover:opacity-70 shrink-0"
                              title="Eliminar"
                            >✕</button>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            ))}
          </div>

          {/* Footer */}
          <div className="mt-6 flex items-center justify-between">
            <div className="flex gap-4 text-xs text-tierra-light">
              <span className="flex items-center gap-1">
                <span className="w-3 h-3 rounded bg-sand/30 inline-block" /> Salón (10p)
              </span>
              <span className="flex items-center gap-1">
                <span className="w-3 h-3 rounded bg-sage-muted inline-block" /> Jardín (70p)
              </span>
              {copiando && (
                <span className="text-sage">
                  Modo copia — haz clic en un día para pegar ·{' '}
                  <button onClick={() => setCopiando(null)} className="underline">cancelar</button>
                </span>
              )}
            </div>
            <button
              onClick={guardarMes}
              disabled={guardando || borradores.length === 0}
              className="btn-primary disabled:opacity-50"
            >
              {guardando ? 'Guardando...' : `Guardar mes (${borradores.length} clases)`}
            </button>
          </div>
        </div>
      </div>

      {/* ── Modal Editar Clase ── */}
      {editando && (
        <div className="fixed inset-0 bg-tierra/20 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-wellness shadow-lg p-6 w-full max-w-md space-y-4">
            <h3 className="text-tierra text-lg">Editar clase · {editando.borrador.fecha}</h3>

            <div>
              <label className="label-wellness">Nombre / Estilo</label>
              <input
                list="edit-estilos"
                value={editando.borrador.nombre}
                onChange={e => setEditando(prev => prev && ({ ...prev, borrador: { ...prev.borrador, nombre: e.target.value } }))}
                className="input-wellness w-full mt-1"
                placeholder="Hatha Yoga, Vinyasa..."
              />
              <datalist id="edit-estilos">
                {estilos.map(e => <option key={e.id} value={e.nombre} />)}
              </datalist>
            </div>

            <div className="flex gap-3">
              <div className="flex-1">
                <label className="label-wellness">Inicio</label>
                <select
                  value={editando.borrador.hora_inicio}
                  onChange={e => setEditando(prev => prev && ({ ...prev, borrador: { ...prev.borrador, hora_inicio: e.target.value } }))}
                  className="input-wellness w-full mt-1"
                >
                  {HORAS.map(h => <option key={h} value={h}>{h}</option>)}
                </select>
              </div>
              <div className="flex-1">
                <label className="label-wellness">Fin</label>
                <select
                  value={editando.borrador.hora_fin}
                  onChange={e => setEditando(prev => prev && ({ ...prev, borrador: { ...prev.borrador, hora_fin: e.target.value } }))}
                  className="input-wellness w-full mt-1"
                >
                  {HORAS.map(h => <option key={h} value={h}>{h}</option>)}
                </select>
              </div>
            </div>

            <div>
              <label className="label-wellness">Espacio</label>
              <select
                value={editando.borrador.espacio_tipo}
                onChange={e => {
                  const esp = e.target.value as 'salon' | 'jardin';
                  setEditando(prev => prev && ({
                    ...prev,
                    borrador: { ...prev.borrador, espacio_tipo: esp, capacidad: esp === 'salon' ? 10 : 70 },
                  }));
                }}
                className="input-wellness w-full mt-1"
              >
                <option value="salon">Salón (10 personas)</option>
                <option value="jardin">Jardín (70 personas)</option>
              </select>
            </div>

            <div>
              <label className="label-wellness">Capacidad (editable)</label>
              <input
                type="number"
                value={editando.borrador.capacidad}
                onChange={e => setEditando(prev => prev && ({ ...prev, borrador: { ...prev.borrador, capacidad: Number(e.target.value) } }))}
                className="input-wellness w-full mt-1"
              />
            </div>

            <div>
              <label className="label-wellness">Maestra/o</label>
              <select
                value={editando.borrador.maestro_id ?? ''}
                onChange={e => setEditando(prev => prev && ({ ...prev, borrador: { ...prev.borrador, maestro_id: e.target.value || undefined } }))}
                className="input-wellness w-full mt-1"
              >
                <option value="">— Sin asignar —</option>
                {maestros.map(m => <option key={m.id} value={m.id}>{m.nombre}</option>)}
              </select>
            </div>

            <div className="flex gap-3 pt-2">
              <button onClick={() => guardarEdicion(editando.borrador)} className="btn-primary flex-1">
                Guardar
              </button>
              <button onClick={() => setEditando(null)} className="btn-secondary flex-1">
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
