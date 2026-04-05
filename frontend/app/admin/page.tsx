'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';

interface DashboardMetrics {
  total_usuarios: number;
  total_leads: number;
  leads_nuevos: number;
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
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <MetricCard label="Total usuarios" value={metrics.total_usuarios} />
          <MetricCard label="Total leads" value={metrics.total_leads} />
          <MetricCard label="Leads nuevos" value={metrics.leads_nuevos} />
        </div>
      ) : null}
    </div>
  );
}
