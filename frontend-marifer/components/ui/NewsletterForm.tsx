'use client';

import { useState } from 'react';
import { api } from '@/lib/api';

interface NewsletterFormProps {
  fuente?: string;
}

export default function NewsletterForm({ fuente = 'web' }: NewsletterFormProps) {
  const [email, setEmail] = useState('');
  const [nombre, setNombre] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email) return;
    setLoading(true);
    setError('');
    try {
      await api.post('/api/newsletter/suscribir', { email, nombre: nombre || undefined, fuente });
      setSuccess(true);
      setEmail('');
      setNombre('');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error al suscribirte');
    } finally {
      setLoading(false);
    }
  }

  if (success) {
    return (
      <div className="text-center py-4">
        <div className="w-8 h-px bg-sand mx-auto mb-3" />
        <p className="text-tierra text-sm">¡Gracias por suscribirte!</p>
        <p className="text-tierra-light text-xs mt-1">Te mantendremos al tanto de nuestras novedades.</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div>
        <label className="label-wellness">Nombre (opcional)</label>
        <input
          type="text"
          value={nombre}
          onChange={e => setNombre(e.target.value)}
          placeholder="Tu nombre"
          className="input-wellness"
        />
      </div>
      <div>
        <label className="label-wellness">Email</label>
        <input
          type="email"
          value={email}
          onChange={e => setEmail(e.target.value)}
          placeholder="tu@email.com"
          required
          className="input-wellness"
        />
      </div>
      {error && <p className="text-red-400 text-xs">{error}</p>}
      <button
        type="submit"
        disabled={loading || !email}
        className="btn-primary w-full disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {loading ? 'Suscribiendo...' : 'Suscribirme'}
      </button>
    </form>
  );
}
