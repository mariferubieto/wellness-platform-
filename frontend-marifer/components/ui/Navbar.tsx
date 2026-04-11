'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { createSupabaseClient } from '@/lib/supabase';
import { api } from '@/lib/api';

const SHALA_URL = process.env.NEXT_PUBLIC_SHALA_URL || 'https://shalayoga.com';

const NAV_ITEMS = [
  {
    label: 'Retiros',
    href: '/retiros',
    style: { fontFamily: 'var(--font-fredoka)', fontWeight: 400, fontSize: '0.95rem', letterSpacing: '0.05em' },
  },
  {
    label: 'Ayurveda',
    href: '/ayurveda',
    style: { fontFamily: 'var(--font-josefin)', fontWeight: 300, fontSize: '0.85rem', letterSpacing: '0.35em', textTransform: 'uppercase' as const },
  },
  {
    label: 'Biblioteca',
    href: '/contenido',
    style: { fontFamily: 'var(--font-eb-garamond)', fontWeight: 400, fontSize: '1rem', letterSpacing: '0.04em' },
  },
  {
    label: 'Eventos',
    href: '/eventos',
    style: { fontFamily: 'var(--font-josefin)', fontWeight: 300, fontSize: '0.85rem', letterSpacing: '0.2em', textTransform: 'uppercase' as const },
  },
];

const HIDDEN_PATHS = ['/login', '/primer-acceso'];

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
    <header className="sticky top-0 z-50 bg-beige/95 backdrop-blur-sm border-b border-sand/30">
      <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between gap-6">
        <Link href="/" className="shrink-0 text-tierra tracking-[0.15em] uppercase text-sm font-medium">
          Marifer
        </Link>

        <nav className="hidden md:flex items-center gap-8">
          {NAV_ITEMS.map(item => (
            <Link
              key={item.href}
              href={item.href}
              style={item.style}
              className={`transition-colors pb-0.5 ${
                pathname.startsWith(item.href)
                  ? 'text-tierra border-b border-sand'
                  : 'text-tierra-light hover:text-tierra'
              }`}
            >
              {item.label}
            </Link>
          ))}
          <a
            href={SHALA_URL}
            target="_blank"
            rel="noopener noreferrer"
            style={{ fontFamily: 'var(--font-playfair)', fontWeight: 900, fontSize: '1rem', letterSpacing: '0.06em', textTransform: 'uppercase' }}
            className="text-tierra-light hover:text-tierra transition-colors flex items-center gap-1"
          >
            Shala <span className="text-xs">↗</span>
          </a>
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

        <button
          className="md:hidden ml-auto text-tierra-light p-1"
          onClick={() => setMenuOpen(prev => !prev)}
          aria-label="Menú"
        >
          <span className="text-lg">{menuOpen ? '✕' : '☰'}</span>
        </button>
      </div>

      {menuOpen && (
        <div className="md:hidden bg-beige border-t border-sand/30 px-6 py-5 flex flex-col gap-5">
          {NAV_ITEMS.map(item => (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setMenuOpen(false)}
              style={item.style}
              className={`py-0.5 transition-colors ${pathname.startsWith(item.href) ? 'text-tierra' : 'text-tierra-light'}`}
            >
              {item.label}
            </Link>
          ))}
          <a
            href={SHALA_URL}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => setMenuOpen(false)}
            className="text-tierra-light py-0.5"
            style={{ fontFamily: 'var(--font-playfair)', fontWeight: 900, letterSpacing: '0.06em' }}
          >
            Shala ↗
          </a>
          {rol === 'admin' && (
            <Link href="/admin" onClick={() => setMenuOpen(false)} className="text-xs tracking-widest uppercase py-0.5 text-tierra-light">Admin</Link>
          )}
        </div>
      )}
    </header>
  );
}
