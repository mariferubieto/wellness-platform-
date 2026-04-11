// frontend/app/admin/page.tsx
'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';

interface ProximoEvento {
  id: string;
  nombre: string;
  fecha: string;
  tipo_acceso: string;
}

interface DashboardMetrics {
  total_usuarios: number;
  total_leads: number;
  leads_nuevos: number;
  ventas_mes: number;
  proximos_eventos: ProximoEvento[];
}

function MetricCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="card-wellness">
      <p className="label-wellness mb-2">{label}</p>
      <p className="text-4xl font-light text-tierra">{value.toLocaleString('es-MX')}</p>
    </div>
  );
}

export default function AdminDashboard() {
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get<DashboardMetrics>('/api/admin/dashboard')
      .then(setMetrics)
      .catch((err: unknown) => setError(err instanceof Error ? err.message : 'Error al cargar métricas'))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div>
      <div className="mb-8">
        <div className="w-8 h-px bg-sand mb-4" />
        <h1 className="text-3xl text-tierra">Dashboard</h1>
      </div>

      {loading ? (
        <p className="text-tierra-light text-sm tracking-widest uppercase">Cargando métricas...</p>
      ) : error ? (
        <p className="text-red-500 text-sm">{error}</p>
      ) : metrics ? (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-10">
            <MetricCard label="Total usuarios" value={metrics.total_usuarios} />
            <MetricCard label="Total leads" value={metrics.total_leads} />
            <MetricCard label="Leads nuevos" value={metrics.leads_nuevos} />
            <MetricCard label="Ventas este mes" value={metrics.ventas_mes} />
          </div>

          {metrics.proximos_eventos.length > 0 && (
            <div className="card-wellness">
              <div className="w-6 h-px bg-sand mb-4" />
              <h2 className="text-xl text-tierra mb-4">Próximos eventos</h2>
              <div className="space-y-3">
                {metrics.proximos_eventos.map(evento => (
                  <div key={evento.id} className="flex items-center justify-between py-2 border-b border-beige-lino last:border-0">
                    <div>
                      <p className="text-sm text-tierra">{evento.nombre}</p>
                      <p className="text-xs text-tierra-light">
                        {new Date(evento.fecha).toLocaleDateString('es-MX', { day: 'numeric', month: 'long', year: 'numeric' })}
                      </p>
                    </div>
                    <span className={`text-xs px-2 py-1 rounded-full ${
                      evento.tipo_acceso === 'pago' ? 'bg-sand text-tierra-mid' :
                      evento.tipo_acceso === 'gratis' ? 'bg-sage-muted text-sage' :
                      'bg-beige text-tierra-light'
                    }`}>
                      {evento.tipo_acceso}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="mt-10 grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { href: '/admin/crm', label: 'CRM · Leads' },
              { href: '/admin/ayurveda', label: 'Ver AYURVEDA' },
              { href: '/admin/marifer', label: 'Ver MARIFER' },
              { href: '/admin/contenido', label: 'Gestionar Contenido' },
              { href: '/admin/codigos', label: 'Códigos Promo' },
            ].map(link => (
              <Link key={link.href} href={link.href} className="btn-secondary text-center text-xs">
                {link.label}
              </Link>
            ))}
          </div>
        </>
      ) : null}
    </div>
  );
}
