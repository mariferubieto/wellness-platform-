'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createSupabaseClient } from '@/lib/supabase';
import { api } from '@/lib/api';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';

export default function RegistroPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    nombre: '',
    email: '',
    password: '',
    telefono: '',
    fecha_nacimiento: '',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
  }

  async function handleRegistro(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await api.post('/api/auth/register', {
        ...form,
        fuente: 'directo',
      });

      const supabase = createSupabaseClient();
      const { error: authError } = await supabase.auth.signInWithPassword({
        email: form.email,
        password: form.password,
      });

      if (authError) throw new Error('Error al iniciar sesión automáticamente');

      router.push('/perfil');
      router.refresh();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error al registrarse');
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <div className="text-center mb-10">
          <div className="w-12 h-px bg-sand mx-auto mb-6" />
          <h1 className="text-3xl text-tierra mb-2">Crear cuenta</h1>
          <p className="text-tierra-light text-sm">Únete a nuestra comunidad</p>
        </div>
        <form onSubmit={handleRegistro} className="space-y-5">
          <Input
            label="Nombre completo"
            name="nombre"
            value={form.nombre}
            onChange={handleChange}
            placeholder="Tu nombre"
            required
          />
          <Input
            label="Email"
            type="email"
            name="email"
            value={form.email}
            onChange={handleChange}
            placeholder="tu@email.com"
            required
          />
          <Input
            label="Contraseña"
            type="password"
            name="password"
            value={form.password}
            onChange={handleChange}
            placeholder="Mínimo 8 caracteres"
            required
            minLength={8}
          />
          <Input
            label="Teléfono"
            type="tel"
            name="telefono"
            value={form.telefono}
            onChange={handleChange}
            placeholder="55 1234 5678"
          />
          <Input
            label="Fecha de nacimiento"
            type="date"
            name="fecha_nacimiento"
            value={form.fecha_nacimiento}
            onChange={handleChange}
          />
          {error && (
            <p className="text-red-500 text-sm text-center">{error}</p>
          )}
          <Button type="submit" loading={loading} className="w-full">
            Crear cuenta
          </Button>
        </form>
        <p className="mt-8 text-center text-sm text-tierra-light">
          ¿Ya tienes cuenta?{' '}
          <Link href="/login" className="text-sage hover:underline">
            Inicia sesión
          </Link>
        </p>
      </div>
    </div>
  );
}
