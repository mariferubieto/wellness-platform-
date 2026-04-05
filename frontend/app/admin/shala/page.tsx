'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';

interface Clase {
  id: string;
  nombre: string;
  inicio: string;
  fin: string;
  capacidad: number;
  cupo_actual: number;
  tipo: string;
  activo: boolean;
  maestros?: { users: { nombre: string } } | null;
}

export default function AdminShalaPage() {
  const [clases, setClases] = useState<Clase[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get<Clase[]>('/api/shala/clases')
      .then(setClases)
      .catch((err: unknown) => setError(err instanceof Error ? err.message : 'Error'))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div>
      <div className="mb-8 flex items-start justify-between">
        <div>
          <div className="w-8 h-px bg-sand mb-4" />
          <h1 className="text-3xl text-tierra">SHALA — Clases</h1>
          <p className="text-tierra-light text-sm mt-1">{clases.length} clases próximas</p>
        </div>
      </div>

      {error && <p className="text-red-500 text-sm mb-4">{error}</p>}

      {loading ? (
        <p className="text-tierra-light text-sm tracking-widest uppercase">Cargando...</p>
      ) : clases.length === 0 ? (
        <div className="card-wellness text-center py-12">
          <p className="text-tierra-light text-sm">No hay clases programadas</p>
        </div>
      ) : (
        <div className="bg-white border border-beige-lino rounded-wellness overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-beige-lino">
                <th className="label-wellness text-left px-4 py-3">Clase</th>
                <th className="label-wellness text-left px-4 py-3">Maestra</th>
                <th className="label-wellness text-left px-4 py-3">Fecha y hora</th>
                <th className="label-wellness text-left px-4 py-3">Cupo</th>
                <th className="label-wellness text-left px-4 py-3">Tipo</th>
              </tr>
            </thead>
            <tbody>
              {clases.map((c, i) => (
                <tr
                  key={c.id}
                  className={`border-b border-beige-lino last:border-0 ${i % 2 === 0 ? 'bg-white' : 'bg-beige/30'}`}
                >
                  <td className="px-4 py-3 text-tierra">{c.nombre}</td>
                  <td className="px-4 py-3 text-tierra-mid">{c.maestros?.users?.nombre ?? '—'}</td>
                  <td className="px-4 py-3 text-tierra-light text-xs">
                    {new Date(c.inicio).toLocaleString('es-MX', {
                      weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
                    })}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-1 rounded-full ${
                      c.cupo_actual >= c.capacidad
                        ? 'bg-red-50 text-red-400'
                        : 'bg-sage-muted text-sage'
                    }`}>
                      {c.cupo_actual}/{c.capacidad}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-1 rounded-full ${
                      c.tipo === 'especial' ? 'bg-sand/20 text-tierra-mid' : 'bg-beige-lino text-tierra-light'
                    }`}>
                      {c.tipo}
                    </span>
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
