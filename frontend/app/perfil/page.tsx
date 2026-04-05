'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createSupabaseClient } from '@/lib/supabase';
import { api } from '@/lib/api';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';

interface UserProfile {
  id: string;
  nombre: string;
  email: string;
  telefono?: string;
  fecha_nacimiento?: string;
  rol: string;
  tags: string[];
}

export default function PerfilPage() {
  const router = useRouter();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [editando, setEditando] = useState(false);
  const [form, setForm] = useState({ nombre: '', telefono: '', fecha_nacimiento: '' });
  const [loading, setLoading] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [mensaje, setMensaje] = useState('');

  useEffect(() => {
    async function loadProfile() {
      try {
        const data = await api.get<UserProfile>('/api/auth/me');
        setProfile(data);
        setForm({
          nombre: data.nombre,
          telefono: data.telefono ?? '',
          fecha_nacimiento: data.fecha_nacimiento ?? '',
        });
      } catch {
        router.push('/login');
      } finally {
        setLoading(false);
      }
    }
    loadProfile();
  }, [router]);

  async function handleGuardar(e: React.FormEvent) {
    e.preventDefault();
    if (!profile) return;
    setGuardando(true);

    try {
      const updated = await api.patch<UserProfile>(`/api/users/${profile.id}`, form);
      setProfile(updated);
      setEditando(false);
      setMensaje('Perfil actualizado correctamente');
      setTimeout(() => setMensaje(''), 3000);
    } catch (err: unknown) {
      setMensaje(err instanceof Error ? err.message : 'Error al guardar');
    } finally {
      setGuardando(false);
    }
  }

  async function handleLogout() {
    const supabase = createSupabaseClient();
    await supabase.auth.signOut();
    router.push('/login');
    router.refresh();
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-tierra-light text-sm tracking-widest uppercase">Cargando...</p>
      </div>
    );
  }

  if (!profile) return null;

  return (
    <div className="min-h-screen px-4 py-12">
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center justify-between mb-10">
          <div>
            <div className="w-8 h-px bg-sand mb-4" />
            <h1 className="text-3xl text-tierra">Mi perfil</h1>
          </div>
          <button
            onClick={handleLogout}
            className="text-xs tracking-widest uppercase text-tierra-light hover:text-sage transition-colors"
          >
            Cerrar sesión
          </button>
        </div>

        {mensaje && (
          <div className="mb-6 p-4 bg-sage-muted border border-sage text-sage text-sm rounded-wellness">
            {mensaje}
          </div>
        )}

        <div className="card-wellness">
          {!editando ? (
            <div className="space-y-6">
              <div>
                <p className="label-wellness">Nombre</p>
                <p className="text-tierra">{profile.nombre}</p>
              </div>
              <div>
                <p className="label-wellness">Email</p>
                <p className="text-tierra">{profile.email}</p>
              </div>
              {profile.telefono && (
                <div>
                  <p className="label-wellness">Teléfono</p>
                  <p className="text-tierra">{profile.telefono}</p>
                </div>
              )}
              {profile.fecha_nacimiento && (
                <div>
                  <p className="label-wellness">Fecha de nacimiento</p>
                  <p className="text-tierra">
                    {new Date(profile.fecha_nacimiento + 'T00:00:00').toLocaleDateString('es-MX', {
                      year: 'numeric', month: 'long', day: 'numeric'
                    })}
                  </p>
                </div>
              )}
              {profile.tags.length > 0 && (
                <div>
                  <p className="label-wellness">Intereses</p>
                  <div className="flex flex-wrap gap-2 mt-1">
                    {profile.tags.map(tag => (
                      <span key={tag} className="bg-sage-muted text-sage text-xs px-3 py-1 rounded-full">
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              <Button variant="secondary" onClick={() => setEditando(true)}>
                Editar perfil
              </Button>
            </div>
          ) : (
            <form onSubmit={handleGuardar} className="space-y-5">
              <Input
                label="Nombre completo"
                value={form.nombre}
                onChange={e => setForm(prev => ({ ...prev, nombre: e.target.value }))}
                required
              />
              <Input
                label="Teléfono"
                type="tel"
                value={form.telefono}
                onChange={e => setForm(prev => ({ ...prev, telefono: e.target.value }))}
              />
              <Input
                label="Fecha de nacimiento"
                type="date"
                value={form.fecha_nacimiento}
                onChange={e => setForm(prev => ({ ...prev, fecha_nacimiento: e.target.value }))}
              />
              <div className="flex gap-3">
                <Button type="submit" loading={guardando}>Guardar</Button>
                <Button type="button" variant="secondary" onClick={() => setEditando(false)}>
                  Cancelar
                </Button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
