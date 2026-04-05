'use client';

import { useState } from 'react';
import Link from 'next/link';
import { createSupabaseClient } from '@/lib/supabase';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';

export default function PrimerAccesoPage() {
  const [email, setEmail] = useState('');
  const [enviado, setEnviado] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    const supabase = createSupabaseClient();
    await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/actualizar-contrasena`,
    });

    setEnviado(true);
    setLoading(false);
  }

  if (enviado) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="w-full max-w-md text-center">
          <div className="w-12 h-px bg-sage mx-auto mb-6" />
          <h1 className="text-2xl text-tierra mb-4">Revisa tu email</h1>
          <p className="text-tierra-light text-sm leading-relaxed">
            Si tu email está registrado en nuestra plataforma, recibirás un enlace
            para crear tu contraseña. Revisa también tu carpeta de spam.
          </p>
          <Link href="/login" className="inline-block mt-8 text-sage text-sm hover:underline">
            Volver al inicio de sesión
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-10">
          <div className="w-12 h-px bg-sand mx-auto mb-6" />
          <h1 className="text-3xl text-tierra mb-2">Primer acceso</h1>
          <p className="text-tierra-light text-sm">
            Si eras alumna en Nessty, tu cuenta ya existe.
            Ingresa tu email para crear una contraseña.
          </p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-5">
          <Input
            label="Tu email"
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="el mismo que usabas en Nessty"
            required
          />
          <Button type="submit" loading={loading} className="w-full">
            Enviar enlace
          </Button>
        </form>
      </div>
    </div>
  );
}
