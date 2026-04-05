'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import PaqueteCard from '@/components/shala/PaqueteCard';

interface Paquete {
  id: string;
  nombre: string;
  num_clases: number;
  precio: number;
  vigencia_dias: number;
}

export default function ShalaPage() {
  const [paquetes, setPaquetes] = useState<Paquete[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get<Paquete[]>('/api/shala/paquetes')
      .then(setPaquetes)
      .catch(() => setPaquetes([]))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="min-h-screen px-4 py-16">
      <div className="max-w-5xl mx-auto">

        <div className="text-center mb-16">
          <div className="w-16 h-px bg-sand mx-auto mb-8" />
          <h1 className="text-5xl text-tierra mb-4">Shala Yoga</h1>
          <p className="text-tierra-light max-w-lg mx-auto leading-relaxed">
            Clases presenciales de yoga para todos los niveles. Ven a practicar, respirar y conectar.
          </p>
          <div className="flex justify-center gap-4 mt-8">
            <Link href="/shala/calendario" className="btn-primary">
              Ver calendario
            </Link>
            <Link href="/shala/mis-paquetes" className="btn-secondary">
              Mis paquetes
            </Link>
          </div>
        </div>

        <div className="mb-16">
          <div className="text-center mb-10">
            <div className="w-8 h-px bg-sand mx-auto mb-4" />
            <h2 className="text-3xl text-tierra">Paquetes</h2>
            <p className="text-tierra-light text-sm mt-2">Elige el que mejor se adapta a ti</p>
          </div>

          {loading ? (
            <p className="text-center text-tierra-light text-sm tracking-widest uppercase">Cargando...</p>
          ) : paquetes.length === 0 ? (
            <p className="text-center text-tierra-light text-sm">No hay paquetes disponibles por el momento</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {paquetes.map(p => (
                <PaqueteCard key={p.id} paquete={p} />
              ))}
            </div>
          )}
          <p className="text-center text-tierra-light text-xs mt-6">
            Para adquirir un paquete, contacta a tu maestra por WhatsApp o visítanos en el estudio.
          </p>
        </div>

        <div className="border border-sand rounded-wellness p-8 text-center">
          <p className="label-wellness mb-3">También disponible</p>
          <h3 className="text-2xl text-tierra mb-3">Clases especiales</h3>
          <p className="text-tierra-light text-sm mb-6">
            Workshops, masterclasses y sesiones únicas con pago individual.
          </p>
          <Link href="/shala/clases-especiales" className="btn-secondary">
            Ver clases especiales
          </Link>
        </div>

      </div>
    </div>
  );
}
