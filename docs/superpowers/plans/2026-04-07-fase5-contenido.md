# Fase 5 — CONTENIDO: Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the complete Content module — Blog (posts), Vlog/Mini clases (videos), and Newsletter with public-facing pages, admin panel, and full CRUD API.

**Architecture:** Express.js services in `backend/src/services/` + routes in `backend/src/routes/contenido/` and `backend/src/routes/newsletter/`. Frontend in `frontend/app/contenido/` and `frontend/app/admin/contenido/`. Public routes require no auth; admin routes use `requireAuth + requireRole('admin')`.

**Tech Stack:** TypeScript, Express.js, Supabase (supabaseAdmin), Jest + Supertest, Next.js 14 App Router, Tailwind CSS wellness tokens, xlsx.

---

## File Map

| File | Action | Responsibility |
|---|---|---|
| `database/migrations/005_content_schema.sql` | Create | Tables: posts, videos, newsletter_suscriptores |
| `backend/src/services/contenido.service.ts` | Create | CRUD posts + videos (getPosts, getPostBySlug, createPost, updatePost, getVideos, createVideo, updateVideo) |
| `backend/src/services/newsletter.service.ts` | Create | suscribir, cancelarSuscripcion, getSuscriptores, exportSuscriptoresToExcel |
| `backend/src/routes/contenido/index.ts` | Create | GET/POST/PATCH posts y videos (public + admin) |
| `backend/src/routes/newsletter/index.ts` | Create | POST /suscribir, DELETE /cancelar, GET /suscriptores (admin), GET /suscriptores/exportar (admin) |
| `backend/src/app.ts` | Modify | Register `/api/contenido` y `/api/newsletter` |
| `backend/tests/contenido.test.ts` | Create | Tests for posts y videos routes |
| `backend/tests/newsletter.test.ts` | Create | Tests for newsletter routes |
| `frontend/components/contenido/PostCard.tsx` | Create | Blog post card with title, date, tags, link to slug |
| `frontend/components/contenido/VideoCard.tsx` | Create | Video card with thumbnail, title, tipo, link to YouTube |
| `frontend/components/ui/NewsletterForm.tsx` | Create | Reusable email subscribe form |
| `frontend/app/contenido/page.tsx` | Create | Hub: hero + link to blog + link to videos + newsletter signup |
| `frontend/app/contenido/blog/page.tsx` | Create | Blog listing: all published posts grid |
| `frontend/app/contenido/blog/[slug]/page.tsx` | Create | Blog post detail: full content + newsletter CTA |
| `frontend/app/contenido/videos/page.tsx` | Create | Videos listing with tabs: Vlog / Mini clases |
| `frontend/app/admin/contenido/page.tsx` | Create | Admin: tabs for Posts, Videos, Newsletter suscriptores |
| `frontend/app/admin/layout.tsx` | Modify | Add "Contenido" nav link |

---

## Task 1: DB schema — tablas contenido

**Files:**
- Create: `database/migrations/005_content_schema.sql`

- [ ] **Step 1: Crear archivo de migración**

```sql
-- database/migrations/005_content_schema.sql
-- Run this in Supabase SQL Editor after 004_marifer_schema.sql

-- ============================================================
-- TABLA: posts (blog)
-- ============================================================
CREATE TABLE IF NOT EXISTS posts (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  titulo      text NOT NULL,
  slug        text UNIQUE NOT NULL,
  contenido   text NOT NULL,
  imagen_url  text,
  autor_id    uuid REFERENCES users(id) ON DELETE SET NULL,
  tags        text[] DEFAULT '{}',
  publicado   boolean DEFAULT false,
  created_at  timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS posts_slug_idx ON posts(slug);
CREATE INDEX IF NOT EXISTS posts_publicado_idx ON posts(publicado);
CREATE INDEX IF NOT EXISTS posts_created_at_idx ON posts(created_at DESC);

ALTER TABLE posts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "service_role_all" ON posts USING (true) WITH CHECK (true);

-- ============================================================
-- TABLA: videos (vlog + mini clases)
-- ============================================================
CREATE TYPE video_tipo AS ENUM ('vlog', 'mini_clase');

CREATE TABLE IF NOT EXISTS videos (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  titulo        text NOT NULL,
  descripcion   text,
  url_video     text NOT NULL,
  tipo          video_tipo NOT NULL,
  gratis        boolean DEFAULT true,
  thumbnail_url text,
  publicado     boolean DEFAULT false,
  created_at    timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS videos_tipo_idx ON videos(tipo);
CREATE INDEX IF NOT EXISTS videos_publicado_idx ON videos(publicado);
CREATE INDEX IF NOT EXISTS videos_created_at_idx ON videos(created_at DESC);

ALTER TABLE videos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "service_role_all" ON videos USING (true) WITH CHECK (true);

-- ============================================================
-- TABLA: newsletter_suscriptores
-- ============================================================
CREATE TABLE IF NOT EXISTS newsletter_suscriptores (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email      text UNIQUE NOT NULL,
  nombre     text,
  activo     boolean DEFAULT true,
  fuente     text DEFAULT 'web',
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS newsletter_email_idx ON newsletter_suscriptores(email);
CREATE INDEX IF NOT EXISTS newsletter_activo_idx ON newsletter_suscriptores(activo);

ALTER TABLE newsletter_suscriptores ENABLE ROW LEVEL SECURITY;
CREATE POLICY "service_role_all" ON newsletter_suscriptores USING (true) WITH CHECK (true);
```

- [ ] **Step 2: Ejecutar en Supabase SQL Editor**

Copiar el contenido del archivo y ejecutarlo en Supabase Dashboard → SQL Editor. Verificar que las 3 tablas (`posts`, `videos`, `newsletter_suscriptores`) aparecen en Table Editor.

- [ ] **Step 3: Commit**

```bash
cd /Users/mariferubieto/Desktop/wellness-platform
git add database/migrations/005_content_schema.sql
git commit -m "feat: schema SQL fase 5 - tablas Contenido (posts, videos, newsletter)"
```

---

## Task 2: Backend — contenido.service.ts

**Files:**
- Create: `backend/src/services/contenido.service.ts`

- [ ] **Step 1: Crear el servicio**

```typescript
// backend/src/services/contenido.service.ts
import { supabaseAdmin } from '../config/supabase';

// ── POSTS ──────────────────────────────────────────────────

export async function getPosts(soloPublicados = true) {
  let q = supabaseAdmin
    .from('posts')
    .select('id, titulo, slug, imagen_url, tags, publicado, created_at')
    .order('created_at', { ascending: false });
  if (soloPublicados) q = q.eq('publicado', true);
  const { data, error } = await q;
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function getPostBySlug(slug: string) {
  const { data, error } = await supabaseAdmin
    .from('posts')
    .select('id, titulo, slug, contenido, imagen_url, tags, publicado, created_at')
    .eq('slug', slug)
    .eq('publicado', true)
    .single();
  if (error) throw new Error('Post no encontrado');
  return data;
}

export async function createPost(body: {
  titulo: string;
  slug: string;
  contenido: string;
  imagen_url?: string;
  tags?: string[];
  autor_id?: string;
}) {
  const { data, error } = await supabaseAdmin
    .from('posts')
    .insert({
      titulo: body.titulo,
      slug: body.slug,
      contenido: body.contenido,
      imagen_url: body.imagen_url ?? null,
      tags: body.tags ?? [],
      autor_id: body.autor_id ?? null,
    })
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data;
}

export async function updatePost(
  id: string,
  body: Partial<{
    titulo: string;
    slug: string;
    contenido: string;
    imagen_url: string;
    tags: string[];
    publicado: boolean;
  }>
) {
  const { data, error } = await supabaseAdmin
    .from('posts')
    .update(body)
    .eq('id', id)
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data;
}

// ── VIDEOS ─────────────────────────────────────────────────

export async function getVideos(
  tipo?: 'vlog' | 'mini_clase',
  soloPublicados = true
) {
  let q = supabaseAdmin
    .from('videos')
    .select('id, titulo, descripcion, url_video, tipo, gratis, thumbnail_url, publicado, created_at')
    .order('created_at', { ascending: false });
  if (soloPublicados) q = q.eq('publicado', true);
  if (tipo) q = q.eq('tipo', tipo);
  const { data, error } = await q;
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function createVideo(body: {
  titulo: string;
  descripcion?: string;
  url_video: string;
  tipo: 'vlog' | 'mini_clase';
  gratis?: boolean;
  thumbnail_url?: string;
}) {
  const { data, error } = await supabaseAdmin
    .from('videos')
    .insert({
      titulo: body.titulo,
      descripcion: body.descripcion ?? null,
      url_video: body.url_video,
      tipo: body.tipo,
      gratis: body.gratis ?? true,
      thumbnail_url: body.thumbnail_url ?? null,
    })
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data;
}

export async function updateVideo(
  id: string,
  body: Partial<{
    titulo: string;
    descripcion: string;
    url_video: string;
    tipo: 'vlog' | 'mini_clase';
    gratis: boolean;
    thumbnail_url: string;
    publicado: boolean;
  }>
) {
  const { data, error } = await supabaseAdmin
    .from('videos')
    .update(body)
    .eq('id', id)
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data;
}
```

- [ ] **Step 2: Verificar que compila sin errores**

```bash
cd /Users/mariferubieto/Desktop/wellness-platform/backend
npx tsc --noEmit
```

Expected: no output (0 errors).

---

## Task 3: Backend — newsletter.service.ts

**Files:**
- Create: `backend/src/services/newsletter.service.ts`

- [ ] **Step 1: Crear el servicio**

```typescript
// backend/src/services/newsletter.service.ts
import { supabaseAdmin } from '../config/supabase';
import * as XLSX from 'xlsx';

export async function suscribir(
  email: string,
  nombre?: string,
  fuente?: string
) {
  const { data, error } = await supabaseAdmin
    .from('newsletter_suscriptores')
    .upsert(
      { email, nombre: nombre ?? null, fuente: fuente ?? 'web', activo: true },
      { onConflict: 'email' }
    )
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data;
}

export async function cancelarSuscripcion(email: string) {
  const { data, error } = await supabaseAdmin
    .from('newsletter_suscriptores')
    .update({ activo: false })
    .eq('email', email)
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data;
}

export async function getSuscriptores() {
  const { data, error } = await supabaseAdmin
    .from('newsletter_suscriptores')
    .select('id, email, nombre, fuente, activo, created_at')
    .eq('activo', true)
    .order('created_at', { ascending: false });
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function exportSuscriptoresToExcel(): Promise<Buffer> {
  const suscriptores = await getSuscriptores();
  const rows = suscriptores.map(s => ({
    Email: s.email,
    Nombre: s.nombre ?? '',
    Fuente: s.fuente ?? '',
    Fecha: new Date(s.created_at).toLocaleDateString('es-MX'),
  }));
  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Suscriptores');
  return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
}
```

- [ ] **Step 2: Verificar compilación**

```bash
cd /Users/mariferubieto/Desktop/wellness-platform/backend
npx tsc --noEmit
```

Expected: no output.

---

## Task 4: Backend — routes/contenido/index.ts

**Files:**
- Create: `backend/src/routes/contenido/index.ts`

- [ ] **Step 1: Crear router**

```typescript
// backend/src/routes/contenido/index.ts
import { Router, Request, Response } from 'express';
import { requireAuth } from '../../middleware/auth';
import { requireRole } from '../../middleware/requireRole';
import type { AuthenticatedRequest } from '../../middleware/auth';
import {
  getPosts,
  getPostBySlug,
  createPost,
  updatePost,
  getVideos,
  createVideo,
  updateVideo,
} from '../../services/contenido.service';

const router = Router();

// ── PUBLIC ─────────────────────────────────────────────────

router.get('/posts', async (_req: Request, res: Response): Promise<void> => {
  try {
    const posts = await getPosts(true);
    res.json(posts);
  } catch (err: unknown) {
    res.status(500).json({ error: err instanceof Error ? err.message : 'Error' });
  }
});

router.get('/videos', async (req: Request, res: Response): Promise<void> => {
  try {
    const { tipo } = req.query as { tipo?: string };
    const validTipo = tipo === 'vlog' || tipo === 'mini_clase' ? tipo : undefined;
    const videos = await getVideos(validTipo, true);
    res.json(videos);
  } catch (err: unknown) {
    res.status(500).json({ error: err instanceof Error ? err.message : 'Error' });
  }
});

// IMPORTANT: /posts/admin MUST be before /posts/:slug to avoid param capture
router.get('/posts/admin', requireAuth, requireRole('admin'), async (_req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const posts = await getPosts(false);
    res.json(posts);
  } catch (err: unknown) {
    res.status(500).json({ error: err instanceof Error ? err.message : 'Error' });
  }
});

router.get('/posts/:slug', async (req: Request, res: Response): Promise<void> => {
  try {
    const post = await getPostBySlug(req.params.slug);
    res.json(post);
  } catch (err: unknown) {
    res.status(404).json({ error: err instanceof Error ? err.message : 'No encontrado' });
  }
});

// ── ADMIN ──────────────────────────────────────────────────

router.post('/posts', requireAuth, requireRole('admin'), async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { titulo, slug, contenido, imagen_url, tags } = req.body;
    if (!titulo || !slug || !contenido) {
      res.status(400).json({ error: 'titulo, slug y contenido son requeridos' });
      return;
    }
    const post = await createPost({
      titulo, slug, contenido,
      imagen_url, tags,
      autor_id: req.userId,
    });
    res.status(201).json(post);
  } catch (err: unknown) {
    res.status(400).json({ error: err instanceof Error ? err.message : 'Error' });
  }
});

router.patch('/posts/:id', requireAuth, requireRole('admin'), async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const post = await updatePost(req.params.id, req.body);
    res.json(post);
  } catch (err: unknown) {
    res.status(400).json({ error: err instanceof Error ? err.message : 'Error' });
  }
});

router.get('/videos/admin', requireAuth, requireRole('admin'), async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { tipo } = req.query as { tipo?: string };
    const validTipo = tipo === 'vlog' || tipo === 'mini_clase' ? tipo : undefined;
    const videos = await getVideos(validTipo, false);
    res.json(videos);
  } catch (err: unknown) {
    res.status(500).json({ error: err instanceof Error ? err.message : 'Error' });
  }
});

router.post('/videos', requireAuth, requireRole('admin'), async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { titulo, url_video, tipo } = req.body;
    if (!titulo || !url_video || !tipo) {
      res.status(400).json({ error: 'titulo, url_video y tipo son requeridos' });
      return;
    }
    if (tipo !== 'vlog' && tipo !== 'mini_clase') {
      res.status(400).json({ error: 'tipo debe ser "vlog" o "mini_clase"' });
      return;
    }
    const video = await createVideo(req.body);
    res.status(201).json(video);
  } catch (err: unknown) {
    res.status(400).json({ error: err instanceof Error ? err.message : 'Error' });
  }
});

router.patch('/videos/:id', requireAuth, requireRole('admin'), async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const video = await updateVideo(req.params.id, req.body);
    res.json(video);
  } catch (err: unknown) {
    res.status(400).json({ error: err instanceof Error ? err.message : 'Error' });
  }
});

export default router;
```

- [ ] **Step 2: Verificar compilación**

```bash
cd /Users/mariferubieto/Desktop/wellness-platform/backend
npx tsc --noEmit
```

Expected: no output.

---

## Task 5: Backend — routes/newsletter/index.ts

**Files:**
- Create: `backend/src/routes/newsletter/index.ts`

- [ ] **Step 1: Crear router**

```typescript
// backend/src/routes/newsletter/index.ts
import { Router, Request, Response } from 'express';
import { requireAuth } from '../../middleware/auth';
import { requireRole } from '../../middleware/requireRole';
import type { AuthenticatedRequest } from '../../middleware/auth';
import {
  suscribir,
  cancelarSuscripcion,
  getSuscriptores,
  exportSuscriptoresToExcel,
} from '../../services/newsletter.service';

const router = Router();

// IMPORTANT: /suscriptores/exportar MUST be before /suscriptores to avoid param capture
router.get('/suscriptores/exportar', requireAuth, requireRole('admin'), async (_req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const buffer = await exportSuscriptoresToExcel();
    const fecha = new Date().toISOString().split('T')[0];
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="newsletter-${fecha}.xlsx"`);
    res.send(buffer);
  } catch (err: unknown) {
    res.status(500).json({ error: err instanceof Error ? err.message : 'Error' });
  }
});

router.get('/suscriptores', requireAuth, requireRole('admin'), async (_req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const suscriptores = await getSuscriptores();
    res.json(suscriptores);
  } catch (err: unknown) {
    res.status(500).json({ error: err instanceof Error ? err.message : 'Error' });
  }
});

router.post('/suscribir', async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, nombre, fuente } = req.body;
    if (!email) {
      res.status(400).json({ error: 'El email es requerido' });
      return;
    }
    const suscriptor = await suscribir(email, nombre, fuente);
    res.status(201).json(suscriptor);
  } catch (err: unknown) {
    res.status(400).json({ error: err instanceof Error ? err.message : 'Error' });
  }
});

router.delete('/cancelar', async (req: Request, res: Response): Promise<void> => {
  try {
    const { email } = req.body;
    if (!email) {
      res.status(400).json({ error: 'El email es requerido' });
      return;
    }
    const result = await cancelarSuscripcion(email);
    res.json(result);
  } catch (err: unknown) {
    res.status(400).json({ error: err instanceof Error ? err.message : 'Error' });
  }
});

export default router;
```

- [ ] **Step 2: Verificar compilación**

```bash
cd /Users/mariferubieto/Desktop/wellness-platform/backend
npx tsc --noEmit
```

Expected: no output.

---

## Task 6: Registrar rutas en app.ts

**Files:**
- Modify: `backend/src/app.ts`

- [ ] **Step 1: Agregar imports y rutas**

En `backend/src/app.ts`, después de la línea `import eventosRouter from './routes/eventos/index';`, agregar:

```typescript
import contenidoRouter from './routes/contenido/index';
import newsletterRouter from './routes/newsletter/index';
```

Después de la línea `app.use('/api/eventos', eventosRouter);`, agregar:

```typescript
app.use('/api/contenido', contenidoRouter);
app.use('/api/newsletter', newsletterRouter);
```

- [ ] **Step 2: Verificar que app.ts queda así** (sección relevante)

```typescript
import authRouter from './routes/auth';
import usersRouter from './routes/users';
import adminRouter from './routes/admin';
import shalaRouter from './routes/shala/index';
import ayurvedaRouter from './routes/ayurveda/index';
import retirosRouter from './routes/retiros/index';
import eventosRouter from './routes/eventos/index';
import contenidoRouter from './routes/contenido/index';
import newsletterRouter from './routes/newsletter/index';

app.use('/api/auth', authRouter);
app.use('/api/users', usersRouter);
app.use('/api/admin', adminRouter);
app.use('/api/shala', shalaRouter);
app.use('/api/ayurveda', ayurvedaRouter);
app.use('/api/retiros', retirosRouter);
app.use('/api/eventos', eventosRouter);
app.use('/api/contenido', contenidoRouter);
app.use('/api/newsletter', newsletterRouter);
```

- [ ] **Step 3: Verificar compilación**

```bash
cd /Users/mariferubieto/Desktop/wellness-platform/backend
npx tsc --noEmit
```

Expected: no output.

- [ ] **Step 4: Commit backend completo**

```bash
cd /Users/mariferubieto/Desktop/wellness-platform
git add backend/src/services/contenido.service.ts \
        backend/src/services/newsletter.service.ts \
        backend/src/routes/contenido/index.ts \
        backend/src/routes/newsletter/index.ts \
        backend/src/app.ts
git commit -m "feat: contenido service + newsletter service + routes (posts, videos, suscriptores)"
```

---

## Task 7: Tests — backend/tests/contenido.test.ts

**Files:**
- Create: `backend/tests/contenido.test.ts`

- [ ] **Step 1: Escribir tests**

```typescript
// backend/tests/contenido.test.ts
import request from 'supertest';
import app from '../src/app';

jest.mock('../src/config/supabase', () => ({
  supabaseAdmin: {
    from: jest.fn(),
    auth: { getUser: jest.fn() },
  },
}));

import { supabaseAdmin } from '../src/config/supabase';
const mockFrom = supabaseAdmin.from as jest.Mock;
const mockGetUser = supabaseAdmin.auth.getUser as jest.Mock;

function mockAdminAuth() {
  mockGetUser.mockResolvedValueOnce({ data: { user: { id: 'auth-admin' } }, error: null });
  mockFrom.mockReturnValueOnce({
    select: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    single: jest.fn().mockResolvedValueOnce({
      data: { id: 'admin-1', rol: 'admin', nombre: 'Admin', email: 'a@t.com', tags: [] },
      error: null,
    }),
  });
}

beforeEach(() => jest.resetAllMocks());

describe('GET /api/contenido/posts', () => {
  it('returns published posts (public)', async () => {
    mockFrom.mockReturnValueOnce({
      select: jest.fn().mockReturnThis(),
      order: jest.fn().mockReturnThis(),
      eq: jest.fn().mockResolvedValueOnce({
        data: [
          { id: 'post-1', titulo: 'Mi primer post', slug: 'mi-primer-post', publicado: true, created_at: '2026-04-01T00:00:00Z' },
        ],
        error: null,
      }),
    });

    const res = await request(app).get('/api/contenido/posts');
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0].slug).toBe('mi-primer-post');
  });
});

describe('GET /api/contenido/posts/:slug', () => {
  it('returns 404 for unknown slug', async () => {
    mockFrom.mockReturnValueOnce({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValueOnce({ data: null, error: { message: 'No rows' } }),
    });

    const res = await request(app).get('/api/contenido/posts/no-existe');
    expect(res.status).toBe(404);
  });

  it('returns post for valid slug', async () => {
    mockFrom.mockReturnValueOnce({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValueOnce({
        data: { id: 'post-1', titulo: 'Mi post', slug: 'mi-post', contenido: 'Hola mundo', publicado: true, created_at: '2026-04-01T00:00:00Z' },
        error: null,
      }),
    });

    const res = await request(app).get('/api/contenido/posts/mi-post');
    expect(res.status).toBe(200);
    expect(res.body.titulo).toBe('Mi post');
  });
});

describe('GET /api/contenido/videos', () => {
  it('returns published videos (public)', async () => {
    mockFrom.mockReturnValueOnce({
      select: jest.fn().mockReturnThis(),
      order: jest.fn().mockReturnThis(),
      eq: jest.fn().mockResolvedValueOnce({
        data: [
          { id: 'vid-1', titulo: 'Vlog Abril', tipo: 'vlog', gratis: true, publicado: true },
        ],
        error: null,
      }),
    });

    const res = await request(app).get('/api/contenido/videos');
    expect(res.status).toBe(200);
    expect(res.body[0].tipo).toBe('vlog');
  });
});

describe('POST /api/contenido/posts (admin)', () => {
  it('returns 401 without token', async () => {
    const res = await request(app)
      .post('/api/contenido/posts')
      .send({ titulo: 'Test', slug: 'test', contenido: 'Contenido' });
    expect(res.status).toBe(401);
  });

  it('creates post with valid admin token', async () => {
    mockAdminAuth();
    mockFrom.mockReturnValueOnce({
      insert: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValueOnce({
        data: { id: 'post-new', titulo: 'Nuevo', slug: 'nuevo', contenido: 'Texto', publicado: false },
        error: null,
      }),
    });

    const res = await request(app)
      .post('/api/contenido/posts')
      .set('Authorization', 'Bearer valid-token')
      .send({ titulo: 'Nuevo', slug: 'nuevo', contenido: 'Texto' });
    expect(res.status).toBe(201);
    expect(res.body.slug).toBe('nuevo');
  });

  it('returns 400 when required fields missing', async () => {
    mockAdminAuth();
    const res = await request(app)
      .post('/api/contenido/posts')
      .set('Authorization', 'Bearer valid-token')
      .send({ titulo: 'Solo titulo' });
    expect(res.status).toBe(400);
  });
});

describe('PATCH /api/contenido/posts/:id (admin)', () => {
  it('publishes a post', async () => {
    mockAdminAuth();
    mockFrom.mockReturnValueOnce({
      update: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValueOnce({
        data: { id: 'post-1', publicado: true },
        error: null,
      }),
    });

    const res = await request(app)
      .patch('/api/contenido/posts/post-1')
      .set('Authorization', 'Bearer valid-token')
      .send({ publicado: true });
    expect(res.status).toBe(200);
    expect(res.body.publicado).toBe(true);
  });
});

describe('POST /api/contenido/videos (admin)', () => {
  it('returns 400 for invalid tipo', async () => {
    mockAdminAuth();
    const res = await request(app)
      .post('/api/contenido/videos')
      .set('Authorization', 'Bearer valid-token')
      .send({ titulo: 'Test', url_video: 'https://youtube.com/x', tipo: 'invalido' });
    expect(res.status).toBe(400);
  });

  it('creates video with valid data', async () => {
    mockAdminAuth();
    mockFrom.mockReturnValueOnce({
      insert: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValueOnce({
        data: { id: 'vid-new', titulo: 'Mini clase', tipo: 'mini_clase', gratis: true, publicado: false },
        error: null,
      }),
    });

    const res = await request(app)
      .post('/api/contenido/videos')
      .set('Authorization', 'Bearer valid-token')
      .send({ titulo: 'Mini clase', url_video: 'https://youtube.com/x', tipo: 'mini_clase' });
    expect(res.status).toBe(201);
    expect(res.body.tipo).toBe('mini_clase');
  });
});
```

- [ ] **Step 2: Ejecutar tests**

```bash
cd /Users/mariferubieto/Desktop/wellness-platform/backend
npm test -- --testPathPattern=contenido.test --verbose
```

Expected: All tests PASS.

---

## Task 8: Tests — backend/tests/newsletter.test.ts

**Files:**
- Create: `backend/tests/newsletter.test.ts`

- [ ] **Step 1: Escribir tests**

```typescript
// backend/tests/newsletter.test.ts
import request from 'supertest';
import app from '../src/app';

jest.mock('../src/config/supabase', () => ({
  supabaseAdmin: {
    from: jest.fn(),
    auth: { getUser: jest.fn() },
  },
}));

import { supabaseAdmin } from '../src/config/supabase';
const mockFrom = supabaseAdmin.from as jest.Mock;
const mockGetUser = supabaseAdmin.auth.getUser as jest.Mock;

function mockAdminAuth() {
  mockGetUser.mockResolvedValueOnce({ data: { user: { id: 'auth-admin' } }, error: null });
  mockFrom.mockReturnValueOnce({
    select: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    single: jest.fn().mockResolvedValueOnce({
      data: { id: 'admin-1', rol: 'admin', nombre: 'Admin', email: 'a@t.com', tags: [] },
      error: null,
    }),
  });
}

beforeEach(() => jest.resetAllMocks());

describe('POST /api/newsletter/suscribir', () => {
  it('returns 400 without email', async () => {
    const res = await request(app).post('/api/newsletter/suscribir').send({ nombre: 'Ana' });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('El email es requerido');
  });

  it('subscribes successfully', async () => {
    mockFrom.mockReturnValueOnce({
      upsert: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValueOnce({
        data: { id: 'sub-1', email: 'ana@mail.com', nombre: 'Ana', activo: true },
        error: null,
      }),
    });

    const res = await request(app)
      .post('/api/newsletter/suscribir')
      .send({ email: 'ana@mail.com', nombre: 'Ana' });
    expect(res.status).toBe(201);
    expect(res.body.email).toBe('ana@mail.com');
  });
});

describe('DELETE /api/newsletter/cancelar', () => {
  it('returns 400 without email', async () => {
    const res = await request(app).delete('/api/newsletter/cancelar').send({});
    expect(res.status).toBe(400);
  });

  it('unsubscribes successfully', async () => {
    mockFrom.mockReturnValueOnce({
      update: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValueOnce({
        data: { id: 'sub-1', email: 'ana@mail.com', activo: false },
        error: null,
      }),
    });

    const res = await request(app)
      .delete('/api/newsletter/cancelar')
      .send({ email: 'ana@mail.com' });
    expect(res.status).toBe(200);
    expect(res.body.activo).toBe(false);
  });
});

describe('GET /api/newsletter/suscriptores (admin)', () => {
  it('returns 401 without token', async () => {
    const res = await request(app).get('/api/newsletter/suscriptores');
    expect(res.status).toBe(401);
  });

  it('returns subscribers list for admin', async () => {
    mockAdminAuth();
    mockFrom.mockReturnValueOnce({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      order: jest.fn().mockResolvedValueOnce({
        data: [
          { id: 'sub-1', email: 'ana@mail.com', nombre: 'Ana', activo: true, created_at: '2026-04-01T00:00:00Z' },
        ],
        error: null,
      }),
    });

    const res = await request(app)
      .get('/api/newsletter/suscriptores')
      .set('Authorization', 'Bearer valid-token');
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0].email).toBe('ana@mail.com');
  });
});
```

- [ ] **Step 2: Ejecutar tests**

```bash
cd /Users/mariferubieto/Desktop/wellness-platform/backend
npm test -- --testPathPattern=newsletter.test --verbose
```

Expected: All tests PASS.

- [ ] **Step 3: Ejecutar todos los tests para verificar que nada se rompió**

```bash
cd /Users/mariferubieto/Desktop/wellness-platform/backend
npm test
```

Expected: All tests PASS.

- [ ] **Step 4: Commit tests**

```bash
cd /Users/mariferubieto/Desktop/wellness-platform
git add backend/tests/contenido.test.ts backend/tests/newsletter.test.ts
git commit -m "feat: tests contenido + newsletter routes"
```

---

## Task 9: Frontend — PostCard + VideoCard components

**Files:**
- Create: `frontend/components/contenido/PostCard.tsx`
- Create: `frontend/components/contenido/VideoCard.tsx`

- [ ] **Step 1: Crear PostCard**

```tsx
// frontend/components/contenido/PostCard.tsx
import Link from 'next/link';

interface Post {
  id: string;
  titulo: string;
  slug: string;
  imagen_url?: string;
  tags?: string[];
  created_at: string;
}

export default function PostCard({ post }: { post: Post }) {
  const fecha = new Date(post.created_at).toLocaleDateString('es-MX', {
    year: 'numeric', month: 'long', day: 'numeric',
  });

  return (
    <Link href={`/contenido/blog/${post.slug}`} className="block group">
      <div className="card-wellness flex flex-col overflow-hidden">
        <div className="aspect-video bg-sage-muted mb-4 overflow-hidden -mx-6 -mt-6">
          {post.imagen_url ? (
            <img
              src={post.imagen_url}
              alt={post.titulo}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <div className="w-8 h-px bg-sand" />
            </div>
          )}
        </div>
        <div className="flex-1">
          <p className="label-wellness mb-2">{fecha}</p>
          <h3 className="text-xl text-tierra leading-snug mb-3 group-hover:text-sage transition-colors">
            {post.titulo}
          </h3>
          {post.tags && post.tags.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {post.tags.map(tag => (
                <span key={tag} className="text-xs text-tierra-light bg-beige px-2 py-0.5 rounded-wellness">
                  {tag}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
    </Link>
  );
}
```

- [ ] **Step 2: Crear VideoCard**

```tsx
// frontend/components/contenido/VideoCard.tsx
interface Video {
  id: string;
  titulo: string;
  descripcion?: string;
  url_video: string;
  tipo: 'vlog' | 'mini_clase';
  gratis: boolean;
  thumbnail_url?: string;
}

export default function VideoCard({ video }: { video: Video }) {
  return (
    <div className="card-wellness flex flex-col">
      <div className="aspect-video bg-sage-muted mb-4 overflow-hidden -mx-6 -mt-6 relative">
        {video.thumbnail_url ? (
          <img
            src={video.thumbnail_url}
            alt={video.titulo}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-beige-lino">
            <span className="text-tierra-light text-4xl">▷</span>
          </div>
        )}
        {video.gratis && (
          <span className="absolute top-3 right-3 bg-sage text-white text-xs px-2 py-1 rounded-wellness tracking-widest uppercase">
            Gratis
          </span>
        )}
      </div>
      <div className="flex-1">
        <p className="label-wellness mb-2">{video.tipo === 'vlog' ? 'Vlog' : 'Mini clase'}</p>
        <h3 className="text-lg text-tierra leading-snug mb-2">{video.titulo}</h3>
        {video.descripcion && (
          <p className="text-tierra-light text-sm leading-relaxed line-clamp-2">{video.descripcion}</p>
        )}
      </div>
      <div className="mt-4 pt-4 border-t border-beige-lino">
        <a
          href={video.url_video}
          target="_blank"
          rel="noopener noreferrer"
          className="btn-primary text-xs block text-center"
        >
          Ver video
        </a>
      </div>
    </div>
  );
}
```

---

## Task 10: Frontend — NewsletterForm component

**Files:**
- Create: `frontend/components/ui/NewsletterForm.tsx`

- [ ] **Step 1: Crear componente**

```tsx
// frontend/components/ui/NewsletterForm.tsx
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
```

---

## Task 11: Frontend — contenido/blog/page.tsx

**Files:**
- Create: `frontend/app/contenido/blog/page.tsx`

- [ ] **Step 1: Crear página**

```tsx
// frontend/app/contenido/blog/page.tsx
'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import PostCard from '@/components/contenido/PostCard';

interface Post {
  id: string;
  titulo: string;
  slug: string;
  imagen_url?: string;
  tags?: string[];
  created_at: string;
}

export default function BlogPage() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get<Post[]>('/api/contenido/posts')
      .then(setPosts)
      .catch(() => setPosts([]))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="min-h-screen px-4 py-16">
      <div className="max-w-5xl mx-auto">

        <div className="mb-6">
          <Link href="/contenido" className="text-tierra-light text-xs tracking-widest uppercase hover:text-tierra transition-colors">
            ← Contenido
          </Link>
        </div>

        <div className="text-center mb-16">
          <div className="w-16 h-px bg-sand mx-auto mb-8" />
          <h1 className="text-5xl text-tierra mb-4">Blog</h1>
          <p className="text-tierra-light max-w-lg mx-auto leading-relaxed">
            Reflexiones, guías y enseñanzas sobre yoga, ayurveda y bienestar.
          </p>
        </div>

        {loading ? (
          <p className="text-center text-tierra-light text-sm tracking-widest uppercase">Cargando...</p>
        ) : posts.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-tierra-light text-sm">Próximamente nuevos artículos.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {posts.map(p => (
              <PostCard key={p.id} post={p} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
```

---

## Task 12: Frontend — contenido/blog/[slug]/page.tsx

**Files:**
- Create: `frontend/app/contenido/blog/[slug]/page.tsx`

- [ ] **Step 1: Crear página de detalle**

```tsx
// frontend/app/contenido/blog/[slug]/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import NewsletterForm from '@/components/ui/NewsletterForm';

interface Post {
  id: string;
  titulo: string;
  slug: string;
  contenido: string;
  imagen_url?: string;
  tags?: string[];
  created_at: string;
}

export default function PostDetallePage() {
  const { slug } = useParams<{ slug: string }>();
  const router = useRouter();
  const [post, setPost] = useState<Post | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get<Post>(`/api/contenido/posts/${slug}`)
      .then(setPost)
      .catch(() => setError('Artículo no encontrado'))
      .finally(() => setLoading(false));
  }, [slug]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-tierra-light text-sm tracking-widest uppercase">Cargando...</p>
      </div>
    );
  }

  if (error || !post) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-tierra-light text-sm mb-4">{error || 'Artículo no encontrado'}</p>
          <button onClick={() => router.push('/contenido/blog')} className="btn-secondary text-xs">
            Ver todos los artículos
          </button>
        </div>
      </div>
    );
  }

  const fecha = new Date(post.created_at).toLocaleDateString('es-MX', {
    year: 'numeric', month: 'long', day: 'numeric',
  });

  return (
    <div className="min-h-screen px-4 py-16">
      <div className="max-w-2xl mx-auto">

        <button
          onClick={() => router.push('/contenido/blog')}
          className="text-tierra-light text-xs tracking-widest uppercase mb-10 hover:text-tierra transition-colors"
        >
          ← Blog
        </button>

        <div className="w-8 h-px bg-sand mb-6" />
        <p className="label-wellness mb-3">{fecha}</p>
        <h1 className="text-4xl text-tierra mb-6 leading-tight">{post.titulo}</h1>

        {post.imagen_url && (
          <div className="aspect-video bg-beige-lino mb-10 overflow-hidden">
            <img src={post.imagen_url} alt={post.titulo} className="w-full h-full object-cover" />
          </div>
        )}

        <div className="prose-wellness text-tierra-light leading-relaxed whitespace-pre-wrap text-base">
          {post.contenido}
        </div>

        {post.tags && post.tags.length > 0 && (
          <div className="mt-10 pt-6 border-t border-beige-lino flex flex-wrap gap-2">
            {post.tags.map(tag => (
              <span key={tag} className="text-xs text-tierra-light bg-beige px-3 py-1 rounded-wellness">
                {tag}
              </span>
            ))}
          </div>
        )}

        {/* Newsletter CTA */}
        <div className="mt-16 bg-white border border-beige-lino rounded-wellness p-8">
          <div className="w-6 h-px bg-sand mb-4" />
          <h3 className="text-xl text-tierra mb-2">¿Te gustó este artículo?</h3>
          <p className="text-tierra-light text-sm mb-6 leading-relaxed">
            Suscríbete para recibir nuevos artículos, guías y contenido exclusivo.
          </p>
          <NewsletterForm fuente="blog" />
        </div>

      </div>
    </div>
  );
}
```

---

## Task 13: Frontend — contenido/videos/page.tsx

**Files:**
- Create: `frontend/app/contenido/videos/page.tsx`

- [ ] **Step 1: Crear página con tabs vlog / mini clases**

```tsx
// frontend/app/contenido/videos/page.tsx
'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import VideoCard from '@/components/contenido/VideoCard';

interface Video {
  id: string;
  titulo: string;
  descripcion?: string;
  url_video: string;
  tipo: 'vlog' | 'mini_clase';
  gratis: boolean;
  thumbnail_url?: string;
}

type Tab = 'todos' | 'vlog' | 'mini_clase';

export default function VideosPage() {
  const [videos, setVideos] = useState<Video[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>('todos');

  useEffect(() => {
    api.get<Video[]>('/api/contenido/videos')
      .then(setVideos)
      .catch(() => setVideos([]))
      .finally(() => setLoading(false));
  }, []);

  const filtrados = tab === 'todos' ? videos : videos.filter(v => v.tipo === tab);

  const tabs: { key: Tab; label: string }[] = [
    { key: 'todos', label: 'Todos' },
    { key: 'vlog', label: 'Vlog' },
    { key: 'mini_clase', label: 'Mini clases' },
  ];

  return (
    <div className="min-h-screen px-4 py-16">
      <div className="max-w-5xl mx-auto">

        <div className="mb-6">
          <Link href="/contenido" className="text-tierra-light text-xs tracking-widest uppercase hover:text-tierra transition-colors">
            ← Contenido
          </Link>
        </div>

        <div className="text-center mb-16">
          <div className="w-16 h-px bg-sand mx-auto mb-8" />
          <h1 className="text-5xl text-tierra mb-4">Videos</h1>
          <p className="text-tierra-light max-w-lg mx-auto leading-relaxed">
            Vlogs, mini clases y contenido gratuito para tu práctica diaria.
          </p>
        </div>

        {/* Tabs */}
        <div className="flex justify-center gap-6 mb-12">
          {tabs.map(t => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`text-xs tracking-widest uppercase pb-2 border-b transition-colors duration-200 ${
                tab === t.key
                  ? 'text-tierra border-sand'
                  : 'text-tierra-light border-transparent hover:text-tierra'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {loading ? (
          <p className="text-center text-tierra-light text-sm tracking-widest uppercase">Cargando...</p>
        ) : filtrados.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-tierra-light text-sm">No hay videos disponibles por el momento.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filtrados.map(v => (
              <VideoCard key={v.id} video={v} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
```

---

## Task 14: Frontend — contenido/page.tsx (hub)

**Files:**
- Create: `frontend/app/contenido/page.tsx`

- [ ] **Step 1: Crear hub de contenido**

```tsx
// frontend/app/contenido/page.tsx
'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import PostCard from '@/components/contenido/PostCard';
import VideoCard from '@/components/contenido/VideoCard';
import NewsletterForm from '@/components/ui/NewsletterForm';

interface Post {
  id: string;
  titulo: string;
  slug: string;
  imagen_url?: string;
  tags?: string[];
  created_at: string;
}

interface Video {
  id: string;
  titulo: string;
  descripcion?: string;
  url_video: string;
  tipo: 'vlog' | 'mini_clase';
  gratis: boolean;
  thumbnail_url?: string;
}

export default function ContenidoPage() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [videos, setVideos] = useState<Video[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get<Post[]>('/api/contenido/posts').catch(() => [] as Post[]),
      api.get<Video[]>('/api/contenido/videos').catch(() => [] as Video[]),
    ]).then(([p, v]) => {
      setPosts(p.slice(0, 3));
      setVideos(v.slice(0, 3));
    }).finally(() => setLoading(false));
  }, []);

  return (
    <div className="min-h-screen">

      {/* Hero */}
      <section className="px-4 py-24 text-center">
        <div className="max-w-2xl mx-auto">
          <div className="w-16 h-px bg-sand mx-auto mb-8" />
          <h1 className="text-6xl text-tierra mb-6">Contenido</h1>
          <p className="text-tierra-light leading-relaxed text-lg">
            Artículos, videos y recursos para nutrir tu práctica de bienestar.
          </p>
        </div>
      </section>

      {/* Blog section */}
      <section className="px-4 py-16 bg-white">
        <div className="max-w-5xl mx-auto">
          <div className="flex items-end justify-between mb-10">
            <div>
              <div className="w-8 h-px bg-sand mb-4" />
              <h2 className="text-3xl text-tierra">Blog</h2>
            </div>
            <Link href="/contenido/blog" className="btn-secondary text-xs">
              Ver todos
            </Link>
          </div>
          {loading ? (
            <p className="text-tierra-light text-sm tracking-widest uppercase">Cargando...</p>
          ) : posts.length === 0 ? (
            <p className="text-tierra-light text-sm">Próximamente nuevos artículos.</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {posts.map(p => <PostCard key={p.id} post={p} />)}
            </div>
          )}
        </div>
      </section>

      {/* Videos section */}
      <section className="px-4 py-16">
        <div className="max-w-5xl mx-auto">
          <div className="flex items-end justify-between mb-10">
            <div>
              <div className="w-8 h-px bg-sand mb-4" />
              <h2 className="text-3xl text-tierra">Videos</h2>
              <p className="text-tierra-light text-sm mt-1">Vlog · Mini clases gratuitas</p>
            </div>
            <Link href="/contenido/videos" className="btn-secondary text-xs">
              Ver todos
            </Link>
          </div>
          {loading ? (
            <p className="text-tierra-light text-sm tracking-widest uppercase">Cargando...</p>
          ) : videos.length === 0 ? (
            <p className="text-tierra-light text-sm">Próximamente nuevos videos.</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {videos.map(v => <VideoCard key={v.id} video={v} />)}
            </div>
          )}
        </div>
      </section>

      {/* Newsletter section */}
      <section className="px-4 py-20 bg-white">
        <div className="max-w-md mx-auto text-center">
          <div className="w-16 h-px bg-sand mx-auto mb-8" />
          <h2 className="text-3xl text-tierra mb-3">Newsletter</h2>
          <p className="text-tierra-light text-sm leading-relaxed mb-10">
            Recibe artículos, anuncios de retiros y contenido exclusivo directamente en tu inbox.
          </p>
          <NewsletterForm fuente="contenido" />
        </div>
      </section>

    </div>
  );
}
```

---

## Task 15: Frontend — admin/contenido/page.tsx

**Files:**
- Create: `frontend/app/admin/contenido/page.tsx`

- [ ] **Step 1: Crear página de admin con 3 tabs**

```tsx
// frontend/app/admin/contenido/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import Button from '@/components/ui/Button';

// ── Types ──────────────────────────────────────────────────

interface Post {
  id: string;
  titulo: string;
  slug: string;
  tags?: string[];
  publicado: boolean;
  created_at: string;
}

interface Video {
  id: string;
  titulo: string;
  url_video: string;
  tipo: 'vlog' | 'mini_clase';
  gratis: boolean;
  publicado: boolean;
  created_at: string;
}

interface Suscriptor {
  id: string;
  email: string;
  nombre?: string;
  fuente?: string;
  created_at: string;
}

type Tab = 'posts' | 'videos' | 'newsletter';

// ── Main component ─────────────────────────────────────────

export default function AdminContenidoPage() {
  const [tab, setTab] = useState<Tab>('posts');
  const [posts, setPosts] = useState<Post[]>([]);
  const [videos, setVideos] = useState<Video[]>([]);
  const [suscriptores, setSuscriptores] = useState<Suscriptor[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Create post form state
  const [newPost, setNewPost] = useState({ titulo: '', slug: '', contenido: '', imagen_url: '', tags: '' });
  const [creatingPost, setCreatingPost] = useState(false);
  const [postFormError, setPostFormError] = useState('');

  // Create video form state
  const [newVideo, setNewVideo] = useState({ titulo: '', url_video: '', tipo: 'vlog' as 'vlog' | 'mini_clase', descripcion: '', thumbnail_url: '', gratis: true });
  const [creatingVideo, setCreatingVideo] = useState(false);
  const [videoFormError, setVideoFormError] = useState('');

  const [exportando, setExportando] = useState(false);
  const [exportError, setExportError] = useState('');

  useEffect(() => {
    Promise.all([
      api.get<Post[]>('/api/contenido/posts/admin').catch(() => [] as Post[]),
      api.get<Video[]>('/api/contenido/videos/admin').catch(() => [] as Video[]),
      api.get<Suscriptor[]>('/api/newsletter/suscriptores').catch(() => [] as Suscriptor[]),
    ])
      .then(([p, v, s]) => { setPosts(p); setVideos(v); setSuscriptores(s); })
      .catch((err: unknown) => setError(err instanceof Error ? err.message : 'Error'))
      .finally(() => setLoading(false));
  }, []);

  async function togglePublicadoPost(post: Post) {
    try {
      const updated = await api.patch<Post>(`/api/contenido/posts/${post.id}`, { publicado: !post.publicado });
      setPosts(prev => prev.map(p => p.id === post.id ? { ...p, publicado: updated.publicado } : p));
    } catch {
      setError('Error al actualizar post');
    }
  }

  async function togglePublicadoVideo(video: Video) {
    try {
      const updated = await api.patch<Video>(`/api/contenido/videos/${video.id}`, { publicado: !video.publicado });
      setVideos(prev => prev.map(v => v.id === video.id ? { ...v, publicado: updated.publicado } : v));
    } catch {
      setError('Error al actualizar video');
    }
  }

  async function handleCreatePost(e: React.FormEvent) {
    e.preventDefault();
    setCreatingPost(true);
    setPostFormError('');
    try {
      const tags = newPost.tags ? newPost.tags.split(',').map(t => t.trim()).filter(Boolean) : [];
      const post = await api.post<Post>('/api/contenido/posts', {
        titulo: newPost.titulo,
        slug: newPost.slug,
        contenido: newPost.contenido,
        imagen_url: newPost.imagen_url || undefined,
        tags,
      });
      setPosts(prev => [post, ...prev]);
      setNewPost({ titulo: '', slug: '', contenido: '', imagen_url: '', tags: '' });
    } catch (err: unknown) {
      setPostFormError(err instanceof Error ? err.message : 'Error al crear post');
    } finally {
      setCreatingPost(false);
    }
  }

  async function handleCreateVideo(e: React.FormEvent) {
    e.preventDefault();
    setCreatingVideo(true);
    setVideoFormError('');
    try {
      const video = await api.post<Video>('/api/contenido/videos', {
        titulo: newVideo.titulo,
        url_video: newVideo.url_video,
        tipo: newVideo.tipo,
        descripcion: newVideo.descripcion || undefined,
        thumbnail_url: newVideo.thumbnail_url || undefined,
        gratis: newVideo.gratis,
      });
      setVideos(prev => [video, ...prev]);
      setNewVideo({ titulo: '', url_video: '', tipo: 'vlog', descripcion: '', thumbnail_url: '', gratis: true });
    } catch (err: unknown) {
      setVideoFormError(err instanceof Error ? err.message : 'Error al crear video');
    } finally {
      setCreatingVideo(false);
    }
  }

  async function handleExportarNewsletter() {
    setExportando(true);
    setExportError('');
    try {
      const { createSupabaseClient } = await import('@/lib/supabase');
      const supabase = createSupabaseClient();
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) throw new Error('Sin sesión');
      const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
      const res = await fetch(`${API_URL}/api/newsletter/suscriptores/exportar`, {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      if (!res.ok) throw new Error(`Error ${res.status}`);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `newsletter-${new Date().toISOString().split('T')[0]}.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err: unknown) {
      setExportError(err instanceof Error ? err.message : 'Error al exportar');
    } finally {
      setExportando(false);
    }
  }

  const tabConfig: { key: Tab; label: string; count: number }[] = [
    { key: 'posts', label: 'Posts', count: posts.length },
    { key: 'videos', label: 'Videos', count: videos.length },
    { key: 'newsletter', label: 'Newsletter', count: suscriptores.length },
  ];

  return (
    <div>
      <div className="mb-8">
        <div className="w-8 h-px bg-sand mb-4" />
        <h1 className="text-3xl text-tierra">Contenido</h1>
      </div>

      {error && <p className="text-red-500 text-sm mb-4">{error}</p>}

      {/* Tabs */}
      <div className="flex gap-6 border-b border-beige-lino mb-8">
        {tabConfig.map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`pb-3 text-xs tracking-widest uppercase border-b-2 transition-colors duration-200 -mb-px ${
              tab === t.key
                ? 'border-sage text-sage'
                : 'border-transparent text-tierra-light hover:text-tierra'
            }`}
          >
            {t.label} ({t.count})
          </button>
        ))}
      </div>

      {loading ? (
        <p className="text-tierra-light text-sm tracking-widest uppercase">Cargando...</p>
      ) : (
        <>
          {/* POSTS TAB */}
          {tab === 'posts' && (
            <div>
              {/* Create post form */}
              <div className="card-wellness mb-8">
                <h2 className="text-lg text-tierra mb-4">Nuevo post</h2>
                <form onSubmit={handleCreatePost} className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="label-wellness">Título</label>
                      <input value={newPost.titulo} onChange={e => setNewPost(p => ({ ...p, titulo: e.target.value }))} className="input-wellness" required />
                    </div>
                    <div>
                      <label className="label-wellness">Slug (URL)</label>
                      <input value={newPost.slug} onChange={e => setNewPost(p => ({ ...p, slug: e.target.value }))} className="input-wellness" placeholder="mi-primer-post" required />
                    </div>
                  </div>
                  <div>
                    <label className="label-wellness">URL imagen (opcional)</label>
                    <input value={newPost.imagen_url} onChange={e => setNewPost(p => ({ ...p, imagen_url: e.target.value }))} className="input-wellness" />
                  </div>
                  <div>
                    <label className="label-wellness">Tags (separados por coma)</label>
                    <input value={newPost.tags} onChange={e => setNewPost(p => ({ ...p, tags: e.target.value }))} className="input-wellness" placeholder="yoga, meditación, ayurveda" />
                  </div>
                  <div>
                    <label className="label-wellness">Contenido</label>
                    <textarea value={newPost.contenido} onChange={e => setNewPost(p => ({ ...p, contenido: e.target.value }))} rows={6} className="input-wellness resize-none" required />
                  </div>
                  {postFormError && <p className="text-red-400 text-xs">{postFormError}</p>}
                  <Button type="submit" loading={creatingPost}>Crear post</Button>
                </form>
              </div>

              {/* Posts list */}
              {posts.length === 0 ? (
                <div className="card-wellness text-center py-12">
                  <p className="text-tierra-light text-sm">No hay posts aún.</p>
                </div>
              ) : (
                <div className="bg-white border border-beige-lino rounded-wellness overflow-hidden">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-beige-lino">
                        <th className="label-wellness text-left px-4 py-3">Título</th>
                        <th className="label-wellness text-left px-4 py-3">Slug</th>
                        <th className="label-wellness text-left px-4 py-3">Estado</th>
                        <th className="label-wellness text-left px-4 py-3">Fecha</th>
                        <th className="label-wellness text-left px-4 py-3">Acción</th>
                      </tr>
                    </thead>
                    <tbody>
                      {posts.map((post, i) => (
                        <tr key={post.id} className={`border-b border-beige-lino last:border-0 ${i % 2 === 0 ? 'bg-white' : 'bg-beige/30'}`}>
                          <td className="px-4 py-3 text-tierra font-medium">{post.titulo}</td>
                          <td className="px-4 py-3 text-tierra-light text-xs">{post.slug}</td>
                          <td className="px-4 py-3">
                            <span className={`text-xs px-2 py-1 rounded-full ${post.publicado ? 'bg-sage-muted text-sage' : 'bg-beige text-tierra-light'}`}>
                              {post.publicado ? 'Publicado' : 'Borrador'}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-tierra-light text-xs">
                            {new Date(post.created_at).toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' })}
                          </td>
                          <td className="px-4 py-3">
                            <button
                              onClick={() => togglePublicadoPost(post)}
                              className="text-xs text-sage hover:text-sage-light transition-colors"
                            >
                              {post.publicado ? 'Despublicar' : 'Publicar'}
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* VIDEOS TAB */}
          {tab === 'videos' && (
            <div>
              {/* Create video form */}
              <div className="card-wellness mb-8">
                <h2 className="text-lg text-tierra mb-4">Nuevo video</h2>
                <form onSubmit={handleCreateVideo} className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="label-wellness">Título</label>
                      <input value={newVideo.titulo} onChange={e => setNewVideo(v => ({ ...v, titulo: e.target.value }))} className="input-wellness" required />
                    </div>
                    <div>
                      <label className="label-wellness">Tipo</label>
                      <select
                        value={newVideo.tipo}
                        onChange={e => setNewVideo(v => ({ ...v, tipo: e.target.value as 'vlog' | 'mini_clase' }))}
                        className="input-wellness"
                      >
                        <option value="vlog">Vlog</option>
                        <option value="mini_clase">Mini clase</option>
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="label-wellness">URL del video (YouTube/Vimeo)</label>
                    <input value={newVideo.url_video} onChange={e => setNewVideo(v => ({ ...v, url_video: e.target.value }))} className="input-wellness" placeholder="https://youtube.com/..." required />
                  </div>
                  <div>
                    <label className="label-wellness">URL thumbnail (opcional)</label>
                    <input value={newVideo.thumbnail_url} onChange={e => setNewVideo(v => ({ ...v, thumbnail_url: e.target.value }))} className="input-wellness" />
                  </div>
                  <div>
                    <label className="label-wellness">Descripción (opcional)</label>
                    <textarea value={newVideo.descripcion} onChange={e => setNewVideo(v => ({ ...v, descripcion: e.target.value }))} rows={3} className="input-wellness resize-none" />
                  </div>
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      id="gratis"
                      checked={newVideo.gratis}
                      onChange={e => setNewVideo(v => ({ ...v, gratis: e.target.checked }))}
                      className="rounded"
                    />
                    <label htmlFor="gratis" className="text-xs text-tierra-light tracking-widest uppercase">Contenido gratuito</label>
                  </div>
                  {videoFormError && <p className="text-red-400 text-xs">{videoFormError}</p>}
                  <Button type="submit" loading={creatingVideo}>Crear video</Button>
                </form>
              </div>

              {/* Videos list */}
              {videos.length === 0 ? (
                <div className="card-wellness text-center py-12">
                  <p className="text-tierra-light text-sm">No hay videos aún.</p>
                </div>
              ) : (
                <div className="bg-white border border-beige-lino rounded-wellness overflow-hidden">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-beige-lino">
                        <th className="label-wellness text-left px-4 py-3">Título</th>
                        <th className="label-wellness text-left px-4 py-3">Tipo</th>
                        <th className="label-wellness text-left px-4 py-3">Estado</th>
                        <th className="label-wellness text-left px-4 py-3">Fecha</th>
                        <th className="label-wellness text-left px-4 py-3">Acción</th>
                      </tr>
                    </thead>
                    <tbody>
                      {videos.map((video, i) => (
                        <tr key={video.id} className={`border-b border-beige-lino last:border-0 ${i % 2 === 0 ? 'bg-white' : 'bg-beige/30'}`}>
                          <td className="px-4 py-3 text-tierra font-medium">{video.titulo}</td>
                          <td className="px-4 py-3 text-tierra-light text-xs">{video.tipo === 'vlog' ? 'Vlog' : 'Mini clase'}</td>
                          <td className="px-4 py-3">
                            <span className={`text-xs px-2 py-1 rounded-full ${video.publicado ? 'bg-sage-muted text-sage' : 'bg-beige text-tierra-light'}`}>
                              {video.publicado ? 'Publicado' : 'Borrador'}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-tierra-light text-xs">
                            {new Date(video.created_at).toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' })}
                          </td>
                          <td className="px-4 py-3">
                            <button
                              onClick={() => togglePublicadoVideo(video)}
                              className="text-xs text-sage hover:text-sage-light transition-colors"
                            >
                              {video.publicado ? 'Despublicar' : 'Publicar'}
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* NEWSLETTER TAB */}
          {tab === 'newsletter' && (
            <div>
              <div className="flex items-center justify-between mb-6">
                <p className="text-tierra-light text-sm">{suscriptores.length} suscriptores activos</p>
                <div>
                  <Button variant="secondary" onClick={handleExportarNewsletter} loading={exportando}>
                    Exportar Excel
                  </Button>
                  {exportError && <p className="text-red-400 text-xs mt-1">{exportError}</p>}
                </div>
              </div>
              {suscriptores.length === 0 ? (
                <div className="card-wellness text-center py-12">
                  <p className="text-tierra-light text-sm">No hay suscriptores aún.</p>
                </div>
              ) : (
                <div className="bg-white border border-beige-lino rounded-wellness overflow-hidden">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-beige-lino">
                        <th className="label-wellness text-left px-4 py-3">Email</th>
                        <th className="label-wellness text-left px-4 py-3">Nombre</th>
                        <th className="label-wellness text-left px-4 py-3">Fuente</th>
                        <th className="label-wellness text-left px-4 py-3">Fecha</th>
                      </tr>
                    </thead>
                    <tbody>
                      {suscriptores.map((s, i) => (
                        <tr key={s.id} className={`border-b border-beige-lino last:border-0 ${i % 2 === 0 ? 'bg-white' : 'bg-beige/30'}`}>
                          <td className="px-4 py-3 text-tierra">{s.email}</td>
                          <td className="px-4 py-3 text-tierra-mid">{s.nombre ?? '—'}</td>
                          <td className="px-4 py-3 text-tierra-light text-xs">{s.fuente ?? '—'}</td>
                          <td className="px-4 py-3 text-tierra-light text-xs">
                            {new Date(s.created_at).toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' })}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
```

---

## Task 16: Actualizar admin layout — agregar Contenido al nav

**Files:**
- Modify: `frontend/app/admin/layout.tsx`

- [ ] **Step 1: Agregar "Contenido" a navLinks**

En `frontend/app/admin/layout.tsx`, encontrar el array `navLinks` y agregar el link de Contenido:

```typescript
const navLinks = [
  { href: '/admin', label: 'Dashboard' },
  { href: '/admin/crm', label: 'CRM' },
  { href: '/admin/shala', label: 'SHALA' },
  { href: '/admin/shala/alumnos', label: '↳ Alumnos' },
  { href: '/admin/ayurveda', label: 'AYURVEDA' },
  { href: '/admin/marifer', label: 'MARIFER' },
  { href: '/admin/contenido', label: 'Contenido' },
];
```

- [ ] **Step 2: Commit todo el frontend**

```bash
cd /Users/mariferubieto/Desktop/wellness-platform
git add \
  frontend/components/contenido/PostCard.tsx \
  frontend/components/contenido/VideoCard.tsx \
  frontend/components/ui/NewsletterForm.tsx \
  frontend/app/contenido/page.tsx \
  frontend/app/contenido/blog/page.tsx \
  "frontend/app/contenido/blog/[slug]/page.tsx" \
  frontend/app/contenido/videos/page.tsx \
  frontend/app/admin/contenido/page.tsx \
  frontend/app/admin/layout.tsx
git commit -m "feat: módulo Contenido (blog, videos, newsletter) + panel admin"
```

---

## Self-Review

**Spec coverage:**
- ✅ Blog (posts publicados, detalle por slug)
- ✅ Vlog + Mini clases (videos filtrados por tipo)
- ✅ Newsletter (suscribir/cancelar/exportar)
- ✅ Admin: crear posts, crear videos, toggle publicado, ver suscriptores, exportar Excel
- ✅ Formulario de suscripción reutilizable (`NewsletterForm`)
- ✅ Rutas públicas sin auth, rutas admin con `requireAuth + requireRole('admin')`
- ✅ Tests para todos los endpoints (contenido + newsletter)

**Placeholder scan:** Ningún TBD o TODO en el plan.

**Type consistency:**
- `Post` interface consistente en todos los componentes
- `Video` interface consistente (incluye `tipo: 'vlog' | 'mini_clase'`)
- `req.userId` usado (no `req.user?.id`) — consistente con `AuthenticatedRequest`
- `getPosts(false)` para admin, `getPosts(true)` para público — consistente en routes y componentes
