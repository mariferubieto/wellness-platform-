'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import CRMTable from '@/components/admin/CRMTable';
import Button from '@/components/ui/Button';

interface CRMContact {
  id: string;
  nombre?: string;
  email?: string;
  telefono?: string;
  fuente?: string;
  tags?: string[];
  intereses?: string[];
  estado?: string;
  created_at: string;
}

interface CRMResponse {
  usuarios: CRMContact[];
  leads: CRMContact[];
}

export default function CRMPage() {
  const [data, setData] = useState<CRMResponse>({ usuarios: [], leads: [] });
  const [loading, setLoading] = useState(true);
  const [exportando, setExportando] = useState(false);
  const [filtroFuente, setFiltroFuente] = useState('');
  const [filtroEstado, setFiltroEstado] = useState('');

  useEffect(() => {
    const params = new URLSearchParams();
    if (filtroFuente) params.set('fuente', filtroFuente);
    if (filtroEstado) params.set('estado', filtroEstado);

    api.get<CRMResponse>(`/api/admin/crm?${params}`)
      .then(setData)
      .finally(() => setLoading(false));
  }, [filtroFuente, filtroEstado]);

  const todosLosContactos = [
    ...data.usuarios.map(u => ({ ...u, tipo: 'usuario' as const })),
    ...data.leads.map(l => ({ ...l, tipo: 'lead' as const })),
  ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  async function handleExportar() {
    setExportando(true);
    try {
      const { createSupabaseClient } = await import('@/lib/supabase');
      const supabase = createSupabaseClient();
      const { data: { session } } = await supabase.auth.getSession();

      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/admin/crm/exportar`,
        { headers: { Authorization: `Bearer ${session?.access_token}` } }
      );

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `crm-${new Date().toISOString().split('T')[0]}.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setExportando(false);
    }
  }

  const FUENTES = ['shala', 'ayurveda', 'retiro', 'evento', 'newsletter', 'directo'];
  const ESTADOS = ['nuevo', 'contactado', 'convertido', 'inactivo'];

  return (
    <div>
      <div className="flex items-start justify-between mb-8">
        <div>
          <div className="w-8 h-px bg-sand mb-4" />
          <h1 className="text-3xl text-tierra">CRM</h1>
          <p className="text-tierra-light text-sm mt-1">
            {todosLosContactos.length} contactos
          </p>
        </div>
        <Button variant="secondary" onClick={handleExportar} loading={exportando}>
          Exportar Excel
        </Button>
      </div>
      <div className="flex gap-4 mb-6">
        <select
          value={filtroFuente}
          onChange={e => setFiltroFuente(e.target.value)}
          className="input-wellness w-48"
        >
          <option value="">Todas las fuentes</option>
          {FUENTES.map(f => (
            <option key={f} value={f}>{f}</option>
          ))}
        </select>
        <select
          value={filtroEstado}
          onChange={e => setFiltroEstado(e.target.value)}
          className="input-wellness w-48"
        >
          <option value="">Todos los estados</option>
          {ESTADOS.map(s => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
      </div>
      {loading ? (
        <p className="text-tierra-light text-sm tracking-widest uppercase">Cargando CRM...</p>
      ) : (
        <CRMTable contacts={todosLosContactos} />
      )}
    </div>
  );
}
