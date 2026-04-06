'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { api } from '@/lib/api';

interface UserProfile {
  rol: string;
  nombre: string;
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [loading, setLoading] = useState(true);
  const [authorized, setAuthorized] = useState(false);
  const [adminNombre, setAdminNombre] = useState('');

  useEffect(() => {
    async function checkAdmin() {
      try {
        const profile = await api.get<UserProfile>('/api/auth/me');
        if (profile.rol !== 'admin') {
          router.push('/perfil');
          return;
        }
        setAdminNombre(profile.nombre);
        setAuthorized(true);
      } catch {
        router.push('/login');
      } finally {
        setLoading(false);
      }
    }
    checkAdmin();
  }, [router]);

  if (loading || !authorized) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-tierra-light text-sm tracking-widest uppercase">Cargando...</p>
      </div>
    );
  }

  const navLinks = [
    { href: '/admin', label: 'Dashboard' },
    { href: '/admin/crm', label: 'CRM' },
    { href: '/admin/shala', label: 'SHALA' },
    { href: '/admin/shala/alumnos', label: '↳ Alumnos' },
    { href: '/admin/ayurveda', label: 'AYURVEDA' },
    { href: '/admin/marifer', label: 'MARIFER' },
  ];

  return (
    <div className="min-h-screen flex">
      <aside className="w-56 bg-white border-r border-beige-lino flex flex-col">
        <div className="p-6 border-b border-beige-lino">
          <div className="w-6 h-px bg-sand mb-3" />
          <p className="text-xs tracking-widest uppercase text-tierra-light">Admin</p>
          <p className="text-sm text-tierra mt-1">{adminNombre}</p>
        </div>
        <nav className="flex-1 p-4">
          <ul className="space-y-1">
            {navLinks.map(link => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  className={`block px-4 py-2 text-xs tracking-widest uppercase rounded-wellness transition-colors ${
                    pathname === link.href
                      ? 'bg-sage-muted text-sage'
                      : 'text-tierra-light hover:text-tierra'
                  }`}
                >
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </aside>
      <main className="flex-1 bg-beige p-8 overflow-auto">
        {children}
      </main>
    </div>
  );
}
