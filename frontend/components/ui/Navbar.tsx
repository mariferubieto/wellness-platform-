'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { createSupabaseClient } from '@/lib/supabase';
import { api } from '@/lib/api';

const NAV_ITEMS = [
  {
    label: 'Shala',
    href: '/shala',
    style: { fontFamily: 'var(--font-playfair)', fontWeight: 700, fontSize: '1rem', letterSpacing: '0.05em', textTransform: 'uppercase' as const },
  },
  {
    label: 'Ayurveda',
    href: '/ayurveda',
    style: { fontFamily: 'var(--font-cormorant)', fontWeight: 400, fontStyle: 'italic', fontSize: '1.05rem', letterSpacing: '0.02em' },
  },
  {
    label: 'Retiros · Eventos',
    href: '/retiros',
    activeHrefs: ['/retiros', '/eventos'],
    style: { fontFamily: 'var(--font-raleway)', fontWeight: 500, fontSize: '0.8rem', letterSpacing: '0.15em', textTransform: 'uppercase' as const },
  },
  {
    label: 'Biblioteca',
    href: '/contenido',
    style: { fontFamily: 'var(--font-eb-garamond)', fontWeight: 400, fontSize: '1rem', letterSpacing: '0.04em' },
  },
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

  const isActive = (item: typeof NAV_ITEMS[0]) => {
    const hrefs = 'activeHrefs' in item ? item.activeHrefs! : [item.href];
    return hrefs.some(h => pathname.startsWith(h));
  };

  return (
    <header className="sticky top-0 z-50 bg-beige border-b border-sand/40">
      <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between gap-6">
        {/* Logo */}
        <Link href="/shala" className="text-sm tracking-[0.2em] uppercase text-tierra font-medium shrink-0">
          Wellness
        </Link>

        {/* Desktop nav */}
        <nav className="hidden md:flex items-center gap-6">
          {NAV_ITEMS.map(item => (
            <Link
              key={item.href}
              href={item.href}
              style={item.style}
              className={`transition-colors pb-0.5 ${
                isActive(item)
                  ? 'text-tierra border-b border-sand'
                  : 'text-tierra-light hover:text-tierra'
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

        {/* Perfil */}
        <Link
          href="/perfil"
          className={`hidden md:block text-xs tracking-widest uppercase transition-colors shrink-0 ${
            pathname.startsWith('/perfil') ? 'text-tierra font-medium' : 'text-tierra-light hover:text-tierra'
          }`}
        >
          Mi perfil
        </Link>

        {/* Mobile hamburger */}
        <button
          className="md:hidden ml-auto text-tierra-light"
          onClick={() => setMenuOpen(prev => !prev)}
          aria-label="Menú"
        >
          <span className="text-lg">{menuOpen ? '✕' : '☰'}</span>
        </button>
      </div>

      {/* Mobile menu */}
      {menuOpen && (
        <div className="md:hidden bg-beige border-t border-sand/40 px-4 py-4 flex flex-col gap-4">
          {NAV_ITEMS.map(item => (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setMenuOpen(false)}
              style={item.style}
              className={`py-1 transition-colors ${isActive(item) ? 'text-tierra' : 'text-tierra-light'}`}
            >
              {item.label}
            </Link>
          ))}
          {rol === 'admin' && (
            <Link
              href="/admin"
              onClick={() => setMenuOpen(false)}
              className="text-xs tracking-widest uppercase py-1 text-tierra-light"
            >
              Admin
            </Link>
          )}
          <Link
            href="/perfil"
            onClick={() => setMenuOpen(false)}
            className="text-xs tracking-widest uppercase py-1 text-tierra-light"
          >
            Mi perfil
          </Link>
        </div>
      )}
    </header>
  );
}
