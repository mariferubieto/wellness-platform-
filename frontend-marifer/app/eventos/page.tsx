'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import EventoCard from '@/components/marifer/EventoCard';

interface Evento {
  id: string;
  nombre: string;
  descripcion?: string;
  lugar?: string;
  precio?: number | null;
  fecha?: string;
  tipo_acceso: 'pago' | 'whatsapp' | 'gratis';
  whatsapp_contacto?: string;
}

export default function EventosPage() {
  const [eventos, setEventos] = useState<Evento[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get<Evento[]>('/api/eventos')
      .then(setEventos)
      .catch(() => setEventos([]))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="min-h-screen px-4 py-16">
      <div className="max-w-5xl mx-auto">

        <div className="text-center mb-16">
          <div className="w-16 h-px bg-sand mx-auto mb-8" />
          <h1 className="text-5xl text-tierra mb-4">Eventos</h1>
          <p className="text-tierra-light max-w-lg mx-auto leading-relaxed">
            Talleres, workshops y eventos especiales. Momentos para conectar y aprender.
          </p>
        </div>

        {loading ? (
          <p className="text-center text-tierra-light text-sm tracking-widest uppercase">Cargando...</p>
        ) : eventos.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-tierra-light text-sm">No hay eventos próximos por el momento.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {eventos.map(e => (
              <EventoCard key={e.id} evento={e} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
