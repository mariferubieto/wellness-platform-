'use client';

import { useEffect, useState } from 'react';

export default function LeadPopup() {
  const [visible, setVisible] = useState(false);
  const [email, setEmail] = useState('');
  const [telefono, setTelefono] = useState('');
  const [enviado, setEnviado] = useState(false);
  const [error, setError] = useState('');
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (document.cookie.includes('marifer_lead_shown=1')) return;
    const timer = setTimeout(() => setVisible(true), 5000);
    return () => clearTimeout(timer);
  }, []);

  function dismiss() {
    document.cookie = 'marifer_lead_shown=1; max-age=2592000; path=/';
    setVisible(false);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSending(true);
    setError('');
    try {
      let ciudad: string | undefined;
      let pais: string | undefined;
      try {
        const geo = await fetch('https://ipapi.co/json/').then(r => r.json());
        ciudad = geo.city;
        pais = geo.country_name;
      } catch { /* geolocation is best-effort */ }

      const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
      const res = await fetch(`${API_URL}/api/leads`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, telefono: telefono || undefined, ciudad, pais }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({ error: 'Error' }));
        throw new Error(data.error);
      }
      setEnviado(true);
      document.cookie = 'marifer_lead_shown=1; max-age=2592000; path=/';
      setTimeout(() => setVisible(false), 2500);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error al guardar');
    } finally {
      setSending(false);
    }
  }

  if (!visible) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center p-4">
      <div className="absolute inset-0 bg-tierra/20 backdrop-blur-sm" onClick={dismiss} />
      <div className="relative w-full max-w-md bg-beige border border-sand rounded-wellness p-8 shadow-xl">
        <button
          onClick={dismiss}
          className="absolute top-4 right-4 text-tierra-light hover:text-tierra transition-colors text-sm"
          aria-label="Cerrar"
        >
          ✕
        </button>

        {enviado ? (
          <div className="text-center py-4">
            <div className="w-8 h-px bg-sage mx-auto mb-4" />
            <p className="text-tierra text-lg mb-2" style={{ fontFamily: 'var(--font-playfair)' }}>
              ¡Gracias por unirte!
            </p>
            <p className="text-tierra-light text-sm">
              Te avisaremos de retiros, talleres y descuentos.
            </p>
          </div>
        ) : (
          <>
            <div className="w-8 h-px bg-sand mb-6" />
            <h2 className="text-2xl text-tierra mb-2" style={{ fontFamily: 'var(--font-playfair)' }}>
              Únete a la comunidad
            </h2>
            <p className="text-tierra-light text-sm mb-6 leading-relaxed">
              Recibe información sobre retiros, talleres y descuentos exclusivos.
            </p>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="label-wellness">Email *</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="tu@email.com"
                  className="input-wellness"
                />
              </div>
              <div>
                <label className="label-wellness">WhatsApp (opcional)</label>
                <input
                  type="tel"
                  value={telefono}
                  onChange={e => setTelefono(e.target.value)}
                  placeholder="+52 55 1234 5678"
                  className="input-wellness"
                />
              </div>
              {error && <p className="text-red-400 text-xs">{error}</p>}
              <button type="submit" disabled={sending} className="btn-wellness w-full">
                {sending ? 'Guardando...' : 'Unirme'}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
