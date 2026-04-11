# Multi-Site Restructure Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Split the current monolithic `frontend/` into two independent Next.js apps — `frontend-shala/` (shalayoga.com) and `frontend-marifer/` (marifer.com) — while keeping one shared backend on Render.

**Architecture:** Copy the existing `frontend/` to `frontend-shala/` and strip Marifer routes; scaffold `frontend-marifer/` fresh with `create-next-app` and migrate brand/content routes into it. Both apps share the same Supabase project and Render backend. Backend CORS is updated to accept both domains.

**Tech Stack:** Next.js 14 (App Router), Supabase Auth, Tailwind CSS, Express (shared backend), Vercel (two separate projects)

---

## File Map

### Created
- `frontend-shala/` — copy of current `frontend/`, Marifer routes removed
- `frontend-marifer/` — new Next.js app with Marifer routes migrated in
- `frontend-marifer/app/page.tsx` — Marifer landing page
- `frontend-marifer/app/layout.tsx` — Marifer root layout with fonts and Navbar
- `frontend-marifer/middleware.ts` — protects only `/admin`
- `frontend-marifer/components/ui/Navbar.tsx` — Marifer navbar with external Shala link
- `frontend-marifer/components/ui/LeadPopup.tsx` — "Únete a la comunidad" popup
- `backend/src/routes/leads.ts` — POST /api/leads endpoint
- `database/migrations/008_comunidad_leads.sql`

### Modified
- `frontend-shala/package.json` — name → `frontend-shala`
- `frontend-shala/components/ui/Navbar.tsx` — Shala-specific nav
- `frontend-shala/middleware.ts` — Shala protected paths
- `frontend-shala/app/admin/layout.tsx` — only Shala admin links
- `backend/src/app.ts` — CORS multi-origin support
- `backend/.env` — ALLOWED_ORIGINS variable
- `package.json` (root) — workspaces updated

### Deleted from frontend-shala/
- `app/ayurveda/`
- `app/retiros/`
- `app/contenido/`
- `app/eventos/`
- `app/(auth)/primer-acceso/`
- `components/ayurveda/`
- `components/contenido/`
- `components/marifer/`

---

## Task 1: Copy frontend/ to frontend-shala/

**Files:**
- Create: `frontend-shala/` (copy of `frontend/`)

- [ ] **Step 1: Copy directory**

```bash
cp -r /Users/mariferubieto/Desktop/wellness-platform/frontend /Users/mariferubieto/Desktop/wellness-platform/frontend-shala
```

- [ ] **Step 2: Update package name**

Open `frontend-shala/package.json` and change `"name": "frontend"` to `"name": "frontend-shala"`.

```json
{
  "name": "frontend-shala",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "next dev --port 3001",
    "build": "next build",
    "start": "next start",
    "lint": "next lint"
  },
  "dependencies": {
    "@supabase/ssr": "^0.10.0",
    "@supabase/supabase-js": "^2.101.1",
    "@tanstack/react-query": "^5.96.2",
    "next": "14.2.35",
    "react": "^18",
    "react-dom": "^18"
  },
  "devDependencies": {
    "@types/node": "^20",
    "@types/react": "^18",
    "@types/react-dom": "^18",
    "postcss": "^8",
    "tailwindcss": "^3.4.1",
    "typescript": "^5"
  }
}
```

- [ ] **Step 3: Delete node_modules and reinstall**

```bash
cd /Users/mariferubieto/Desktop/wellness-platform/frontend-shala
rm -rf node_modules .next
npm install
```

- [ ] **Step 4: Verify dev server starts**

```bash
npm run dev
```

Expected: `ready on http://localhost:3001` (no errors)

- [ ] **Step 5: Commit**

```bash
cd /Users/mariferubieto/Desktop/wellness-platform
git add frontend-shala/
git commit -m "feat: scaffold frontend-shala from existing frontend"
```

---

## Task 2: Clean frontend-shala/ — remove Marifer routes and components

**Files:**
- Delete: `frontend-shala/app/ayurveda/`
- Delete: `frontend-shala/app/retiros/`
- Delete: `frontend-shala/app/contenido/`
- Delete: `frontend-shala/app/eventos/`
- Delete: `frontend-shala/app/(auth)/primer-acceso/`
- Delete: `frontend-shala/components/ayurveda/`
- Delete: `frontend-shala/components/contenido/`
- Delete: `frontend-shala/components/marifer/`
- Modify: `frontend-shala/components/ui/Navbar.tsx`
- Modify: `frontend-shala/middleware.ts`
- Modify: `frontend-shala/app/admin/layout.tsx`
- Modify: `frontend-shala/app/page.tsx`

- [ ] **Step 1: Delete Marifer-specific route directories**

```bash
cd /Users/mariferubieto/Desktop/wellness-platform/frontend-shala
rm -rf app/ayurveda app/retiros app/contenido app/eventos
rm -rf "app/(auth)/primer-acceso"
rm -rf components/ayurveda components/contenido components/marifer
```

- [ ] **Step 2: Replace root page.tsx — redirect to /calendario**

Replace `frontend-shala/app/page.tsx` with:

```tsx
import { redirect } from 'next/navigation';

export default function Home() {
  redirect('/calendario');
}
```

- [ ] **Step 3: Replace Navbar with Shala-specific version**

Replace `frontend-shala/components/ui/Navbar.tsx` with:

```tsx
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { createSupabaseClient } from '@/lib/supabase';
import { api } from '@/lib/api';

const NAV_ITEMS = [
  { label: 'Calendario', href: '/calendario' },
  { label: 'Mis Paquetes', href: '/mis-paquetes' },
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
```

- [ ] **Step 4: Update middleware.ts for Shala paths**

Replace `frontend-shala/middleware.ts` with:

```ts
import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
  const response = NextResponse.next();

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return request.cookies.getAll(); },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            request.cookies.set(name, value);
            response.cookies.set(name, value, options);
          });
        },
      },
    }
  );

  const { data: { user } } = await supabase.auth.getUser();
  const path = request.nextUrl.pathname;

  const protectedPaths = ['/perfil', '/mis-paquetes', '/admin'];
  if (protectedPaths.some(p => path.startsWith(p)) && !user) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  if ((path === '/login' || path === '/registro') && user) {
    return NextResponse.redirect(new URL('/calendario', request.url));
  }

  return response;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.png$).*)'],
};
```

- [ ] **Step 5: Update admin layout — Shala-only links**

Replace `frontend-shala/app/admin/layout.tsx` with:

```tsx
'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { api } from '@/lib/api';

interface UserProfile { rol: string; nombre: string; }

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [loading, setLoading] = useState(true);
  const [authorized, setAuthorized] = useState(false);
  const [adminNombre, setAdminNombre] = useState('');

  useEffect(() => {
    api.get<UserProfile>('/api/auth/me')
      .then(profile => {
        if (profile.rol !== 'admin') { router.push('/perfil'); return; }
        setAdminNombre(profile.nombre);
        setAuthorized(true);
      })
      .catch(() => router.push('/login'))
      .finally(() => setLoading(false));
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
    { href: '/admin/shala', label: 'CLASES Y PAQUETES' },
    { href: '/admin/codigos', label: 'CÓDIGOS PROMO' },
  ];

  return (
    <div className="min-h-screen flex">
      <aside className="w-56 bg-white border-r border-beige-lino flex flex-col">
        <div className="p-6 border-b border-beige-lino">
          <div className="w-6 h-px bg-sand mb-3" />
          <p className="text-xs tracking-widest uppercase text-tierra-light">Admin · Shala</p>
          <p className="text-sm text-tierra mt-1">{adminNombre}</p>
        </div>
        <nav className="flex-1 p-4">
          <ul className="space-y-1">
            {navLinks.map(link => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  className={`block px-4 py-2 text-xs tracking-widest uppercase rounded-wellness transition-colors ${
                    pathname === link.href ? 'bg-sage-muted text-sage' : 'text-tierra-light hover:text-tierra'
                  }`}
                >
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </aside>
      <main className="flex-1 bg-beige p-8 overflow-auto">{children}</main>
    </div>
  );
}
```

- [ ] **Step 6: Verify build compiles cleanly**

```bash
cd /Users/mariferubieto/Desktop/wellness-platform/frontend-shala
npm run build
```

Expected: Build succeeds with no TypeScript or import errors.

- [ ] **Step 7: Commit**

```bash
cd /Users/mariferubieto/Desktop/wellness-platform
git add frontend-shala/
git commit -m "feat: clean frontend-shala — remove marifer routes, update navbar and middleware"
```

---

## Task 3: Scaffold frontend-marifer/ — new Next.js app with design system

**Files:**
- Create: `frontend-marifer/` (new Next.js app)
- Create: `frontend-marifer/tailwind.config.ts`
- Create: `frontend-marifer/app/globals.css`
- Create: `frontend-marifer/lib/api.ts`
- Create: `frontend-marifer/lib/supabase.ts`
- Create: `frontend-marifer/components/ui/Button.tsx`
- Create: `frontend-marifer/components/ui/Input.tsx`
- Create: `frontend-marifer/components/ui/FotoUpload.tsx`
- Create: `frontend-marifer/next.config.mjs`

- [ ] **Step 1: Create new Next.js app**

```bash
cd /Users/mariferubieto/Desktop/wellness-platform
npx create-next-app@14 frontend-marifer --typescript --tailwind --app --no-src-dir --import-alias "@/*" --no-eslint
```

When prompted, answer:
- Would you like to use Turbopack? → No

- [ ] **Step 2: Replace tailwind.config.ts with wellness design tokens**

Replace `frontend-marifer/tailwind.config.ts` with:

```ts
import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        beige: {
          DEFAULT: '#F9F5EF',
          light: '#FDFAF6',
          lino: '#E8DDD0',
        },
        sage: {
          DEFAULT: '#7A9A78',
          light: '#8DAA8B',
          muted: '#EAF0E7',
        },
        sand: {
          DEFAULT: '#C4A882',
          light: '#E5D5C0',
        },
        tierra: {
          DEFAULT: '#2C2418',
          mid: '#5A4A38',
          light: '#9A8A75',
        },
      },
      fontFamily: {
        serif: ['Georgia', 'Times New Roman', 'serif'],
        sans: ['Helvetica Neue', 'Arial', 'sans-serif'],
      },
      borderRadius: {
        wellness: '2px',
      },
    },
  },
  plugins: [],
};

export default config;
```

- [ ] **Step 3: Replace globals.css with wellness utility classes**

Replace `frontend-marifer/app/globals.css` with:

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  html {
    font-family: 'Helvetica Neue', Arial, sans-serif;
    -webkit-font-smoothing: antialiased;
  }
  body {
    background-color: #F9F5EF;
    color: #2C2418;
  }
  h1, h2, h3, h4 {
    font-family: Georgia, serif;
    font-weight: 400;
  }
}

@layer components {
  .btn-wellness {
    @apply bg-sage text-white px-6 py-3 text-xs tracking-widest uppercase
           rounded-wellness border border-sage hover:bg-sage-light
           transition-colors duration-200 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed;
  }
  .btn-primary {
    @apply bg-sage text-white px-6 py-3 text-xs tracking-widest uppercase
           rounded-wellness border border-sage hover:bg-sage-light
           transition-colors duration-200 cursor-pointer;
  }
  .btn-secondary {
    @apply bg-transparent text-tierra-mid px-6 py-3 text-xs tracking-widest
           uppercase rounded-wellness border border-sand
           hover:border-sage hover:text-sage transition-colors duration-200 cursor-pointer;
  }
  .input-wellness {
    @apply w-full px-4 py-3 bg-white border border-beige-lino rounded-wellness
           text-tierra text-sm placeholder:text-tierra-light
           focus:outline-none focus:border-sage transition-colors duration-200;
  }
  .label-wellness {
    @apply text-xs tracking-widest uppercase text-tierra-light block mb-2;
  }
  .card-wellness {
    @apply bg-white border border-beige-lino rounded-wellness p-6
           hover:border-sage transition-colors duration-200;
  }
}
```

- [ ] **Step 4: Replace next.config.mjs**

Replace `frontend-marifer/next.config.mjs` with:

```mjs
/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*.supabase.co',
      },
    ],
  },
};

export default nextConfig;
```

- [ ] **Step 5: Create lib/api.ts**

Create `frontend-marifer/lib/api.ts`:

```ts
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

async function getToken(): Promise<string | null> {
  const { createSupabaseClient } = await import('./supabase');
  const supabase = createSupabaseClient();
  const { data: { session } } = await supabase.auth.getSession();
  return session?.access_token ?? null;
}

export async function apiRequest<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = await getToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const res = await fetch(`${API_URL}${path}`, { ...options, headers });
  if (!res.ok) {
    const error = await res.json().catch(() => ({ error: 'Error de red' }));
    throw new Error(error.error || `Error ${res.status}`);
  }
  return res.json();
}

export const api = {
  get: <T>(path: string) => apiRequest<T>(path),
  post: <T>(path: string, body: unknown) => apiRequest<T>(path, { method: 'POST', body: JSON.stringify(body) }),
  patch: <T>(path: string, body: unknown) => apiRequest<T>(path, { method: 'PATCH', body: JSON.stringify(body) }),
  delete: <T>(path: string) => apiRequest<T>(path, { method: 'DELETE' }),
};
```

- [ ] **Step 6: Create lib/supabase.ts**

Create `frontend-marifer/lib/supabase.ts`:

```ts
import { createBrowserClient } from '@supabase/ssr';

export function createSupabaseClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
```

- [ ] **Step 7: Install Supabase dependencies**

```bash
cd /Users/mariferubieto/Desktop/wellness-platform/frontend-marifer
npm install @supabase/supabase-js @supabase/ssr
```

- [ ] **Step 8: Copy UI components from frontend-shala**

```bash
mkdir -p /Users/mariferubieto/Desktop/wellness-platform/frontend-marifer/components/ui
cp /Users/mariferubieto/Desktop/wellness-platform/frontend-shala/components/ui/Button.tsx \
   /Users/mariferubieto/Desktop/wellness-platform/frontend-marifer/components/ui/
cp /Users/mariferubieto/Desktop/wellness-platform/frontend-shala/components/ui/Input.tsx \
   /Users/mariferubieto/Desktop/wellness-platform/frontend-marifer/components/ui/
cp /Users/mariferubieto/Desktop/wellness-platform/frontend-shala/components/ui/FotoUpload.tsx \
   /Users/mariferubieto/Desktop/wellness-platform/frontend-marifer/components/ui/
```

- [ ] **Step 9: Update package.json — name and dev port**

In `frontend-marifer/package.json`, update the `name` and `dev` script:

```json
{
  "name": "frontend-marifer",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "next dev --port 3002",
    "build": "next build",
    "start": "next start",
    "lint": "next lint"
  }
}
```

(Keep all other fields as generated by create-next-app)

- [ ] **Step 10: Commit**

```bash
cd /Users/mariferubieto/Desktop/wellness-platform
git add frontend-marifer/
git commit -m "feat: scaffold frontend-marifer with wellness design system"
```

---

## Task 4: Build frontend-marifer/ — layout, Navbar, and Marifer landing

**Files:**
- Create: `frontend-marifer/app/layout.tsx`
- Create: `frontend-marifer/components/ui/Navbar.tsx`
- Create: `frontend-marifer/middleware.ts`
- Create: `frontend-marifer/app/page.tsx`

- [ ] **Step 1: Create root layout with Google Fonts and Navbar**

Create `frontend-marifer/app/layout.tsx`:

```tsx
import type { Metadata } from 'next';
import './globals.css';
import Navbar from '@/components/ui/Navbar';
import { Playfair_Display, Josefin_Sans, Fredoka, EB_Garamond } from 'next/font/google';

const playfair = Playfair_Display({
  subsets: ['latin'],
  variable: '--font-playfair',
  weight: ['700', '800', '900'],
  display: 'swap',
});
const josefin = Josefin_Sans({
  subsets: ['latin'],
  variable: '--font-josefin',
  weight: ['100', '200', '300'],
  display: 'swap',
});
const fredoka = Fredoka({
  subsets: ['latin'],
  variable: '--font-fredoka',
  weight: '400',
  display: 'swap',
});
const ebGaramond = EB_Garamond({
  subsets: ['latin'],
  variable: '--font-eb-garamond',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Marifer · Yoga, Ayurveda y Bienestar',
  description: 'Retiros de bienestar, diplomados de ayurveda y clases de yoga con Marifer.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className={`${playfair.variable} ${josefin.variable} ${fredoka.variable} ${ebGaramond.variable}`}>
      <body className="min-h-screen bg-beige antialiased">
        <Navbar />
        {children}
      </body>
    </html>
  );
}
```

- [ ] **Step 2: Create Marifer Navbar with external Shala link**

Create `frontend-marifer/components/ui/Navbar.tsx`:

```tsx
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
    <header className="sticky top-0 z-50 bg-beige border-b border-sand/40">
      <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between gap-6">
        <Link href="/" className="text-sm tracking-[0.2em] uppercase text-tierra font-medium shrink-0">
          Marifer
        </Link>

        <nav className="hidden md:flex items-center gap-7">
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
            style={{ fontFamily: 'var(--font-playfair)', fontWeight: 900, fontSize: '1.05rem', letterSpacing: '0.08em', textTransform: 'uppercase' }}
            className="text-tierra-light hover:text-tierra transition-colors"
          >
            Shala ↗
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
              style={item.style}
              className={`py-1 transition-colors ${pathname.startsWith(item.href) ? 'text-tierra' : 'text-tierra-light'}`}
            >
              {item.label}
            </Link>
          ))}
          <a
            href={SHALA_URL}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => setMenuOpen(false)}
            className="text-xs tracking-widest uppercase py-1 text-tierra-light"
            style={{ fontFamily: 'var(--font-playfair)', fontWeight: 900 }}
          >
            Shala ↗
          </a>
          {rol === 'admin' && (
            <Link href="/admin" onClick={() => setMenuOpen(false)} className="text-xs tracking-widest uppercase py-1 text-tierra-light">Admin</Link>
          )}
        </div>
      )}
    </header>
  );
}
```

- [ ] **Step 3: Create middleware.ts for Marifer — protect only /admin**

Create `frontend-marifer/middleware.ts`:

```ts
import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
  const response = NextResponse.next();

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return request.cookies.getAll(); },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            request.cookies.set(name, value);
            response.cookies.set(name, value, options);
          });
        },
      },
    }
  );

  const { data: { user } } = await supabase.auth.getUser();
  const path = request.nextUrl.pathname;

  if (path.startsWith('/admin') && !user) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  if (path === '/login' && user) {
    return NextResponse.redirect(new URL('/admin', request.url));
  }

  return response;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.png$).*)'],
};
```

- [ ] **Step 4: Create Marifer landing page**

Create `frontend-marifer/app/page.tsx`:

```tsx
import Link from 'next/link';

export default function Home() {
  return (
    <main className="max-w-4xl mx-auto px-6 py-24">
      {/* Hero */}
      <section className="mb-24">
        <div className="w-8 h-px bg-sand mb-8" />
        <h1
          className="text-5xl md:text-7xl text-tierra mb-6 leading-tight"
          style={{ fontFamily: 'var(--font-playfair)', fontWeight: 700 }}
        >
          Bienvenida a<br />un camino de<br />bienestar
        </h1>
        <p className="text-tierra-mid text-lg max-w-xl leading-relaxed mb-10">
          Soy Marifer. Acompaño a personas a reconectar con su salud a través del yoga,
          el ayurveda y los retiros de bienestar.
        </p>
        <div className="flex flex-wrap gap-4">
          <Link href="/retiros" className="btn-wellness">Ver retiros</Link>
          <Link href="/ayurveda" className="btn-secondary">Ayurveda</Link>
        </div>
      </section>

      {/* Secciones */}
      <section className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-24">
        <Link href="/retiros" className="card-wellness group">
          <p className="label-wellness mb-2">Retiros</p>
          <h2 className="text-2xl text-tierra mb-2" style={{ fontFamily: 'var(--font-fredoka)' }}>
            Retiros de bienestar
          </h2>
          <p className="text-tierra-light text-sm leading-relaxed">
            Espacios para desconectar, respirar y volver a ti.
          </p>
        </Link>
        <Link href="/ayurveda" className="card-wellness group">
          <p className="label-wellness mb-2">Ayurveda</p>
          <h2 className="text-2xl text-tierra mb-2" style={{ fontFamily: 'var(--font-josefin)', letterSpacing: '0.1em' }}>
            Diplomados y cursos
          </h2>
          <p className="text-tierra-light text-sm leading-relaxed">
            Formación profunda en la ciencia de la vida.
          </p>
        </Link>
        <Link href="/contenido" className="card-wellness group">
          <p className="label-wellness mb-2">Biblioteca</p>
          <h2 className="text-2xl text-tierra mb-2" style={{ fontFamily: 'var(--font-eb-garamond)' }}>
            Artículos y videos
          </h2>
          <p className="text-tierra-light text-sm leading-relaxed">
            Recursos para tu práctica diaria.
          </p>
        </Link>
        <Link href="/eventos" className="card-wellness group">
          <p className="label-wellness mb-2">Eventos</p>
          <h2 className="text-2xl text-tierra mb-2">Clases especiales</h2>
          <p className="text-tierra-light text-sm leading-relaxed">
            Talleres, masterclasses y encuentros en comunidad.
          </p>
        </Link>
      </section>
    </main>
  );
}
```

- [ ] **Step 5: Create .env.local for local dev**

Create `frontend-marifer/.env.local`:

```
NEXT_PUBLIC_API_URL=http://localhost:4000
NEXT_PUBLIC_SUPABASE_URL=https://rsahtjffquqveshjalky.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJzYWh0amZmcXVxdmVzaGphbGt5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU2NjM4NzMsImV4cCI6MjA5MTIzOTg3M30.V4C4IQipMQQiknf_U_M1JSs3WE7gFGX8imqhzlRPNAE
NEXT_PUBLIC_SHALA_URL=https://shalayoga.com
```

- [ ] **Step 6: Verify dev server starts**

```bash
cd /Users/mariferubieto/Desktop/wellness-platform/frontend-marifer
npm run dev
```

Expected: `ready on http://localhost:3002` — landing page visible at that address.

- [ ] **Step 7: Commit**

```bash
cd /Users/mariferubieto/Desktop/wellness-platform
git add frontend-marifer/
git commit -m "feat: add marifer landing page, navbar with shala external link, middleware"
```

---

## Task 5: Migrate Marifer routes into frontend-marifer/

**Files:**
- Copy from original `frontend/`: app/ayurveda, app/retiros, app/contenido, app/eventos
- Copy: app/(auth)/login, app/(auth)/primer-acceso
- Copy: app/admin/ (marifer admin portions)
- Copy: components/ayurveda, components/contenido, components/marifer
- Create: app/admin/layout.tsx (Marifer admin version)

- [ ] **Step 1: Copy Marifer route directories**

```bash
SRC=/Users/mariferubieto/Desktop/wellness-platform/frontend
DST=/Users/mariferubieto/Desktop/wellness-platform/frontend-marifer

cp -r $SRC/app/ayurveda $DST/app/
cp -r $SRC/app/retiros $DST/app/
cp -r $SRC/app/contenido $DST/app/
cp -r $SRC/app/eventos $DST/app/
mkdir -p "$DST/app/(auth)"
cp -r "$SRC/app/(auth)/login" "$DST/app/(auth)/"
cp -r "$SRC/app/(auth)/primer-acceso" "$DST/app/(auth)/"
```

- [ ] **Step 2: Copy Marifer-specific components**

```bash
SRC=/Users/mariferubieto/Desktop/wellness-platform/frontend
DST=/Users/mariferubieto/Desktop/wellness-platform/frontend-marifer

mkdir -p $DST/components
cp -r $SRC/components/ayurveda $DST/components/ 2>/dev/null || true
cp -r $SRC/components/contenido $DST/components/ 2>/dev/null || true
cp -r $SRC/components/marifer $DST/components/ 2>/dev/null || true
```

- [ ] **Step 3: Copy admin pages for Marifer**

```bash
SRC=/Users/mariferubieto/Desktop/wellness-platform/frontend
DST=/Users/mariferubieto/Desktop/wellness-platform/frontend-marifer

mkdir -p $DST/app/admin
cp $SRC/app/admin/page.tsx $DST/app/admin/
cp -r $SRC/app/admin/ayurveda $DST/app/admin/
cp -r $SRC/app/admin/contenido $DST/app/admin/ 2>/dev/null || true
cp -r $SRC/app/admin/crm $DST/app/admin/ 2>/dev/null || true
cp -r $SRC/app/admin/marifer $DST/app/admin/ 2>/dev/null || true
cp -r $SRC/app/admin/codigos $DST/app/admin/
```

- [ ] **Step 4: Create Marifer admin layout**

Create `frontend-marifer/app/admin/layout.tsx`:

```tsx
'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { api } from '@/lib/api';

interface UserProfile { rol: string; nombre: string; }

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [loading, setLoading] = useState(true);
  const [authorized, setAuthorized] = useState(false);
  const [adminNombre, setAdminNombre] = useState('');

  useEffect(() => {
    api.get<UserProfile>('/api/auth/me')
      .then(profile => {
        if (profile.rol !== 'admin') { router.push('/'); return; }
        setAdminNombre(profile.nombre);
        setAuthorized(true);
      })
      .catch(() => router.push('/login'))
      .finally(() => setLoading(false));
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
    { href: '/admin/crm', label: 'CRM · Leads' },
    { href: '/admin/ayurveda', label: 'AYURVEDA' },
    { href: '/admin/marifer', label: 'MARIFER' },
    { href: '/admin/contenido', label: 'CONTENIDO' },
    { href: '/admin/codigos', label: 'CÓDIGOS PROMO' },
  ];

  return (
    <div className="min-h-screen flex">
      <aside className="w-56 bg-white border-r border-beige-lino flex flex-col">
        <div className="p-6 border-b border-beige-lino">
          <div className="w-6 h-px bg-sand mb-3" />
          <p className="text-xs tracking-widest uppercase text-tierra-light">Admin · Marifer</p>
          <p className="text-sm text-tierra mt-1">{adminNombre}</p>
        </div>
        <nav className="flex-1 p-4">
          <ul className="space-y-1">
            {navLinks.map(link => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  className={`block px-4 py-2 text-xs tracking-widest uppercase rounded-wellness transition-colors ${
                    pathname === link.href ? 'bg-sage-muted text-sage' : 'text-tierra-light hover:text-tierra'
                  }`}
                >
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </aside>
      <main className="flex-1 bg-beige p-8 overflow-auto">{children}</main>
    </div>
  );
}
```

- [ ] **Step 5: Verify build**

```bash
cd /Users/mariferubieto/Desktop/wellness-platform/frontend-marifer
npm run build
```

Expected: Build succeeds. Fix any broken import paths (e.g., components that referenced `@/components/shala/` should be removed or pointed to the correct location).

- [ ] **Step 6: Commit**

```bash
cd /Users/mariferubieto/Desktop/wellness-platform
git add frontend-marifer/
git commit -m "feat: migrate marifer routes (ayurveda, retiros, contenido, eventos, admin) to frontend-marifer"
```

---

## Task 6: Update root package.json workspaces

**Files:**
- Modify: `package.json` (root)

- [ ] **Step 1: Update workspaces array**

In `/Users/mariferubieto/Desktop/wellness-platform/package.json`, update the `workspaces` field:

```json
{
  "workspaces": [
    "frontend-shala",
    "frontend-marifer",
    "backend"
  ]
}
```

Remove `"frontend"` from the array (the old directory stays in git temporarily until Vercel is reconfigured).

- [ ] **Step 2: Commit**

```bash
cd /Users/mariferubieto/Desktop/wellness-platform
git add package.json
git commit -m "chore: update workspaces to frontend-shala and frontend-marifer"
```

---

## Task 7: Update backend CORS for both domains

**Files:**
- Modify: `backend/src/app.ts`
- Modify: `backend/.env`

- [ ] **Step 1: Update CORS in app.ts to support multiple origins**

In `backend/src/app.ts`, replace the current `app.use(cors(...))` block:

```ts
const allowedOrigins = (process.env.ALLOWED_ORIGINS || 'http://localhost:3000,http://localhost:3001,http://localhost:3002')
  .split(',')
  .map(o => o.trim());

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error(`CORS: origin ${origin} not allowed`));
    }
  },
  credentials: true,
}));
```

- [ ] **Step 2: Add ALLOWED_ORIGINS to backend/.env**

Add to `backend/.env`:

```
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:3001,http://localhost:3002,https://shalayoga.com,https://www.shalayoga.com,https://marifer.com,https://www.marifer.com
```

Also remove or update `FRONTEND_URL` — it is now replaced by `ALLOWED_ORIGINS`.

- [ ] **Step 3: Verify backend starts without errors**

```bash
cd /Users/mariferubieto/Desktop/wellness-platform/backend
npm run dev
```

Expected: Server starts on port 4000. No TypeScript errors.

- [ ] **Step 4: Commit**

```bash
cd /Users/mariferubieto/Desktop/wellness-platform
git add backend/src/app.ts backend/.env
git commit -m "feat: update backend CORS to support marifer.com and shalayoga.com"
```

---

## Task 8: Add leads endpoint and comunidad_leads table

**Files:**
- Create: `backend/src/routes/leads.ts`
- Modify: `backend/src/app.ts`
- Create: `database/migrations/008_comunidad_leads.sql`

- [ ] **Step 1: Write the migration SQL**

Create `database/migrations/008_comunidad_leads.sql`:

```sql
CREATE TABLE IF NOT EXISTS comunidad_leads (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email      text NOT NULL,
  telefono   text,
  ciudad     text,
  pais       text,
  fuente     text DEFAULT 'popup_marifer',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE comunidad_leads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service_role_all_leads" ON comunidad_leads
  FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_leads_email ON comunidad_leads(email);
CREATE INDEX IF NOT EXISTS idx_leads_ciudad ON comunidad_leads(ciudad);
```

- [ ] **Step 2: Run migration in Supabase SQL Editor**

Go to supabase.com → your project → SQL Editor → paste the SQL above → Run.

Expected: "Success. No rows returned."

- [ ] **Step 3: Create leads route**

Create `backend/src/routes/leads.ts`:

```ts
import { Router, Request, Response } from 'express';
import { requireAuth } from '../middleware/auth';
import { requireRole } from '../middleware/requireRole';
import type { AuthenticatedRequest } from '../middleware/auth';
import { supabaseAdmin } from '../config/supabase';

const router = Router();

// Public: save a lead from the popup
router.post('/', async (req: Request, res: Response): Promise<void> => {
  const { email, telefono, ciudad, pais } = req.body;
  if (!email || !email.includes('@')) {
    res.status(400).json({ error: 'email válido es requerido' });
    return;
  }
  const { data, error } = await supabaseAdmin
    .from('comunidad_leads')
    .insert({ email, telefono: telefono ?? null, ciudad: ciudad ?? null, pais: pais ?? null })
    .select('id, email')
    .single();
  if (error) { res.status(400).json({ error: error.message }); return; }
  res.status(201).json(data);
});

// Admin: list all leads
router.get('/', requireAuth, requireRole('admin'), async (_req: AuthenticatedRequest, res: Response): Promise<void> => {
  const { data, error } = await supabaseAdmin
    .from('comunidad_leads')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) { res.status(500).json({ error: error.message }); return; }
  res.json(data ?? []);
});

export default router;
```

- [ ] **Step 4: Register leads route in app.ts**

In `backend/src/app.ts`, after the existing imports and `app.use` calls, add:

```ts
import leadsRouter from './routes/leads';
// ...
app.use('/api/leads', leadsRouter);
```

- [ ] **Step 5: Verify backend compiles**

```bash
cd /Users/mariferubieto/Desktop/wellness-platform/backend
npm run build
```

Expected: Build succeeds with no errors.

- [ ] **Step 6: Commit**

```bash
cd /Users/mariferubieto/Desktop/wellness-platform
git add backend/src/routes/leads.ts backend/src/app.ts database/migrations/008_comunidad_leads.sql
git commit -m "feat: add leads endpoint and comunidad_leads migration"
```

---

## Task 9: Add LeadPopup component to frontend-marifer

**Files:**
- Create: `frontend-marifer/components/ui/LeadPopup.tsx`
- Modify: `frontend-marifer/app/layout.tsx`

- [ ] **Step 1: Create LeadPopup component**

Create `frontend-marifer/components/ui/LeadPopup.tsx`:

```tsx
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
      // Fetch city from IP geolocation
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
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center p-4 md:p-0">
      <div className="absolute inset-0 bg-tierra/20 backdrop-blur-sm" onClick={dismiss} />
      <div className="relative w-full max-w-md bg-beige border border-sand rounded-wellness p-8 shadow-xl">
        <button
          onClick={dismiss}
          className="absolute top-4 right-4 text-tierra-light hover:text-tierra transition-colors"
          aria-label="Cerrar"
        >
          ✕
        </button>

        {enviado ? (
          <div className="text-center py-4">
            <div className="w-8 h-px bg-sage mx-auto mb-4" />
            <p className="text-tierra text-lg mb-2">¡Gracias por unirte!</p>
            <p className="text-tierra-light text-sm">Te avisaremos de retiros, talleres y descuentos.</p>
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
```

- [ ] **Step 2: Add LeadPopup to root layout**

In `frontend-marifer/app/layout.tsx`, import and render the popup inside `<body>`:

```tsx
import LeadPopup from '@/components/ui/LeadPopup';

// Inside the body element:
<body className="min-h-screen bg-beige antialiased">
  <Navbar />
  {children}
  <LeadPopup />
</body>
```

- [ ] **Step 3: Verify dev server shows popup after 5 seconds**

```bash
cd /Users/mariferubieto/Desktop/wellness-platform/frontend-marifer
npm run dev
```

Open `http://localhost:3002` in a browser. After 5 seconds the popup should appear. Submitting an email should call `POST http://localhost:4000/api/leads` (make sure backend is running).

- [ ] **Step 4: Commit**

```bash
cd /Users/mariferubieto/Desktop/wellness-platform
git add frontend-marifer/
git commit -m "feat: add lead capture popup with geolocation to frontend-marifer"
```

---

## Task 10: Push to GitHub and update Vercel configuration

**Files:** No code changes — configuration only.

- [ ] **Step 1: Push all commits to GitHub**

```bash
cd /Users/mariferubieto/Desktop/wellness-platform
git push origin main
```

- [ ] **Step 2: Update existing Shala Vercel project root directory**

In Vercel dashboard:
1. Go to your existing project (the one currently deployed)
2. Settings → General → Root Directory
3. Change from `frontend` to `frontend-shala`
4. Save → Redeploy

- [ ] **Step 3: Create new Marifer Vercel project**

In Vercel dashboard:
1. "Add New Project" → Import the same GitHub repo (`wellness-platform-`)
2. Root Directory: `frontend-marifer`
3. Add environment variables:
   - `NEXT_PUBLIC_API_URL` = `https://[your-render-url]`
   - `NEXT_PUBLIC_SUPABASE_URL` = `https://rsahtjffquqveshjalky.supabase.co`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` = `[anon key]`
   - `NEXT_PUBLIC_SHALA_URL` = `https://shalayoga.com`
4. Deploy

- [ ] **Step 4: Update ALLOWED_ORIGINS on Render**

In Render dashboard → your backend service → Environment:
- Add/update `ALLOWED_ORIGINS`:
  ```
  https://shalayoga.com,https://www.shalayoga.com,https://marifer.com,https://www.marifer.com
  ```
  (include the Vercel preview URLs too if needed during testing:
  `https://[shala-project].vercel.app,https://[marifer-project].vercel.app`)
- Manual deploy to apply changes

- [ ] **Step 5: Verify both Vercel deployments load correctly**

- Open the Shala Vercel URL → should show the Shala calendar/landing
- Open the Marifer Vercel URL → should show the Marifer landing page with popup after 5s

- [ ] **Step 6: Final commit — remove old frontend/ directory**

Once both Vercel projects are confirmed working:

```bash
cd /Users/mariferubieto/Desktop/wellness-platform
git rm -r frontend/
git commit -m "chore: remove old frontend/ directory — replaced by frontend-shala and frontend-marifer"
git push origin main
```
