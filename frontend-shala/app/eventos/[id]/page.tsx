'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { api } from '@/lib/api';

interface Evento {
  id: string;
  nombre: string;
  descripcion?: string;
  lugar?: string;
  flyer_url?: string;
  precio?: number | null;
  fecha?: string;
  tipo_acceso: 'pago' | 'whatsapp' | 'gratis';
  whatsapp_contacto?: string;
  activo: boolean;
}

export default function EventoDetallePage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [evento, setEvento] = useState<Evento | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get<Evento>(`/api/eventos/${id}`)
      .then(setEvento)
      .catch(() => setError('Evento no encontrado'))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-tierra-light text-sm tracking-widest uppercase">Cargando...</p>
      </div>
    );
  }

  if (error || !evento) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-tierra-light text-sm mb-4">{error || 'Evento no encontrado'}</p>
          <button onClick={() => router.push('/eventos')} className="btn-secondary text-xs">
            Ver todos los eventos
          </button>
        </div>
      </div>
    );
  }

  const fecha = evento.fecha
    ? new Date(evento.fecha).toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })
    : null;

  const waLink = evento.whatsapp_contacto
    ? `https://wa.me/${evento.whatsapp_contacto.replace(/\D/g, '')}?text=${encodeURIComponent(`Hola, me interesa el evento "${evento.nombre}". ¿Puedes darme más información?`)}`
    : null;

  return (
    <div className="min-h-screen px-4 py-16">
      <div className="max-w-3xl mx-auto">

        <button
          onClick={() => router.push('/eventos')}
          className="text-tierra-light text-xs tracking-widest uppercase mb-10 hover:text-tierra transition-colors"
        >
          ← Todos los eventos
        </button>

        {evento.flyer_url && (
          <div className="mb-10 rounded-wellness overflow-hidden">
            <img src={evento.flyer_url} alt={evento.nombre} className="w-full object-cover" />
          </div>
        )}

        <div className="w-8 h-px bg-sand mb-6" />
        {fecha && <p className="label-wellness mb-3">{fecha}</p>}
        <h1 className="text-4xl text-tierra mb-2">{evento.nombre}</h1>
        {evento.lugar && <p className="text-tierra-light text-sm mb-6">{evento.lugar}</p>}

        {evento.descripcion && (
          <p className="text-tierra-light leading-relaxed mb-10">{evento.descripcion}</p>
        )}

        <div className="border border-sand rounded-wellness p-8">
          {evento.tipo_acceso === 'pago' && evento.precio != null && (
            <div className="mb-6">
              <p className="label-wellness mb-1">Inversión</p>
              <p className="text-4xl font-light text-tierra">
                ${evento.precio.toLocaleString('es-MX')} <span className="text-base text-tierra-light">MXN</span>
              </p>
            </div>
          )}

          {evento.tipo_acceso === 'gratis' && (
            <div className="mb-6">
              <p className="label-wellness mb-1">Acceso</p>
              <p className="text-2xl font-light text-tierra">Gratuito</p>
            </div>
          )}

          <div className="space-y-3">
            {(evento.tipo_acceso === 'pago' || evento.tipo_acceso === 'gratis') && (
              <button
                onClick={() => router.push(`/eventos/inscripcion?evento_id=${evento.id}&precio=${evento.precio ?? 0}&nombre=${encodeURIComponent(evento.nombre)}&tipo_acceso=${evento.tipo_acceso}`)}
                className="btn-primary w-full text-center"
              >
                {evento.tipo_acceso === 'gratis' ? 'Inscribirme gratis' : 'Inscribirme'}
              </button>
            )}

            {(evento.tipo_acceso === 'whatsapp' || waLink) && (
              <a
                href={waLink ?? '#'}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-secondary w-full text-center block"
              >
                Contactar por WhatsApp
              </a>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
