'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { createSupabaseClient } from '@/lib/supabase';
import { api } from '@/lib/api';

const NAV_ITEMS = [
  { label: 'Shala', href: '/shala' },
  { label: 'Ayurveda', href: '/ayurveda' },
  { label: 'Retiros', href: '/retiros' },
  { label: 'Eventos', href: '/eventos' },
  { label: 'Biblioteca', href: '/contenido' },
];

const HIDDEN_PATHS = ['/login', '/registro', '/primer-acceso'];

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

  const isActive = (href: string) => pathname.startsWith(href);

  return (
    <header className="sticky top-0 z-50 bg-beige border-b border-sand/40">
      <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
        {/* Logo */}
        <Link href="/shala" className="text-sm tracking-[0.2em] uppercase text-tierra font-medium">
          Wellness
        </Link>

        {/* Desktop nav */}
        <nav className="hidden md:flex items-center gap-1">
          {NAV_ITEMS.map(item => (
            <Link
              key={item.href}
              href={item.href}
              className={`px-4 py-1.5 text-xs tracking-widest uppercase transition-colors rounded-sm ${
                isActive(item.href)
                  ? 'text-tierra bg-sand/40 font-medium'
                  : 'text-tierra-light hover:text-tierra'
              }`}
            >
              {item.label}
            </Link>
          ))}
          {rol === 'admin' && (
            <Link
              href="/admin"
              className={`px-4 py-1.5 text-xs tracking-widest uppercase transition-colors rounded-sm ${
                isActive('/admin')
                  ? 'text-tierra bg-sand/40 font-medium'
                  : 'text-tierra-light hover:text-tierra'
              }`}
            >
              Admin
            </Link>
          )}
        </nav>

        {/* Perfil */}
        <Link
          href="/perfil"
          className={`text-xs tracking-widest uppercase transition-colors ${
            isActive('/perfil') ? 'text-tierra font-medium' : 'text-tierra-light hover:text-tierra'
          }`}
        >
          Mi perfil
        </Link>

        {/* Mobile hamburger */}
        <button
          className="md:hidden ml-4 text-tierra-light"
          onClick={() => setMenuOpen(prev => !prev)}
          aria-label="Menú"
        >
          <span className="text-lg">{menuOpen ? '✕' : '☰'}</span>
        </button>
      </div>

      {/* Mobile menu */}
      {menuOpen && (
        <div className="md:hidden bg-beige border-t border-sand/40 px-4 py-3 flex flex-col gap-2">
          {NAV_ITEMS.map(item => (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setMenuOpen(false)}
              className={`text-xs tracking-widest uppercase py-2 transition-colors ${
                isActive(item.href) ? 'text-tierra font-medium' : 'text-tierra-light'
              }`}
            >
              {item.label}
            </Link>
          ))}
          {rol === 'admin' && (
            <Link
              href="/admin"
              onClick={() => setMenuOpen(false)}
              className="text-xs tracking-widest uppercase py-2 text-tierra-light"
            >
              Admin
            </Link>
          )}
          <Link
            href="/perfil"
            onClick={() => setMenuOpen(false)}
            className="text-xs tracking-widest uppercase py-2 text-tierra-light"
          >
            Mi perfil
          </Link>
        </div>
      )}
    </header>
  );
}
