'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { createSupabaseClient } from '@/lib/supabase';
import { api } from '@/lib/api';

const NAV_ITEMS = [
  { label: 'Calendario', href: '/shala/calendario' },
  { label: 'Mis Reservas', href: '/mis-reservas' },
  { label: 'Mis Paquetes', href: '/shala/mis-paquetes' },
];

const HIDDEN_PATHS = ['/login', '/registro'];

export default function Navbar() {
  const pathname = usePathname();
  const [rol, setRol] = useState<string | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const supabase = createSupabaseClient();
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) return;
      api.get<{ rol: string }>('/api/auth/me').then(p => setRol(p.rol)).catch(() => {});
    });
  }, []);

  if (HIDDEN_PATHS.includes(pathname)) return null;

  return (
    <header className="sticky top-0 z-50 bg-beige border-b border-sand/40">
      <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between gap-6">
        <Link
          href="/calendario"
          className="text-sm tracking-[0.2em] uppercase text-tierra font-medium shrink-0"
          style={{ fontFamily: 'var(--font-playfair)', fontWeight: 900, fontSize: '1.05rem', letterSpacing: '0.08em' }}
        >
          Shala
        </Link>

        <nav className="hidden md:flex items-center gap-7">
          {NAV_ITEMS.map(item => (
            <Link
              key={item.href}
              href={item.href}
              className={`text-xs tracking-widest uppercase transition-colors ${
                pathname.startsWith(item.href) ? 'text-tierra border-b border-sand' : 'text-tierra-light hover:text-tierra'
              }`}
            >
              {item.label}
            </Link>
          ))}
          {rol === 'admin' && (
            <Link
              href="/admin"
              className={`text-xs tracking-widest uppercase transition-colors ${
                pathname.startsWith('/admin') ? 'text-tierra font-medium' : 'text-tierra-light hover:text-tierra'
              }`}
            >
              Admin
            </Link>
          )}
        </nav>

        <Link
          href="/perfil"
          className={`hidden md:block text-xs tracking-widest uppercase transition-colors shrink-0 ${
            pathname.startsWith('/perfil') ? 'text-tierra font-medium' : 'text-tierra-light hover:text-tierra'
          }`}
        >
          Mi perfil
        </Link>

        <button
          className="md:hidden ml-auto text-tierra-light"
          onClick={() => setMenuOpen(prev => !prev)}
          aria-label="Menú"
        >
          <span className="text-lg">{menuOpen ? '✕' : '☰'}</span>
        </button>
      </div>

      {menuOpen && (
        <div className="md:hidden bg-beige border-t border-sand/40 px-4 py-4 flex flex-col gap-4">
          {NAV_ITEMS.map(item => (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setMenuOpen(false)}
              className={`text-xs tracking-widest uppercase py-1 transition-colors ${
                pathname.startsWith(item.href) ? 'text-tierra' : 'text-tierra-light'
              }`}
            >
              {item.label}
            </Link>
          ))}
          {rol === 'admin' && (
            <Link href="/admin" onClick={() => setMenuOpen(false)} className="text-xs tracking-widest uppercase py-1 text-tierra-light">Admin</Link>
          )}
          <Link href="/perfil" onClick={() => setMenuOpen(false)} className="text-xs tracking-widest uppercase py-1 text-tierra-light">Mi perfil</Link>
        </div>
      )}
    </header>
  );
}
