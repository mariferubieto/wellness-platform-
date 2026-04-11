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
  maestros?: { id: string; users: { nombre: string } } | null;
}

interface PaqueteUsuario {
  id: string;
  clases_restantes: number;
  expira_en: string;
}

interface Reserva {
  id: string;
  estado: string;
  clases: { id: string };
}

export default function CalendarioPage() {
  const [clases, setClases] = useState<Clase[]>([]);
  const [misPaquetes, setMisPaquetes] = useState<PaqueteUsuario[]>([]);
  const [misReservas, setMisReservas] = useState<Reserva[]>([]);
  const [loading, setLoading] = useState(true);
  const [reservando, setReservando] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [exito, setExito] = useState('');

  const tieneCreditos = misPaquetes.some(p => p.clases_restantes > 0);

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

  async function handleReservar(claseId: string) {
    setReservando(claseId);
    setError('');
    setExito('');
    try {
      await api.post('/api/shala/reservas', { clase_id: claseId });
      setExito('¡Clase reservada exitosamente!');
      await loadData();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error al reservar');
    } finally {
      setReservando(null);
    }
  }

  const clasesByDate = clases.reduce<Record<string, Clase[]>>((acc, clase) => {
    const fecha = new Date(clase.inicio).toLocaleDateString('es-MX', {
      weekday: 'long', day: 'numeric', month: 'long',
    });
    if (!acc[fecha]) acc[fecha] = [];
    acc[fecha].push(clase);
    return acc;
  }, {});

  const reservadasIds = new Set(
    misReservas.filter(r => r.estado === 'activa').map(r => r.clases?.id)
  );

  return (
    <div className="min-h-screen px-4 py-12">
      <div className="max-w-3xl mx-auto">

        <div className="mb-10">
          <div className="w-8 h-px bg-sand mb-4" />
          <h1 className="text-3xl text-tierra">Calendario de clases</h1>
          {tieneCreditos && (
            <p className="text-sage text-sm mt-2">
              Tienes {misPaquetes.reduce((s, p) => s + p.clases_restantes, 0)} créditos disponibles
            </p>
          )}
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-600 text-sm rounded-wellness">
            {error}
          </div>
        )}
        {exito && (
          <div className="mb-6 p-4 bg-sage-muted border border-sage text-sage text-sm rounded-wellness">
            {exito}
          </div>
        )}

        {loading ? (
          <p className="text-tierra-light text-sm tracking-widest uppercase">Cargando clases...</p>
        ) : Object.keys(clasesByDate).length === 0 ? (
          <p className="text-tierra-light text-sm">No hay clases programadas próximamente</p>
        ) : (
          <div className="space-y-10">
            {Object.entries(clasesByDate).map(([fecha, clasesDelDia]) => (
              <div key={fecha}>
                <p className="label-wellness mb-4 capitalize">{fecha}</p>
                <div className="space-y-4">
                  {clasesDelDia.map(clase => (
                    <ClaseCard
                      key={clase.id}
                      clase={clase}
                      onReservar={handleReservar}
                      reservando={reservando === clase.id}
                      yaReservada={reservadasIds.has(clase.id)}
                      tieneCreditos={tieneCreditos}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
