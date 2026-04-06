'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import DiplomadoCard from '@/components/ayurveda/DiplomadoCard';

interface Diplomado {
  id: string;
  nombre: string;
  descripcion?: string;
  precio: number;
  generacion: string;
}

export default function AyurvedaPage() {
  const [diplomados, setDiplomados] = useState<Diplomado[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get<Diplomado[]>('/api/ayurveda/diplomados')
      .then(setDiplomados)
      .catch(() => setDiplomados([]))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="min-h-screen px-4 py-16">
      <div className="max-w-5xl mx-auto">

        <div className="text-center mb-16">
          <div className="w-16 h-px bg-sand mx-auto mb-8" />
          <h1 className="text-5xl text-tierra mb-4">Manali Ayurveda</h1>
          <p className="text-tierra-light max-w-lg mx-auto leading-relaxed">
            Formación profesional en Ayurveda. Diplomados online con maestras certificadas.
          </p>
        </div>

        {loading ? (
          <p className="text-center text-tierra-light text-sm tracking-widest uppercase">Cargando...</p>
        ) : diplomados.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-tierra-light text-sm">No hay diplomados disponibles por el momento.</p>
            <p className="text-tierra-light text-xs mt-2">Próximamente nuevas generaciones.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {diplomados.map(d => (
              <DiplomadoCard key={d.id} diplomado={d} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
