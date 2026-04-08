'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { iniciarPago } from '@/lib/pagos';
import Input from '@/components/ui/Input';
import Button from '@/components/ui/Button';

interface Retiro {
  id: string;
  nombre: string;
  precio: number;
  lugar?: string;
}

function InscripcionRetiroForm() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const retiroId = searchParams.get('retiro_id') ?? '';
  const retiroPrecio = parseFloat(searchParams.get('precio') ?? '0');
  const retiroNombre = searchParams.get('nombre') ?? 'Retiro';

  const [retiro, setRetiro] = useState<Retiro | null>(null);
  const [cargando, setCargando] = useState(true);
  const [enviando, setEnviando] = useState(false);
  const [exito, setExito] = useState(false);
  const [error, setError] = useState('');

  const [form, setForm] = useState({
    nombre_completo: '',
    fecha_nacimiento: '',
    whatsapp: '',
    email: '',
    instagram: '',
    ciudad: '',
    razon: '',
    restricciones_alimenticias: '',
  });

  useEffect(() => {
    if (!retiroId) {
      router.push('/retiros');
      return;
    }
    api.get<Retiro>(`/api/retiros/${retiroId}`)
      .then(setRetiro)
      .catch(() => router.push('/retiros'))
      .finally(() => setCargando(false));
  }, [retiroId, router]);

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setEnviando(true);
    try {
      await api.post('/api/retiros/inscripciones', { retiro_id: retiroId, ...form });
      await iniciarPago({
        concepto: 'retiro',
        concepto_id: retiroId,
        monto: retiroPrecio,
        titulo: retiroNombre,
      });
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
            Gracias por inscribirte. Te confirmaremos tu lugar por WhatsApp en breve.
          </p>
          <button onClick={() => router.push('/retiros')} className="btn-secondary">
            Volver a retiros
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen px-4 py-16">
      <div className="max-w-lg mx-auto">
        <button
          onClick={() => router.push(`/retiros/${retiroId}`)}
          className="text-tierra-light text-xs tracking-widest uppercase mb-10 hover:text-tierra transition-colors"
        >
          ← Regresar
        </button>

        <div className="w-8 h-px bg-sand mb-6" />
        <h1 className="text-3xl text-tierra mb-2">Formulario de inscripción</h1>
        {retiro && (
          <p className="text-tierra-light text-sm mb-10">
            {retiro.nombre}{retiro.lugar ? ` · ${retiro.lugar}` : ''}
          </p>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <Input label="Nombre completo" name="nombre_completo" value={form.nombre_completo} onChange={handleChange} required />
          <Input label="Fecha de nacimiento" name="fecha_nacimiento" type="date" value={form.fecha_nacimiento} onChange={handleChange} />
          <Input label="WhatsApp" name="whatsapp" type="tel" value={form.whatsapp} onChange={handleChange} placeholder="10 dígitos" required />
          <Input label="Email" name="email" type="email" value={form.email} onChange={handleChange} required />
          <Input label="Instagram (opcional)" name="instagram" value={form.instagram} onChange={handleChange} placeholder="@usuario" />
          <Input label="Ciudad" name="ciudad" value={form.ciudad} onChange={handleChange} />

          <div>
            <label className="label-wellness block mb-2">¿Por qué quieres asistir?</label>
            <textarea
              name="razon"
              value={form.razon}
              onChange={handleChange}
              rows={3}
              className="w-full px-4 py-3 bg-white border border-beige-lino rounded-wellness text-sm text-tierra placeholder:text-tierra-light/50 focus:outline-none focus:border-sage transition-colors resize-none"
              placeholder="Compártenos tu motivación..."
            />
          </div>

          <div>
            <label className="label-wellness block mb-2">Restricciones alimenticias (opcional)</label>
            <textarea
              name="restricciones_alimenticias"
              value={form.restricciones_alimenticias}
              onChange={handleChange}
              rows={2}
              className="w-full px-4 py-3 bg-white border border-beige-lino rounded-wellness text-sm text-tierra placeholder:text-tierra-light/50 focus:outline-none focus:border-sage transition-colors resize-none"
              placeholder="Alergias, vegetariana, etc."
            />
          </div>

          {error && <p className="text-red-400 text-xs">{error}</p>}

          <Button type="submit" loading={enviando} className="w-full">
            Enviar inscripción
          </Button>

          <p className="text-tierra-light text-xs text-center">
            Tu lugar se confirma por WhatsApp una vez procesado el pago.
          </p>
        </form>
      </div>
    </div>
  );
}

export default function InscripcionRetiroPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-tierra-light text-sm tracking-widest uppercase">Cargando...</p>
      </div>
    }>
      <InscripcionRetiroForm />
    </Suspense>
  );
}
