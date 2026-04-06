'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import Input from '@/components/ui/Input';
import Button from '@/components/ui/Button';

interface Diplomado {
  id: string;
  nombre: string;
  precio: number;
  generacion: string;
}

function InscripcionForm() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const diplomadoId = searchParams.get('diplomado_id') ?? '';

  const [diplomado, setDiplomado] = useState<Diplomado | null>(null);
  const [cargando, setCargando] = useState(true);
  const [enviando, setEnviando] = useState(false);
  const [exito, setExito] = useState(false);
  const [error, setError] = useState('');

  const [form, setForm] = useState({
    nombre_completo: '',
    fecha_nacimiento: '',
    whatsapp: '',
    email_gmail: '',
    razon: '',
  });

  useEffect(() => {
    if (!diplomadoId) {
      router.push('/ayurveda');
      return;
    }
    api.get<Diplomado>(`/api/ayurveda/diplomados/${diplomadoId}`)
      .then(setDiplomado)
      .catch(() => router.push('/ayurveda'))
      .finally(() => setCargando(false));
  }, [diplomadoId, router]);

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setEnviando(true);

    try {
      await api.post('/api/ayurveda/inscripciones', {
        diplomado_id: diplomadoId,
        ...form,
      });
      setExito(true);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error al enviar inscripción');
    } finally {
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
            Gracias por inscribirte. Recibirás confirmación por WhatsApp en las próximas horas.
          </p>
          <button onClick={() => router.push('/ayurveda')} className="btn-secondary">
            Volver a diplomados
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen px-4 py-16">
      <div className="max-w-lg mx-auto">
        <button
          onClick={() => router.push(`/ayurveda/${diplomadoId}`)}
          className="text-tierra-light text-xs tracking-widest uppercase mb-10 hover:text-tierra transition-colors"
        >
          ← Regresar
        </button>

        <div className="w-8 h-px bg-sand mb-6" />
        <h1 className="text-3xl text-tierra mb-2">Formulario de inscripción</h1>
        {diplomado && (
          <p className="text-tierra-light text-sm mb-10">
            {diplomado.nombre} · {diplomado.generacion}
          </p>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <Input
            label="Nombre completo"
            name="nombre_completo"
            value={form.nombre_completo}
            onChange={handleChange}
            required
          />
          <Input
            label="Fecha de nacimiento"
            name="fecha_nacimiento"
            type="date"
            value={form.fecha_nacimiento}
            onChange={handleChange}
          />
          <Input
            label="WhatsApp"
            name="whatsapp"
            type="tel"
            value={form.whatsapp}
            onChange={handleChange}
            placeholder="10 dígitos"
            required
          />
          <Input
            label="Email Gmail"
            name="email_gmail"
            type="email"
            value={form.email_gmail}
            onChange={handleChange}
            placeholder="nombre@gmail.com"
            required
          />

          <div>
            <label className="label-wellness block mb-2">¿Por qué quieres estudiar Ayurveda?</label>
            <textarea
              name="razon"
              value={form.razon}
              onChange={handleChange}
              rows={4}
              className="w-full px-4 py-3 bg-white border border-beige-lino rounded-wellness text-sm text-tierra placeholder:text-tierra-light/50 focus:outline-none focus:border-sage transition-colors resize-none"
              placeholder="Compártenos tu motivación..."
            />
          </div>

          {error && <p className="text-red-400 text-xs">{error}</p>}

          <Button type="submit" loading={enviando} className="w-full">
            Enviar inscripción
          </Button>

          <p className="text-tierra-light text-xs text-center">
            Al enviar confirmas tu intención de inscripción. El pago y confirmación se coordinan por WhatsApp.
          </p>
        </form>
      </div>
    </div>
  );
}

export default function InscripcionPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-tierra-light text-sm tracking-widest uppercase">Cargando...</p>
      </div>
    }>
      <InscripcionForm />
    </Suspense>
  );
}
