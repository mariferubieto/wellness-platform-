'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { api } from '@/lib/api';

interface Diplomado {
  id: string;
  nombre: string;
  descripcion?: string;
  temario?: string[];
  calendario?: string[];
  precio: number;
  generacion: string;
  activo: boolean;
}

export default function DiplomadoDetallePage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [diplomado, setDiplomado] = useState<Diplomado | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get<Diplomado>(`/api/ayurveda/diplomados/${id}`)
      .then(setDiplomado)
      .catch(() => setError('Diplomado no encontrado'))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-tierra-light text-sm tracking-widest uppercase">Cargando...</p>
      </div>
    );
  }

  if (error || !diplomado) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-tierra-light text-sm mb-4">{error || 'Diplomado no encontrado'}</p>
          <button onClick={() => router.push('/ayurveda')} className="btn-secondary text-xs">
            Ver todos los diplomados
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen px-4 py-16">
      <div className="max-w-3xl mx-auto">

        <button
          onClick={() => router.push('/ayurveda')}
          className="text-tierra-light text-xs tracking-widest uppercase mb-10 hover:text-tierra transition-colors"
        >
          ← Todos los diplomados
        </button>

        <div className="w-8 h-px bg-sand mb-6" />
        <p className="label-wellness mb-3">{diplomado.generacion}</p>
        <h1 className="text-4xl text-tierra mb-6">{diplomado.nombre}</h1>

        {diplomado.descripcion && (
          <p className="text-tierra-light leading-relaxed mb-10">{diplomado.descripcion}</p>
        )}

        {diplomado.temario && diplomado.temario.length > 0 && (
          <div className="mb-10">
            <div className="w-6 h-px bg-sand mb-4" />
            <h2 className="text-xl text-tierra mb-4">Temario</h2>
            <ul className="space-y-2">
              {diplomado.temario.map((modulo, i) => (
                <li key={i} className="flex gap-3 text-sm text-tierra-light">
                  <span className="text-sand font-light mt-0.5">—</span>
                  <span>{modulo}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {diplomado.calendario && diplomado.calendario.length > 0 && (
          <div className="mb-10">
            <div className="w-6 h-px bg-sand mb-4" />
            <h2 className="text-xl text-tierra mb-4">Calendario</h2>
            <ul className="space-y-2">
              {diplomado.calendario.map((fecha, i) => (
                <li key={i} className="flex gap-3 text-sm text-tierra-light">
                  <span className="text-sand font-light mt-0.5">—</span>
                  <span>{fecha}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="border border-sand rounded-wellness p-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <p className="label-wellness mb-1">Inversión</p>
              <p className="text-4xl font-light text-tierra">
                ${diplomado.precio.toLocaleString('es-MX')} <span className="text-base text-tierra-light">MXN</span>
              </p>
            </div>
          </div>
          <button
            onClick={() => router.push(`/ayurveda/inscripcion?diplomado_id=${diplomado.id}`)}
            className="btn-primary w-full text-center"
          >
            Inscribirme
          </button>
          <p className="text-tierra-light text-xs text-center mt-4">
            Recibirás confirmación por WhatsApp una vez validado tu pago.
          </p>
        </div>

      </div>
    </div>
  );
}
