'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { iniciarPago } from '@/lib/pagos';
import Input from '@/components/ui/Input';
import Button from '@/components/ui/Button';

interface Evento {
  id: string;
  nombre: string;
  precio?: number | null;
  tipo_acceso: 'pago' | 'whatsapp' | 'gratis';
}

function InscripcionEventoForm() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const eventoId = searchParams.get('evento_id') ?? '';
  const eventoPrecio = parseFloat(searchParams.get('precio') ?? '0');
  const eventoNombre = searchParams.get('nombre') ?? 'Evento';
  const tipoAcceso = searchParams.get('tipo_acceso') ?? 'gratis';

  const [evento, setEvento] = useState<Evento | null>(null);
  const [cargando, setCargando] = useState(true);
  const [enviando, setEnviando] = useState(false);
  const [exito, setExito] = useState(false);
  const [error, setError] = useState('');

  const [form, setForm] = useState({ nombre_completo: '', email: '', whatsapp: '' });

  useEffect(() => {
    if (!eventoId) {
      router.push('/eventos');
      return;
    }
    api.get<Evento>(`/api/eventos/${eventoId}`)
      .then(setEvento)
      .catch(() => router.push('/eventos'))
      .finally(() => setCargando(false));
  }, [eventoId, router]);

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setEnviando(true);
    try {
      await api.post('/api/eventos/inscripciones', { evento_id: eventoId, ...form });
      if (tipoAcceso === 'pago' && eventoPrecio > 0) {
        await iniciarPago({
          concepto: 'evento',
          concepto_id: eventoId,
          monto: eventoPrecio,
          titulo: eventoNombre,
        });
      } else {
        setExito(true);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error al enviar');
      setEnviando(false);
    }
  }

  if (cargando) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-tierra-light text-sm tracking-widest uppercase">Cargando...</p>
      </div>
    );
  }

  if (exito) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="max-w-md w-full text-center">
          <div className="w-12 h-px bg-sand mx-auto mb-8" />
          <h1 className="text-3xl text-tierra mb-4">Inscripción recibida</h1>
          <p className="text-tierra-light text-sm leading-relaxed mb-8">
            ¡Nos vemos pronto! Recibirás confirmación por WhatsApp.
          </p>
          <button onClick={() => router.push('/eventos')} className="btn-secondary">
            Volver a eventos
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen px-4 py-16">
      <div className="max-w-md mx-auto">
        <button
          onClick={() => router.push(`/eventos/${eventoId}`)}
          className="text-tierra-light text-xs tracking-widest uppercase mb-10 hover:text-tierra transition-colors"
        >
          ← Regresar
        </button>

        <div className="w-8 h-px bg-sand mb-6" />
        <h1 className="text-3xl text-tierra mb-2">Inscripción</h1>
        {evento && (
          <p className="text-tierra-light text-sm mb-10">
            {evento.nombre}
            {evento.tipo_acceso === 'gratis' ? ' · Gratuito' : evento.precio != null ? ` · $${evento.precio.toLocaleString('es-MX')} MXN` : ''}
          </p>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <Input label="Nombre completo" name="nombre_completo" value={form.nombre_completo} onChange={handleChange} required />
          <Input label="Email" name="email" type="email" value={form.email} onChange={handleChange} required />
          <Input label="WhatsApp" name="whatsapp" type="tel" value={form.whatsapp} onChange={handleChange} placeholder="10 dígitos" required />

          {error && <p className="text-red-400 text-xs">{error}</p>}

          <Button type="submit" loading={enviando} className="w-full">
            Confirmar inscripción
          </Button>
        </form>
      </div>
    </div>
  );
}

export default function InscripcionEventoPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-tierra-light text-sm tracking-widest uppercase">Cargando...</p>
      </div>
    }>
      <InscripcionEventoForm />
    </Suspense>
  );
}
