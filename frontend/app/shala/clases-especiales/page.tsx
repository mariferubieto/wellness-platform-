'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';

interface ClaseEspecial {
  id: string;
  nombre: string;
  descripcion?: string;
  inicio: string;
  fin: string;
  capacidad: number;
  cupo_actual: number;
  precio_especial?: number;
  maestros?: { id: string; users: { nombre: string } } | null;
}

export default function ClasesEspecialesPage() {
  const [clases, setClases] = useState<ClaseEspecial[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get<ClaseEspecial[]>('/api/shala/clases?tipo=especial')
      .then(setClases)
      .catch(() => setClases([]))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="min-h-screen px-4 py-12">
      <div className="max-w-3xl mx-auto">

        <div className="mb-10">
          <div className="w-8 h-px bg-sand mb-4" />
          <h1 className="text-3xl text-tierra">Clases especiales</h1>
          <p className="text-tierra-light text-sm mt-2">
            Workshops y masterclasses con pago individual. No se pueden reservar con créditos de paquete.
          </p>
        </div>

        {loading ? (
          <p className="text-tierra-light text-sm tracking-widest uppercase">Cargando...</p>
        ) : clases.length === 0 ? (
          <div className="card-wellness text-center py-12">
            <p className="text-tierra-light text-sm">No hay clases especiales próximas</p>
          </div>
        ) : (
          <div className="space-y-4">
            {clases.map(clase => {
              const inicio = new Date(clase.inicio);
              const cuposLibres = clase.capacidad - clase.cupo_actual;
              return (
                <div key={clase.id} className="card-wellness">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <p className="label-wellness mb-1">
                        {inicio.toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long' })}
                        {' · '}
                        {inicio.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}
                      </p>
                      <h3 className="text-xl text-tierra">{clase.nombre}</h3>
                      {clase.maestros?.users?.nombre && (
                        <p className="text-tierra-light text-sm mt-1">{clase.maestros.users.nombre}</p>
                      )}
                      {clase.descripcion && (
                        <p className="text-tierra-light text-sm mt-3 leading-relaxed">{clase.descripcion}</p>
                      )}
                    </div>
                    <div className="ml-6 text-right">
                      {clase.precio_especial != null && (
                        <p className="text-xl font-light text-tierra">
                          ${clase.precio_especial.toLocaleString('es-MX')}
                          <span className="text-xs text-tierra-light block">MXN</span>
                        </p>
                      )}
                      <span className={`text-xs mt-2 block ${cuposLibres === 0 ? 'text-red-400' : 'text-sage'}`}>
                        {cuposLibres === 0 ? 'Llena' : `${cuposLibres} lugares`}
                      </span>
                    </div>
                  </div>
                  <div className="mt-4 pt-4 border-t border-beige-lino">
                    <p className="text-tierra-light text-xs">
                      Para inscribirte, contacta a tu maestra por WhatsApp o visítanos en el estudio.
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
