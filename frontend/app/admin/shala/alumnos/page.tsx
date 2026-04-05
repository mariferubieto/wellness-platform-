'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import ShalaAlumnosTable from '@/components/admin/ShalaAlumnosTable';
import Button from '@/components/ui/Button';

interface Alumno {
  id: string;
  nombre: string;
  email: string;
  telefono?: string;
  created_at: string;
  paquetes_usuario: Array<{
    id: string;
    clases_restantes: number;
    expira_en: string;
    activo: boolean;
  }>;
}

export default function ShalaAlumnosPage() {
  const [alumnos, setAlumnos] = useState<Alumno[]>([]);
  const [loading, setLoading] = useState(true);
  const [exportando, setExportando] = useState(false);
  const [exportError, setExportError] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    api.get<Alumno[]>('/api/admin/shala/alumnos')
      .then(setAlumnos)
      .catch((err: unknown) => setError(err instanceof Error ? err.message : 'Error'))
      .finally(() => setLoading(false));
  }, []);

  async function handleExportar() {
    setExportando(true);
    setExportError('');
    try {
      const { createSupabaseClient } = await import('@/lib/supabase');
      const supabase = createSupabaseClient();
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) throw new Error('No autenticado');
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) throw new Error('Sin token');

      const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
      const res = await fetch(`${API_URL}/api/admin/shala/exportar/alumnos`, {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({ error: `Error ${res.status}` }));
        throw new Error(errData.error || `Error ${res.status}`);
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `shala-alumnos-${new Date().toISOString().split('T')[0]}.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err: unknown) {
      setExportError(err instanceof Error ? err.message : 'Error al exportar');
    } finally {
      setExportando(false);
    }
  }

  return (
    <div>
      <div className="mb-8 flex items-start justify-between">
        <div>
          <div className="w-8 h-px bg-sand mb-4" />
          <h1 className="text-3xl text-tierra">Alumnos SHALA</h1>
          <p className="text-tierra-light text-sm mt-1">{alumnos.length} alumnas registradas</p>
        </div>
        <div>
          <Button variant="secondary" onClick={handleExportar} loading={exportando}>
            Exportar Excel
          </Button>
          {exportError && <p className="text-red-500 text-xs mt-2">{exportError}</p>}
        </div>
      </div>

      {error && <p className="text-red-500 text-sm mb-4">{error}</p>}

      {loading ? (
        <p className="text-tierra-light text-sm tracking-widest uppercase">Cargando alumnos...</p>
      ) : (
        <ShalaAlumnosTable alumnos={alumnos} />
      )}
    </div>
  );
}
