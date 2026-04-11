'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import ClaseCard from '@/components/shala/ClaseCard';

interface Clase {
  id: string;
  nombre: string;
  descripcion?: string;
  inicio: string;
  fin: string;
  capacidad: number;
  cupo_actual: number;
  tipo: 'regular' | 'especial';
  precio_especial?: number;
  espacio_tipo?: 'salon' | 'jardin';
  maestros?: { id: string; users: { nombre: string } } | null;
}

interface PaqueteUsuario { id: string; clases_restantes: number; expira_en: string; }
interface Reserva { id: string; estado: string; clases?: { id: string } | null; }

const DIAS_SEMANA_CORTO = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

function getMondayOfWeek(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  return d;
}

function getSemana(monday: Date): Date[] {
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return d;
  });
}

function toDateKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export default function CalendarioPage() {
  const [clases, setClases] = useState<Clase[]>([]);
  const [misPaquetes, setMisPaquetes] = useState<PaqueteUsuario[]>([]);
  const [misReservas, setMisReservas] = useState<Reserva[]>([]);
  const [loading, setLoading] = useState(true);
  const [reservando, setReservando] = useState<string | null>(null);
  const [cancelando, setCancelando] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [exito, setExito] = useState('');

  const [lunes, setLunes] = useState<Date>(() => getMondayOfWeek(new Date()));
  const [diaSeleccionado, setDiaSeleccionado] = useState<string>(() => toDateKey(new Date()));

  const semana = getSemana(lunes);
  const tieneCreditos = misPaquetes.some(p => p.clases_restantes > 0);
  const creditosTotal = misPaquetes.reduce((s, p) => s + p.clases_restantes, 0);

  async function loadData() {
    const [clasesData, paquetesData, reservasData] = await Promise.allSettled([
      api.get<Clase[]>('/api/shala/clases?tipo=regular'),
      api.get<PaqueteUsuario[]>('/api/shala/paquetes/mis-paquetes').catch(() => [] as PaqueteUsuario[]),
      api.get<Reserva[]>('/api/shala/reservas/mis-reservas').catch(() => [] as Reserva[]),
    ]);
    if (clasesData.status === 'fulfilled') setClases(clasesData.value);
    if (paquetesData.status === 'fulfilled') setMisPaquetes(paquetesData.value);
    if (reservasData.status === 'fulfilled') setMisReservas(reservasData.value);
  }

  useEffect(() => {
    loadData().finally(() => setLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function showMsg(ok: boolean, msg: string) {
    if (ok) { setExito(msg); setTimeout(() => setExito(''), 4000); }
    else { setError(msg); setTimeout(() => setError(''), 4000); }
  }

  async function handleReservar(claseId: string) {
    setReservando(claseId);
    try {
      await api.post('/api/shala/reservas', { clase_id: claseId });
      await loadData();
      const clase = clases.find(c => c.id === claseId);
      const hora = clase ? new Date(clase.inicio).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' }) : '';
      showMsg(true, `✓ Reserva confirmada${hora ? ' para las ' + hora : ''}`);
    } catch (err: unknown) {
      showMsg(false, err instanceof Error ? err.message : 'Error al reservar');
    } finally {
      setReservando(null);
    }
  }

  async function handleCancelar(reservaId: string) {
    setCancelando(reservaId);
    try {
      const result = await api.delete<{ credito_devuelto: boolean }>(`/api/shala/reservas/${reservaId}`);
      await loadData();
      showMsg(true, result.credito_devuelto ? '✓ Reserva cancelada — crédito devuelto' : '✓ Reserva cancelada');
    } catch (err: unknown) {
      showMsg(false, err instanceof Error ? err.message : 'Error al cancelar');
    } finally {
      setCancelando(null);
    }
  }

  const clasesByDate = clases.reduce<Record<string, Clase[]>>((acc, c) => {
    const key = toDateKey(new Date(c.inicio));
    if (!acc[key]) acc[key] = [];
    acc[key].push(c);
    return acc;
  }, {});

  // Map clase_id → reserva_id for quick lookup
  const reservasPorClase = new Map(
    misReservas
      .filter(r => r.estado === 'activa')
      .map(r => [r.clases?.id, r.id])
  );

  const clasesDelDia = (clasesByDate[diaSeleccionado] ?? []).sort(
    (a, b) => new Date(a.inicio).getTime() - new Date(b.inicio).getTime()
  );

  const semanaLabel = (() => {
    const fin = semana[6];
    const lunesLabel = lunes.toLocaleDateString('es-MX', { day: 'numeric', month: 'short' });
    const finLabel = fin.toLocaleDateString('es-MX', { day: 'numeric', month: 'short' });
    return `${lunesLabel} – ${finLabel}`;
  })();

  return (
    <div className="min-h-screen px-4 py-12">
      <div className="max-w-3xl mx-auto">

        <div className="mb-8">
          <div className="w-8 h-px bg-sand mb-4" />
          <h1 className="text-3xl text-tierra">Calendario de clases</h1>
          {tieneCreditos && (
            <p className="text-sage text-sm mt-2">{creditosTotal} crédito{creditosTotal !== 1 ? 's' : ''} disponible{creditosTotal !== 1 ? 's' : ''}</p>
          )}
        </div>

        {error && <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-600 text-sm rounded-wellness">{error}</div>}
        {exito && <div className="mb-6 p-4 bg-sage-muted border border-sage text-sage text-sm rounded-wellness">{exito}</div>}

        {loading ? (
          <p className="text-tierra-light text-sm tracking-widest uppercase">Cargando clases...</p>
        ) : (
          <>
            {/* Navegación semanal */}
            <div className="flex items-center justify-between mb-4">
              <button
                onClick={() => {
                  const prev = new Date(lunes);
                  prev.setDate(lunes.getDate() - 7);
                  setLunes(prev);
                }}
                className="text-tierra-light hover:text-tierra text-sm px-2"
              >← anterior</button>
              <span className="text-tierra-light text-xs tracking-widest uppercase">{semanaLabel}</span>
              <button
                onClick={() => {
                  const next = new Date(lunes);
                  next.setDate(lunes.getDate() + 7);
                  setLunes(next);
                }}
                className="text-tierra-light hover:text-tierra text-sm px-2"
              >siguiente →</button>
            </div>

            {/* Botones de días */}
            <div className="grid grid-cols-7 gap-1 mb-8">
              {semana.map((dia, idx) => {
                const key = toDateKey(dia);
                const count = (clasesByDate[key] ?? []).length;
                const esHoy = key === toDateKey(new Date());
                const seleccionado = key === diaSeleccionado;
                return (
                  <button
                    key={key}
                    onClick={() => setDiaSeleccionado(key)}
                    className={`flex flex-col items-center py-3 rounded-wellness border transition-colors ${
                      seleccionado
                        ? 'bg-tierra text-white border-tierra'
                        : 'bg-white border-beige-lino hover:border-tierra-light text-tierra-light'
                    }`}
                  >
                    <span className="text-[10px] tracking-wider uppercase">{DIAS_SEMANA_CORTO[idx]}</span>
                    <span className={`text-lg font-light mt-0.5 ${esHoy && !seleccionado ? 'text-sage' : ''}`}>
                      {dia.getDate()}
                    </span>
                    {count > 0 && (
                      <span className={`text-[10px] mt-1 ${seleccionado ? 'text-white/70' : 'text-tierra-light'}`}>
                        {count} clase{count !== 1 ? 's' : ''}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Clases del día seleccionado */}
            <div>
              <p className="label-wellness mb-4 capitalize">
                {new Date(diaSeleccionado + 'T12:00:00').toLocaleDateString('es-MX', {
                  weekday: 'long', day: 'numeric', month: 'long'
                })}
              </p>

              {clasesDelDia.length === 0 ? (
                <div className="card-wellness text-center py-10">
                  <p className="text-tierra-light text-sm">No hay clases programadas este día</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {clasesDelDia.map(clase => (
                    <ClaseCard
                      key={clase.id}
                      clase={clase}
                      onReservar={handleReservar}
                      onCancelar={handleCancelar}
                      reservando={reservando === clase.id}
                      cancelando={cancelando === reservasPorClase.get(clase.id)}
                      yaReservada={reservasPorClase.has(clase.id)}
                      tieneCreditos={tieneCreditos}
                      reservaId={reservasPorClase.get(clase.id)}
                    />
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
