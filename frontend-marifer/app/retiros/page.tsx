'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import RetiroCard from '@/components/marifer/RetiroCard';

interface Retiro {
  id: string;
  nombre: string;
  descripcion?: string;
  lugar?: string;
  precio: number;
  fecha_inicio?: string;
  fecha_fin?: string;
  imagen_url?: string;
}

export default function RetirosPage() {
  const [retiros, setRetiros] = useState<Retiro[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get<Retiro[]>('/api/retiros')
      .then(setRetiros)
      .catch(() => setRetiros([]))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="min-h-screen px-4 py-16">
      <div className="max-w-5xl mx-auto">

        <div className="text-center mb-16">
          <div className="w-16 h-px bg-sand mx-auto mb-8" />
          <h1 className="text-5xl text-tierra mb-4">Retiros</h1>
          <p className="text-tierra-light max-w-lg mx-auto leading-relaxed">
            Experiencias de bienestar profundo. Retiros de yoga, meditación y reconexión.
          </p>
        </div>

        {loading ? (
          <p className="text-center text-tierra-light text-sm tracking-widest uppercase">Cargando...</p>
        ) : retiros.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-tierra-light text-sm">No hay retiros disponibles por el momento.</p>
            <p className="text-tierra-light text-xs mt-2">Próximamente nuevas fechas.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {retiros.map(r => (
              <RetiroCard key={r.id} retiro={r} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
