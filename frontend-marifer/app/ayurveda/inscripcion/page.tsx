'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { iniciarPago } from '@/lib/pagos';
import Input from '@/components/ui/Input';
import Button from '@/components/ui/Button';

function InscripcionForm() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const diplomadoId = searchParams.get('diplomado_id') ?? '';
  const cursoId = searchParams.get('curso_id') ?? '';
  const cursoNombre = searchParams.get('nombre') ?? 'Curso';
  const cursoPrecio = parseFloat(searchParams.get('precio') ?? '0');
  const modo = searchParams.get('modo') ?? '';

  const [enviando, setEnviando] = useState(false);
  const [exito, setExito] = useState(false);
  const [error, setError] = useState('');

  // Diplomado flow — keeps existing fields
  const [formDiplomado, setFormDiplomado] = useState({
    nombre_completo: '',
    fecha_nacimiento: '',
    whatsapp: '',
    email_gmail: '',
    razon: '',
  });

  // Curso flow — simplified fields
  const [formCurso, setFormCurso] = useState({
    nombre_completo: '',
    whatsapp: '',
    email_gmail: '',
  });

  // Redirect to /ayurveda if no item specified
  useEffect(() => {
    if (!diplomadoId && !cursoId) {
      router.push('/ayurveda');
    }
  }, [diplomadoId, cursoId, router]);

  if (!diplomadoId && !cursoId) {
    return null;
  }

  async function handleSubmitDiplomado(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setEnviando(true);
    try {
      await api.post('/api/ayurveda/inscripciones', {
        diplomado_id: diplomadoId,
        ...formDiplomado,
      });
      setExito(true);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error al enviar inscripción');
    } finally {
      setEnviando(false);
    }
  }

  async function handleSubmitCurso(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setEnviando(true);
    try {
      await api.post('/api/ayurveda/cursos-inscripciones', {
        curso_id: cursoId,
        nombre_completo: formCurso.nombre_completo,
        whatsapp: formCurso.whatsapp,
        email: formCurso.email_gmail,
      });
      if (modo === 'leads') {
        setExito(true);
      } else {
        await iniciarPago({
          concepto: 'curso_ayurveda',
          concepto_id: cursoId,
          monto: cursoPrecio,
          titulo: cursoNombre,
        });
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error al procesar la inscripción');
      setEnviando(false);
    }
  }

  if (exito) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="max-w-md w-full text-center">
          <div className="w-12 h-px bg-sand mx-auto mb-8" />
          <h1 className="text-3xl text-tierra mb-4">Inscripción recibida</h1>
          <p className="text-tierra-light text-sm leading-relaxed mb-8">
            Gracias por inscribirte. Nos pondremos en contacto por WhatsApp para confirmar tu lugar.
          </p>
          <button onClick={() => router.push('/ayurveda')} className="btn-secondary">
            Volver a Ayurveda
          </button>
        </div>
      </div>
    );
  }

  // ── Diplomado form (existing logic) ──
  if (diplomadoId) {
    return (
      <div className="min-h-screen px-4 py-16">
        <div className="max-w-lg mx-auto">
          <button
            onClick={() => router.push('/ayurveda')}
            className="text-tierra-light text-xs tracking-widest uppercase mb-10 hover:text-tierra transition-colors"
          >
            ← Regresar
          </button>
          <div className="w-8 h-px bg-sand mb-6" />
          <h1 className="text-3xl text-tierra mb-2">Formulario de inscripción</h1>
          <p className="text-tierra-light text-sm mb-10">Diplomado Manali Ayurveda</p>
          <form onSubmit={handleSubmitDiplomado} className="space-y-5">
            <Input label="Nombre completo" name="nombre_completo"
              value={formDiplomado.nombre_completo}
              onChange={e => setFormDiplomado(f => ({ ...f, nombre_completo: e.target.value }))} required />
            <Input label="Fecha de nacimiento" name="fecha_nacimiento" type="date"
              value={formDiplomado.fecha_nacimiento}
              onChange={e => setFormDiplomado(f => ({ ...f, fecha_nacimiento: e.target.value }))} />
            <Input label="WhatsApp" name="whatsapp" type="tel"
              value={formDiplomado.whatsapp}
              onChange={e => setFormDiplomado(f => ({ ...f, whatsapp: e.target.value }))}
              placeholder="10 dígitos" required />
            <Input label="Email Gmail" name="email_gmail" type="email"
              value={formDiplomado.email_gmail}
              onChange={e => setFormDiplomado(f => ({ ...f, email_gmail: e.target.value }))}
              placeholder="nombre@gmail.com" required />
            <div>
              <label className="label-wellness block mb-2">¿Por qué quieres estudiar Ayurveda?</label>
              <textarea
                name="razon"
                value={formDiplomado.razon}
                onChange={e => setFormDiplomado(f => ({ ...f, razon: e.target.value }))}
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

  // ── Curso form ──
  return (
    <div className="min-h-screen px-4 py-16">
      <div className="max-w-lg mx-auto">
        <button
          onClick={() => router.push('/ayurveda')}
          className="text-tierra-light text-xs tracking-widest uppercase mb-10 hover:text-tierra transition-colors"
        >
          ← Regresar
        </button>
        <div className="w-8 h-px bg-sand mb-6" />
        <h1 className="text-3xl text-tierra mb-2">Inscripción</h1>
        <p className="text-tierra-light text-sm mb-10">{cursoNombre}</p>
        <form onSubmit={handleSubmitCurso} className="space-y-5">
          <Input label="Nombre completo" name="nombre_completo"
            value={formCurso.nombre_completo}
            onChange={e => setFormCurso(f => ({ ...f, nombre_completo: e.target.value }))} required />
          <Input label="WhatsApp" name="whatsapp" type="tel"
            value={formCurso.whatsapp}
            onChange={e => setFormCurso(f => ({ ...f, whatsapp: e.target.value }))}
            placeholder="10 dígitos" required />
          <Input label="Email" name="email_gmail" type="email"
            value={formCurso.email_gmail}
            onChange={e => setFormCurso(f => ({ ...f, email_gmail: e.target.value }))} required />
          {error && <p className="text-red-400 text-xs">{error}</p>}
          <Button type="submit" loading={enviando} className="w-full">
            Inscribirme
          </Button>
          <p className="text-tierra-light text-xs text-center">
            {modo === 'leads'
              ? 'Nos pondremos en contacto por WhatsApp para confirmar tu lugar.'
              : 'Al continuar serás redirigido a MercadoPago para completar el pago.'}
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
