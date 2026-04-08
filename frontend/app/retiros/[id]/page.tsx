'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { api } from '@/lib/api';

interface Retiro {
  id: string;
  nombre: string;
  descripcion?: string;
  lugar?: string;
  incluye?: string;
  precio: number;
  fecha_inicio?: string;
  fecha_fin?: string;
  whatsapp_contacto?: string;
  activo: boolean;
}

export default function RetiroDetallePage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [retiro, setRetiro] = useState<Retiro | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get<Retiro>(`/api/retiros/${id}`)
      .then(setRetiro)
      .catch(() => setError('Retiro no encontrado'))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-tierra-light text-sm tracking-widest uppercase">Cargando...</p>
      </div>
    );
  }

  if (error || !retiro) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-tierra-light text-sm mb-4">{error || 'Retiro no encontrado'}</p>
          <button onClick={() => router.push('/retiros')} className="btn-secondary text-xs">
            Ver todos los retiros
          </button>
        </div>
      </div>
    );
  }

  const fechas = retiro.fecha_inicio && retiro.fecha_fin
    ? `${new Date(retiro.fecha_inicio).toLocaleDateString('es-MX', { day: 'numeric', month: 'long' })} – ${new Date(retiro.fecha_fin).toLocaleDateString('es-MX', { day: 'numeric', month: 'long', year: 'numeric' })}`
    : null;

  const waLink = retiro.whatsapp_contacto
    ? `https://wa.me/${retiro.whatsapp_contacto.replace(/\D/g, '')}?text=${encodeURIComponent(`Hola, me interesa el retiro "${retiro.nombre}". ¿Puedes darme más información?`)}`
    : null;

  return (
    <div className="min-h-screen px-4 py-16">
      <div className="max-w-3xl mx-auto">

        <button
          onClick={() => router.push('/retiros')}
          className="text-tierra-light text-xs tracking-widest uppercase mb-10 hover:text-tierra transition-colors"
        >
          ← Todos los retiros
        </button>

        <div className="w-8 h-px bg-sand mb-6" />
        {fechas && <p className="label-wellness mb-3">{fechas}</p>}
        <h1 className="text-4xl text-tierra mb-2">{retiro.nombre}</h1>
        {retiro.lugar && <p className="text-tierra-light text-sm mb-6">{retiro.lugar}</p>}

        {retiro.descripcion && (
          <p className="text-tierra-light leading-relaxed mb-10">{retiro.descripcion}</p>
        )}

        {retiro.incluye && (
          <div className="mb-10">
            <div className="w-6 h-px bg-sand mb-4" />
            <h2 className="text-xl text-tierra mb-3">Incluye</h2>
            <p className="text-tierra-light text-sm leading-relaxed">{retiro.incluye}</p>
          </div>
        )}

        <div className="border border-sand rounded-wellness p-8">
          <div className="mb-6">
            <p className="label-wellness mb-1">Inversión</p>
            <p className="text-4xl font-light text-tierra">
              ${retiro.precio.toLocaleString('es-MX')} <span className="text-base text-tierra-light">MXN</span>
            </p>
          </div>

          <div className="space-y-3">
            <button
              onClick={() => router.push(`/retiros/inscripcion?retiro_id=${retiro.id}&precio=${retiro.precio}&nombre=${encodeURIComponent(retiro.nombre)}`)}
              className="btn-primary w-full text-center"
            >
              Inscribirme
            </button>

            {waLink && (
              <a
                href={waLink}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-secondary w-full text-center block"
              >
                Contactar por WhatsApp
              </a>
            )}
          </div>

          <p className="text-tierra-light text-xs text-center mt-4">
            Recibirás confirmación por WhatsApp una vez validado tu lugar.
          </p>
        </div>

      </div>
    </div>
  );
}
