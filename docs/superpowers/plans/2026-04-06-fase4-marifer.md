# Fase 4 — MARIFER: Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the complete MARIFER module — retiros y eventos con formularios de inscripción, botones de WhatsApp, y panel admin con exportación Excel.

**Architecture:** Express.js services en `backend/src/services/` + routes en `backend/src/routes/retiros/` y `backend/src/routes/eventos/`. Frontend en `frontend/app/retiros/`, `frontend/app/eventos/` y `frontend/app/admin/marifer/`. Pagos crean registro `pendiente` (Mercado Pago real en Fase 6). Retiros siempre muestran formulario + botón WhatsApp. Eventos tienen lógica condicional según `tipo_acceso` (pago → formulario, whatsapp → botón WA, gratis → formulario gratuito).

**Tech Stack:** TypeScript, Express.js, Supabase (supabaseAdmin), Jest + Supertest, Next.js 14 App Router, Tailwind CSS wellness tokens, xlsx.

---

## File Map

| File | Action | Responsibility |
|---|---|---|
| `database/migrations/004_marifer_schema.sql` | Create | Tables: retiros, inscripciones_retiro, eventos, inscripciones_evento |
| `backend/src/services/retiros.service.ts` | Create | CRUD retiros + crear inscripción retiro |
| `backend/src/services/eventos.service.ts` | Create | CRUD eventos + crear inscripción evento |
| `backend/src/services/marifer-admin.service.ts` | Create | Admin: inscritos por retiro/evento, export Excel |
| `backend/src/routes/retiros/index.ts` | Create | Routes: catálogo, detalle, admin CRUD, inscripciones |
| `backend/src/routes/eventos/index.ts` | Create | Routes: catálogo, detalle, admin CRUD, inscripciones |
| `backend/src/app.ts` | Modify | Register `/api/retiros` y `/api/eventos` |
| `backend/src/routes/admin.ts` | Modify | Add marifer admin endpoints |
| `backend/tests/retiros.test.ts` | Create | Tests retiros routes |
| `backend/tests/eventos.test.ts` | Create | Tests eventos routes |
| `backend/tests/admin-marifer.test.ts` | Create | Tests admin marifer routes |
| `frontend/components/marifer/RetiroCard.tsx` | Create | Card para catálogo de retiros |
| `frontend/components/marifer/EventoCard.tsx` | Create | Card para catálogo de eventos |
| `frontend/app/retiros/page.tsx` | Create | Catálogo público de retiros |
| `frontend/app/retiros/[id]/page.tsx` | Create | Detalle retiro + botón inscribirse + WhatsApp |
| `frontend/app/retiros/inscripcion/page.tsx` | Create | Formulario inscripción retiro |
| `frontend/app/eventos/page.tsx` | Create | Catálogo público de eventos |
| `frontend/app/eventos/[id]/page.tsx` | Create | Detalle evento (condicional por tipo_acceso) |
| `frontend/app/eventos/inscripcion/page.tsx` | Create | Formulario inscripción evento (pago/gratis) |
| `frontend/app/admin/marifer/page.tsx` | Create | Admin: retiros + eventos + inscritos + export |
| `frontend/app/admin/layout.tsx` | Modify | Add MARIFER nav link |

---

## Task 1: DB schema — tablas MARIFER

**Files:**
- Create: `database/migrations/004_marifer_schema.sql`

- [ ] **Step 1: Crear archivo de migración**

```sql
-- database/migrations/004_marifer_schema.sql
-- Run this in Supabase SQL Editor after 003_ayurveda_schema.sql

-- retiros
CREATE TABLE IF NOT EXISTS retiros (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre            text NOT NULL,
  descripcion       text,
  lugar             text,
  incluye           text,
  precio            numeric(10,2) NOT NULL CHECK (precio >= 0),
  fecha_inicio      date,
  fecha_fin         date,
  imagen_url        text,
  whatsapp_contacto text,
  activo            boolean DEFAULT true,
  created_at        timestamptz DEFAULT now()
);

-- inscripciones_retiro
CREATE TABLE IF NOT EXISTS inscripciones_retiro (
  id                          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                     uuid REFERENCES users(id) ON DELETE SET NULL,
  retiro_id                   uuid REFERENCES retiros(id) ON DELETE CASCADE,
  nombre_completo             text NOT NULL,
  fecha_nacimiento            date,
  whatsapp                    text NOT NULL,
  email                       text NOT NULL,
  instagram                   text,
  ciudad                      text,
  razon                       text,
  restricciones_alimenticias  text,
  pago_id                     uuid REFERENCES pagos(id) ON DELETE SET NULL,
  estado_pago                 text NOT NULL DEFAULT 'pendiente' CHECK (estado_pago IN ('pendiente', 'completado', 'fallido')),
  created_at                  timestamptz DEFAULT now()
);

-- eventos
CREATE TABLE IF NOT EXISTS eventos (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre            text NOT NULL,
  descripcion       text,
  lugar             text,
  flyer_url         text,
  precio            numeric(10,2),
  fecha             timestamptz,
  tipo_acceso       text NOT NULL DEFAULT 'pago' CHECK (tipo_acceso IN ('pago', 'whatsapp', 'gratis')),
  whatsapp_contacto text,
  activo            boolean DEFAULT true,
  created_at        timestamptz DEFAULT now()
);

-- inscripciones_evento
CREATE TABLE IF NOT EXISTS inscripciones_evento (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          uuid REFERENCES users(id) ON DELETE SET NULL,
  evento_id        uuid REFERENCES eventos(id) ON DELETE CASCADE,
  nombre_completo  text NOT NULL,
  email            text NOT NULL,
  whatsapp         text NOT NULL,
  pago_id          uuid REFERENCES pagos(id) ON DELETE SET NULL,
  estado_pago      text NOT NULL DEFAULT 'pendiente' CHECK (estado_pago IN ('pendiente', 'completado', 'fallido')),
  created_at       timestamptz DEFAULT now()
);

-- RLS
ALTER TABLE retiros ENABLE ROW LEVEL SECURITY;
ALTER TABLE inscripciones_retiro ENABLE ROW LEVEL SECURITY;
ALTER TABLE eventos ENABLE ROW LEVEL SECURITY;
ALTER TABLE inscripciones_evento ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service_role_all_retiros" ON retiros FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_all_inscripciones_retiro" ON inscripciones_retiro FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_all_eventos" ON eventos FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_all_inscripciones_evento" ON inscripciones_evento FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_retiros_activo ON retiros(activo);
CREATE INDEX IF NOT EXISTS idx_retiros_fecha ON retiros(fecha_inicio);
CREATE INDEX IF NOT EXISTS idx_inscripciones_retiro_id ON inscripciones_retiro(retiro_id);
CREATE INDEX IF NOT EXISTS idx_eventos_activo ON eventos(activo);
CREATE INDEX IF NOT EXISTS idx_eventos_fecha ON eventos(fecha);
CREATE INDEX IF NOT EXISTS idx_inscripciones_evento_id ON inscripciones_evento(evento_id);
```

- [ ] **Step 2: Verificar conteo de tablas**

```bash
grep "CREATE TABLE" database/migrations/004_marifer_schema.sql | wc -l
# Expected: 4
```

- [ ] **Step 3: Commit**

```bash
git add database/migrations/004_marifer_schema.sql
git commit -m "feat: schema SQL fase 4 - tablas MARIFER (retiros, eventos, inscripciones)"
```

---

## Task 2: Backend — Retiros service + routes + tests

**Files:**
- Create: `backend/src/services/retiros.service.ts`
- Create: `backend/src/routes/retiros/index.ts`
- Create: `backend/tests/retiros.test.ts`

- [ ] **Step 1: Escribir el test primero**

```typescript
// backend/tests/retiros.test.ts
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

describe('GET /api/retiros', () => {
  it('returns active retiros (public)', async () => {
    mockFrom.mockReturnValueOnce({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      order: jest.fn().mockResolvedValueOnce({
        data: [
          {
            id: 'ret-1',
            nombre: 'Retiro de Meditación',
            descripcion: 'Retiro en la montaña',
            lugar: 'Tepoztlán',
            precio: 8500,
            fecha_inicio: '2026-06-01',
            fecha_fin: '2026-06-03',
            activo: true,
          },
        ],
        error: null,
      }),
    });

    const res = await request(app).get('/api/retiros');
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0].nombre).toBe('Retiro de Meditación');
  });
});

describe('GET /api/retiros/:id', () => {
  it('returns retiro detail (public)', async () => {
    mockFrom.mockReturnValueOnce({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValueOnce({
        data: {
          id: 'ret-1',
          nombre: 'Retiro de Meditación',
          descripcion: 'Retiro en la montaña',
          lugar: 'Tepoztlán',
          incluye: 'Hospedaje, 3 comidas, sesiones guiadas',
          precio: 8500,
          fecha_inicio: '2026-06-01',
          fecha_fin: '2026-06-03',
          whatsapp_contacto: '5512345678',
          activo: true,
        },
        error: null,
      }),
    });

    const res = await request(app).get('/api/retiros/ret-1');
    expect(res.status).toBe(200);
    expect(res.body.incluye).toBeTruthy();
    expect(res.body.whatsapp_contacto).toBe('5512345678');
  });

  it('returns 404 when not found', async () => {
    mockFrom.mockReturnValueOnce({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValueOnce({ data: null, error: { message: 'Not found' } }),
    });

    const res = await request(app).get('/api/retiros/no-existe');
    expect(res.status).toBe(404);
  });
});

describe('POST /api/retiros (admin)', () => {
  it('creates a retiro (admin only)', async () => {
    mockAdminAuth();

    mockFrom.mockReturnValueOnce({
      insert: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValueOnce({
        data: { id: 'ret-new', nombre: 'Nuevo Retiro', precio: 7000, activo: true },
        error: null,
      }),
    });

    const res = await request(app)
      .post('/api/retiros')
      .set('Authorization', 'Bearer admin-token')
      .send({ nombre: 'Nuevo Retiro', precio: 7000 });

    expect(res.status).toBe(201);
    expect(res.body.id).toBe('ret-new');
  });

  it('rejects non-admin', async () => {
    mockGetUser.mockResolvedValueOnce({ data: { user: { id: 'auth-user' } }, error: null });
    mockFrom.mockReturnValueOnce({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValueOnce({
        data: { id: 'u1', rol: 'user', nombre: 'User', email: 'u@t.com', tags: [] },
        error: null,
      }),
    });

    const res = await request(app)
      .post('/api/retiros')
      .set('Authorization', 'Bearer user-token')
      .send({ nombre: 'Test', precio: 1000 });

    expect(res.status).toBe(403);
  });
});

describe('POST /api/retiros/inscripciones', () => {
  it('creates an inscription without auth', async () => {
    // 1) check retiro exists
    mockFrom.mockReturnValueOnce({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValueOnce({
        data: { id: 'ret-1', nombre: 'Retiro de Meditación', activo: true },
        error: null,
      }),
    });

    // 2) insert inscripcion
    mockFrom.mockReturnValueOnce({
      insert: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValueOnce({
        data: {
          id: 'insc-ret-1',
          retiro_id: 'ret-1',
          nombre_completo: 'Ana García',
          whatsapp: '5512345678',
          email: 'ana@gmail.com',
          estado_pago: 'pendiente',
        },
        error: null,
      }),
    });

    const res = await request(app)
      .post('/api/retiros/inscripciones')
      .send({
        retiro_id: 'ret-1',
        nombre_completo: 'Ana García',
        whatsapp: '5512345678',
        email: 'ana@gmail.com',
      });

    expect(res.status).toBe(201);
    expect(res.body.nombre_completo).toBe('Ana García');
    expect(res.body.estado_pago).toBe('pendiente');
  });

  it('returns 400 when required fields missing', async () => {
    const res = await request(app)
      .post('/api/retiros/inscripciones')
      .send({ retiro_id: 'ret-1' });

    expect(res.status).toBe(400);
  });

  it('returns 404 when retiro not found', async () => {
    mockFrom.mockReturnValueOnce({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValueOnce({ data: null, error: { message: 'Not found' } }),
    });

    const res = await request(app)
      .post('/api/retiros/inscripciones')
      .send({ retiro_id: 'no-existe', nombre_completo: 'Ana', whatsapp: '55', email: 'a@b.com' });

    expect(res.status).toBe(404);
  });
});
```

- [ ] **Step 2: Ejecutar test — debe FALLAR**

```bash
cd backend && node_modules/.bin/jest tests/retiros.test.ts --no-coverage 2>&1 | tail -10
# Expected: FAIL — routes don't exist yet
```

- [ ] **Step 3: Crear el servicio**

```typescript
// backend/src/services/retiros.service.ts
import { supabaseAdmin } from '../config/supabase';

export async function getRetiros() {
  const { data, error } = await supabaseAdmin
    .from('retiros')
    .select('id, nombre, descripcion, lugar, precio, fecha_inicio, fecha_fin, imagen_url, whatsapp_contacto, activo')
    .eq('activo', true)
    .order('fecha_inicio', { ascending: true });

  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function getRetiroById(id: string) {
  const { data, error } = await supabaseAdmin
    .from('retiros')
    .select('id, nombre, descripcion, lugar, incluye, precio, fecha_inicio, fecha_fin, imagen_url, whatsapp_contacto, activo')
    .eq('id', id)
    .single();

  if (error) throw new Error(error.message);
  return data;
}

export async function createRetiro(body: {
  nombre: string;
  descripcion?: string;
  lugar?: string;
  incluye?: string;
  precio: number;
  fecha_inicio?: string;
  fecha_fin?: string;
  imagen_url?: string;
  whatsapp_contacto?: string;
}) {
  const { data, error } = await supabaseAdmin
    .from('retiros')
    .insert({
      nombre: body.nombre,
      descripcion: body.descripcion ?? null,
      lugar: body.lugar ?? null,
      incluye: body.incluye ?? null,
      precio: body.precio,
      fecha_inicio: body.fecha_inicio ?? null,
      fecha_fin: body.fecha_fin ?? null,
      imagen_url: body.imagen_url ?? null,
      whatsapp_contacto: body.whatsapp_contacto ?? null,
    })
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data;
}

export async function updateRetiro(id: string, body: Partial<{
  nombre: string;
  descripcion: string;
  lugar: string;
  incluye: string;
  precio: number;
  fecha_inicio: string;
  fecha_fin: string;
  imagen_url: string;
  whatsapp_contacto: string;
  activo: boolean;
}>) {
  const { data, error } = await supabaseAdmin
    .from('retiros')
    .update(body)
    .eq('id', id)
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data;
}

export async function crearInscripcionRetiro(body: {
  retiro_id: string;
  nombre_completo: string;
  fecha_nacimiento?: string;
  whatsapp: string;
  email: string;
  instagram?: string;
  ciudad?: string;
  razon?: string;
  restricciones_alimenticias?: string;
  user_id?: string;
}) {
  const { data: retiro, error: retiroError } = await supabaseAdmin
    .from('retiros')
    .select('id, activo')
    .eq('id', body.retiro_id)
    .single();

  if (retiroError || !retiro) throw new Error('Retiro no encontrado');
  if (!retiro.activo) throw new Error('Retiro no disponible');

  const { data, error } = await supabaseAdmin
    .from('inscripciones_retiro')
    .insert({
      retiro_id: body.retiro_id,
      nombre_completo: body.nombre_completo,
      fecha_nacimiento: body.fecha_nacimiento ?? null,
      whatsapp: body.whatsapp,
      email: body.email,
      instagram: body.instagram ?? null,
      ciudad: body.ciudad ?? null,
      razon: body.razon ?? null,
      restricciones_alimenticias: body.restricciones_alimenticias ?? null,
      user_id: body.user_id ?? null,
      estado_pago: 'pendiente',
    })
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data;
}
```

- [ ] **Step 4: Crear las rutas**

```typescript
// backend/src/routes/retiros/index.ts
import { Router, Request, Response } from 'express';
import { requireAuth } from '../../middleware/auth';
import { requireRole } from '../../middleware/requireRole';
import type { AuthenticatedRequest } from '../../middleware/auth';
import {
  getRetiros,
  getRetiroById,
  createRetiro,
  updateRetiro,
  crearInscripcionRetiro,
} from '../../services/retiros.service';

const router = Router();

// Public: catalog
router.get('/', async (_req: Request, res: Response): Promise<void> => {
  try {
    const retiros = await getRetiros();
    res.json(retiros);
  } catch (err: unknown) {
    res.status(500).json({ error: err instanceof Error ? err.message : 'Error' });
  }
});

// Public: inscripcion — MUST be before /:id to avoid param capture
router.post('/inscripciones', async (req: Request, res: Response): Promise<void> => {
  try {
    const { retiro_id, nombre_completo, fecha_nacimiento, whatsapp, email, instagram, ciudad, razon, restricciones_alimenticias, user_id } = req.body;

    if (!retiro_id || !nombre_completo || !whatsapp || !email) {
      res.status(400).json({ error: 'retiro_id, nombre_completo, whatsapp y email son requeridos' });
      return;
    }

    const inscripcion = await crearInscripcionRetiro({
      retiro_id, nombre_completo, fecha_nacimiento, whatsapp, email,
      instagram, ciudad, razon, restricciones_alimenticias, user_id,
    });

    res.status(201).json(inscripcion);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Error';
    if (message.includes('no encontrado') || message.includes('no disponible')) {
      res.status(404).json({ error: message });
      return;
    }
    res.status(400).json({ error: message });
  }
});

// Public: detail
router.get('/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const retiro = await getRetiroById(req.params.id);
    res.json(retiro);
  } catch (err: unknown) {
    res.status(404).json({ error: err instanceof Error ? err.message : 'No encontrado' });
  }
});

// Admin: create
router.post('/', requireAuth, requireRole('admin'), async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { nombre, precio } = req.body;
    if (!nombre || precio === undefined) {
      res.status(400).json({ error: 'nombre y precio son requeridos' });
      return;
    }
    const retiro = await createRetiro({ ...req.body, precio: Number(req.body.precio) });
    res.status(201).json(retiro);
  } catch (err: unknown) {
    res.status(400).json({ error: err instanceof Error ? err.message : 'Error' });
  }
});

// Admin: update
router.patch('/:id', requireAuth, requireRole('admin'), async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const retiro = await updateRetiro(req.params.id, req.body);
    res.json(retiro);
  } catch (err: unknown) {
    res.status(400).json({ error: err instanceof Error ? err.message : 'Error' });
  }
});

export default router;
```

- [ ] **Step 5: Registrar en app.ts**

En `backend/src/app.ts`, agregar después de `import ayurvedaRouter`:

```typescript
import retirosRouter from './routes/retiros/index';
```

Y después de `app.use('/api/ayurveda', ayurvedaRouter);`:

```typescript
app.use('/api/retiros', retirosRouter);
```

- [ ] **Step 6: Ejecutar tests — todos deben pasar**

```bash
cd backend && node_modules/.bin/jest tests/retiros.test.ts --no-coverage 2>&1 | tail -15
# Expected: PASS — 7 tests
```

- [ ] **Step 7: Ejecutar todos los tests**

```bash
cd backend && node_modules/.bin/jest tests/ --no-coverage 2>&1 | tail -10
# Expected: all suites passing
```

- [ ] **Step 8: Commit**

```bash
git add backend/src/services/retiros.service.ts \
        backend/src/routes/retiros/index.ts \
        backend/src/app.ts \
        backend/tests/retiros.test.ts
git commit -m "feat: retiros service + routes (catálogo público, inscripción, CRUD admin)"
```

---

## Task 3: Backend — Eventos service + routes + tests

**Files:**
- Create: `backend/src/services/eventos.service.ts`
- Create: `backend/src/routes/eventos/index.ts`
- Create: `backend/tests/eventos.test.ts`

- [ ] **Step 1: Escribir el test primero**

```typescript
// backend/tests/eventos.test.ts
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

describe('GET /api/eventos', () => {
  it('returns active events (public)', async () => {
    mockFrom.mockReturnValueOnce({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      order: jest.fn().mockResolvedValueOnce({
        data: [
          {
            id: 'evt-1',
            nombre: 'Taller de Yoga',
            precio: 350,
            fecha: '2026-05-15T10:00:00Z',
            tipo_acceso: 'pago',
            activo: true,
          },
        ],
        error: null,
      }),
    });

    const res = await request(app).get('/api/eventos');
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0].tipo_acceso).toBe('pago');
  });
});

describe('GET /api/eventos/:id', () => {
  it('returns evento detail (public)', async () => {
    mockFrom.mockReturnValueOnce({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValueOnce({
        data: {
          id: 'evt-1',
          nombre: 'Taller de Yoga',
          descripcion: 'Workshop intensivo',
          lugar: 'CDMX',
          flyer_url: null,
          precio: 350,
          fecha: '2026-05-15T10:00:00Z',
          tipo_acceso: 'pago',
          whatsapp_contacto: '5512345678',
          activo: true,
        },
        error: null,
      }),
    });

    const res = await request(app).get('/api/eventos/evt-1');
    expect(res.status).toBe(200);
    expect(res.body.tipo_acceso).toBe('pago');
  });

  it('returns 404 when not found', async () => {
    mockFrom.mockReturnValueOnce({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValueOnce({ data: null, error: { message: 'Not found' } }),
    });

    const res = await request(app).get('/api/eventos/no-existe');
    expect(res.status).toBe(404);
  });
});

describe('POST /api/eventos (admin)', () => {
  it('creates an evento (admin only)', async () => {
    mockAdminAuth();

    mockFrom.mockReturnValueOnce({
      insert: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValueOnce({
        data: { id: 'evt-new', nombre: 'Nuevo Evento', tipo_acceso: 'pago', activo: true },
        error: null,
      }),
    });

    const res = await request(app)
      .post('/api/eventos')
      .set('Authorization', 'Bearer admin-token')
      .send({ nombre: 'Nuevo Evento', tipo_acceso: 'pago' });

    expect(res.status).toBe(201);
    expect(res.body.id).toBe('evt-new');
  });

  it('rejects non-admin', async () => {
    mockGetUser.mockResolvedValueOnce({ data: { user: { id: 'auth-user' } }, error: null });
    mockFrom.mockReturnValueOnce({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValueOnce({
        data: { id: 'u1', rol: 'user', nombre: 'User', email: 'u@t.com', tags: [] },
        error: null,
      }),
    });

    const res = await request(app)
      .post('/api/eventos')
      .set('Authorization', 'Bearer user-token')
      .send({ nombre: 'Test' });

    expect(res.status).toBe(403);
  });
});

describe('POST /api/eventos/inscripciones', () => {
  it('creates an inscription (public)', async () => {
    // 1) check evento exists
    mockFrom.mockReturnValueOnce({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValueOnce({
        data: { id: 'evt-1', nombre: 'Taller de Yoga', activo: true, tipo_acceso: 'pago' },
        error: null,
      }),
    });

    // 2) insert inscripcion
    mockFrom.mockReturnValueOnce({
      insert: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValueOnce({
        data: {
          id: 'insc-evt-1',
          evento_id: 'evt-1',
          nombre_completo: 'Ana García',
          email: 'ana@gmail.com',
          whatsapp: '5512345678',
          estado_pago: 'pendiente',
        },
        error: null,
      }),
    });

    const res = await request(app)
      .post('/api/eventos/inscripciones')
      .send({
        evento_id: 'evt-1',
        nombre_completo: 'Ana García',
        email: 'ana@gmail.com',
        whatsapp: '5512345678',
      });

    expect(res.status).toBe(201);
    expect(res.body.nombre_completo).toBe('Ana García');
    expect(res.body.estado_pago).toBe('pendiente');
  });

  it('returns 400 when required fields missing', async () => {
    const res = await request(app)
      .post('/api/eventos/inscripciones')
      .send({ evento_id: 'evt-1' });

    expect(res.status).toBe(400);
  });

  it('returns 404 when evento not found', async () => {
    mockFrom.mockReturnValueOnce({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValueOnce({ data: null, error: { message: 'Not found' } }),
    });

    const res = await request(app)
      .post('/api/eventos/inscripciones')
      .send({ evento_id: 'no-existe', nombre_completo: 'Ana', email: 'a@b.com', whatsapp: '55' });

    expect(res.status).toBe(404);
  });
});
```

- [ ] **Step 2: Ejecutar test — debe FALLAR**

```bash
cd backend && node_modules/.bin/jest tests/eventos.test.ts --no-coverage 2>&1 | tail -10
# Expected: FAIL
```

- [ ] **Step 3: Crear el servicio**

```typescript
// backend/src/services/eventos.service.ts
import { supabaseAdmin } from '../config/supabase';

export async function getEventos() {
  const { data, error } = await supabaseAdmin
    .from('eventos')
    .select('id, nombre, descripcion, lugar, flyer_url, precio, fecha, tipo_acceso, whatsapp_contacto, activo')
    .eq('activo', true)
    .order('fecha', { ascending: true });

  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function getEventoById(id: string) {
  const { data, error } = await supabaseAdmin
    .from('eventos')
    .select('id, nombre, descripcion, lugar, flyer_url, precio, fecha, tipo_acceso, whatsapp_contacto, activo')
    .eq('id', id)
    .single();

  if (error) throw new Error(error.message);
  return data;
}

export async function createEvento(body: {
  nombre: string;
  descripcion?: string;
  lugar?: string;
  flyer_url?: string;
  precio?: number;
  fecha?: string;
  tipo_acceso?: string;
  whatsapp_contacto?: string;
}) {
  const { data, error } = await supabaseAdmin
    .from('eventos')
    .insert({
      nombre: body.nombre,
      descripcion: body.descripcion ?? null,
      lugar: body.lugar ?? null,
      flyer_url: body.flyer_url ?? null,
      precio: body.precio ?? null,
      fecha: body.fecha ?? null,
      tipo_acceso: body.tipo_acceso ?? 'pago',
      whatsapp_contacto: body.whatsapp_contacto ?? null,
    })
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data;
}

export async function updateEvento(id: string, body: Partial<{
  nombre: string;
  descripcion: string;
  lugar: string;
  flyer_url: string;
  precio: number;
  fecha: string;
  tipo_acceso: string;
  whatsapp_contacto: string;
  activo: boolean;
}>) {
  const { data, error } = await supabaseAdmin
    .from('eventos')
    .update(body)
    .eq('id', id)
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data;
}

export async function crearInscripcionEvento(body: {
  evento_id: string;
  nombre_completo: string;
  email: string;
  whatsapp: string;
  user_id?: string;
}) {
  const { data: evento, error: eventoError } = await supabaseAdmin
    .from('eventos')
    .select('id, activo, tipo_acceso')
    .eq('id', body.evento_id)
    .single();

  if (eventoError || !evento) throw new Error('Evento no encontrado');
  if (!evento.activo) throw new Error('Evento no disponible');

  const { data, error } = await supabaseAdmin
    .from('inscripciones_evento')
    .insert({
      evento_id: body.evento_id,
      nombre_completo: body.nombre_completo,
      email: body.email,
      whatsapp: body.whatsapp,
      user_id: body.user_id ?? null,
      estado_pago: 'pendiente',
    })
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data;
}
```

- [ ] **Step 4: Crear las rutas**

```typescript
// backend/src/routes/eventos/index.ts
import { Router, Request, Response } from 'express';
import { requireAuth } from '../../middleware/auth';
import { requireRole } from '../../middleware/requireRole';
import type { AuthenticatedRequest } from '../../middleware/auth';
import {
  getEventos,
  getEventoById,
  createEvento,
  updateEvento,
  crearInscripcionEvento,
} from '../../services/eventos.service';

const router = Router();

// Public: catalog
router.get('/', async (_req: Request, res: Response): Promise<void> => {
  try {
    const eventos = await getEventos();
    res.json(eventos);
  } catch (err: unknown) {
    res.status(500).json({ error: err instanceof Error ? err.message : 'Error' });
  }
});

// Public: inscripcion — MUST be before /:id
router.post('/inscripciones', async (req: Request, res: Response): Promise<void> => {
  try {
    const { evento_id, nombre_completo, email, whatsapp, user_id } = req.body;

    if (!evento_id || !nombre_completo || !email || !whatsapp) {
      res.status(400).json({ error: 'evento_id, nombre_completo, email y whatsapp son requeridos' });
      return;
    }

    const inscripcion = await crearInscripcionEvento({ evento_id, nombre_completo, email, whatsapp, user_id });
    res.status(201).json(inscripcion);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Error';
    if (message.includes('no encontrado') || message.includes('no disponible')) {
      res.status(404).json({ error: message });
      return;
    }
    res.status(400).json({ error: message });
  }
});

// Public: detail
router.get('/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const evento = await getEventoById(req.params.id);
    res.json(evento);
  } catch (err: unknown) {
    res.status(404).json({ error: err instanceof Error ? err.message : 'No encontrado' });
  }
});

// Admin: create
router.post('/', requireAuth, requireRole('admin'), async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { nombre } = req.body;
    if (!nombre) {
      res.status(400).json({ error: 'nombre es requerido' });
      return;
    }
    const evento = await createEvento(req.body);
    res.status(201).json(evento);
  } catch (err: unknown) {
    res.status(400).json({ error: err instanceof Error ? err.message : 'Error' });
  }
});

// Admin: update
router.patch('/:id', requireAuth, requireRole('admin'), async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const evento = await updateEvento(req.params.id, req.body);
    res.json(evento);
  } catch (err: unknown) {
    res.status(400).json({ error: err instanceof Error ? err.message : 'Error' });
  }
});

export default router;
```

- [ ] **Step 5: Registrar en app.ts**

En `backend/src/app.ts`, agregar después de `import retirosRouter`:

```typescript
import eventosRouter from './routes/eventos/index';
```

Y después de `app.use('/api/retiros', retirosRouter);`:

```typescript
app.use('/api/eventos', eventosRouter);
```

El archivo completo quedará:

```typescript
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';

dotenv.config();

const app = express();

app.use(helmet());
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true,
}));
app.use(express.json());

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

import authRouter from './routes/auth';
import usersRouter from './routes/users';
import adminRouter from './routes/admin';
import shalaRouter from './routes/shala/index';
import ayurvedaRouter from './routes/ayurveda/index';
import retirosRouter from './routes/retiros/index';
import eventosRouter from './routes/eventos/index';

app.use('/api/auth', authRouter);
app.use('/api/users', usersRouter);
app.use('/api/admin', adminRouter);
app.use('/api/shala', shalaRouter);
app.use('/api/ayurveda', ayurvedaRouter);
app.use('/api/retiros', retirosRouter);
app.use('/api/eventos', eventosRouter);

app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Error interno del servidor' });
});

export default app;
```

- [ ] **Step 6: Ejecutar todos los tests**

```bash
cd backend && node_modules/.bin/jest tests/ --no-coverage 2>&1 | tail -15
# Expected: all 12 suites passing (previous 10 + retiros + eventos)
```

- [ ] **Step 7: Commit**

```bash
git add backend/src/services/eventos.service.ts \
        backend/src/routes/eventos/index.ts \
        backend/src/app.ts \
        backend/tests/eventos.test.ts
git commit -m "feat: eventos service + routes (catálogo público, inscripción, CRUD admin)"
```

---

## Task 4: Backend — Admin MARIFER endpoints + tests

**Files:**
- Create: `backend/src/services/marifer-admin.service.ts`
- Modify: `backend/src/routes/admin.ts`
- Create: `backend/tests/admin-marifer.test.ts`

- [ ] **Step 1: Escribir el test primero**

```typescript
// backend/tests/admin-marifer.test.ts
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

describe('GET /api/admin/retiros/:id/inscritos', () => {
  it('returns inscriptions for a retiro (admin)', async () => {
    mockAdminAuth();

    mockFrom.mockReturnValueOnce({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      order: jest.fn().mockResolvedValueOnce({
        data: [
          {
            id: 'insc-1',
            nombre_completo: 'Ana García',
            email: 'ana@gmail.com',
            whatsapp: '5512345678',
            estado_pago: 'pendiente',
            created_at: '2026-04-01T00:00:00Z',
          },
        ],
        error: null,
      }),
    });

    const res = await request(app)
      .get('/api/admin/retiros/ret-1/inscritos')
      .set('Authorization', 'Bearer admin-token');

    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0].nombre_completo).toBe('Ana García');
  });

  it('rejects non-admin', async () => {
    mockGetUser.mockResolvedValueOnce({ data: { user: { id: 'auth-user' } }, error: null });
    mockFrom.mockReturnValueOnce({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValueOnce({
        data: { id: 'u1', rol: 'user', nombre: 'User', email: 'u@t.com', tags: [] },
        error: null,
      }),
    });

    const res = await request(app)
      .get('/api/admin/retiros/ret-1/inscritos')
      .set('Authorization', 'Bearer user-token');

    expect(res.status).toBe(403);
  });
});

describe('GET /api/admin/exportar/retiro/:id', () => {
  it('returns xlsx for a retiro (admin)', async () => {
    mockAdminAuth();

    mockFrom.mockReturnValueOnce({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      order: jest.fn().mockResolvedValueOnce({
        data: [
          {
            id: 'insc-1',
            nombre_completo: 'Ana García',
            email: 'ana@gmail.com',
            whatsapp: '5512345678',
            fecha_nacimiento: '1990-05-15',
            ciudad: 'CDMX',
            instagram: '@ana',
            razon: 'Descansar',
            restricciones_alimenticias: null,
            estado_pago: 'pendiente',
            created_at: '2026-04-01T00:00:00Z',
            retiros: { nombre: 'Retiro de Meditación' },
          },
        ],
        error: null,
      }),
    });

    const res = await request(app)
      .get('/api/admin/exportar/retiro/ret-1')
      .set('Authorization', 'Bearer admin-token');

    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toContain('spreadsheetml');
  });
});

describe('GET /api/admin/eventos/:id/inscritos', () => {
  it('returns inscriptions for an evento (admin)', async () => {
    mockAdminAuth();

    mockFrom.mockReturnValueOnce({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      order: jest.fn().mockResolvedValueOnce({
        data: [
          {
            id: 'insc-e-1',
            nombre_completo: 'Laura López',
            email: 'laura@gmail.com',
            whatsapp: '5598765432',
            estado_pago: 'pendiente',
            created_at: '2026-04-02T00:00:00Z',
          },
        ],
        error: null,
      }),
    });

    const res = await request(app)
      .get('/api/admin/eventos/evt-1/inscritos')
      .set('Authorization', 'Bearer admin-token');

    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0].nombre_completo).toBe('Laura López');
  });
});

describe('GET /api/admin/exportar/evento/:id', () => {
  it('returns xlsx for an evento (admin)', async () => {
    mockAdminAuth();

    mockFrom.mockReturnValueOnce({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      order: jest.fn().mockResolvedValueOnce({
        data: [
          {
            id: 'insc-e-1',
            nombre_completo: 'Laura López',
            email: 'laura@gmail.com',
            whatsapp: '5598765432',
            estado_pago: 'pendiente',
            created_at: '2026-04-02T00:00:00Z',
            eventos: { nombre: 'Taller de Yoga' },
          },
        ],
        error: null,
      }),
    });

    const res = await request(app)
      .get('/api/admin/exportar/evento/evt-1')
      .set('Authorization', 'Bearer admin-token');

    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toContain('spreadsheetml');
  });
});
```

- [ ] **Step 2: Ejecutar test — debe FALLAR**

```bash
cd backend && node_modules/.bin/jest tests/admin-marifer.test.ts --no-coverage 2>&1 | tail -10
# Expected: FAIL
```

- [ ] **Step 3: Crear el servicio admin MARIFER**

```typescript
// backend/src/services/marifer-admin.service.ts
import { supabaseAdmin } from '../config/supabase';
import * as XLSX from 'xlsx';

export async function getRetiroInscritos(retiroId: string) {
  const { data, error } = await supabaseAdmin
    .from('inscripciones_retiro')
    .select('id, nombre_completo, email, whatsapp, fecha_nacimiento, ciudad, instagram, razon, restricciones_alimenticias, estado_pago, created_at')
    .eq('retiro_id', retiroId)
    .order('created_at', { ascending: false });

  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function exportRetiroToExcel(retiroId: string): Promise<Buffer> {
  const { data, error } = await supabaseAdmin
    .from('inscripciones_retiro')
    .select('id, nombre_completo, email, whatsapp, fecha_nacimiento, ciudad, instagram, razon, restricciones_alimenticias, estado_pago, created_at, retiros(nombre)')
    .eq('retiro_id', retiroId)
    .order('created_at', { ascending: false });

  if (error) throw new Error(error.message);

  const inscritos = data ?? [];

  const rows = (inscritos as Array<Record<string, unknown>>).map((i) => {
    const retiro = i.retiros as { nombre: string } | null;
    return {
      'Nombre completo': i.nombre_completo,
      'Email': i.email,
      'WhatsApp': i.whatsapp,
      'Fecha de nacimiento': i.fecha_nacimiento ? new Date(i.fecha_nacimiento as string).toLocaleDateString('es-MX') : '—',
      'Ciudad': i.ciudad ?? '—',
      'Instagram': i.instagram ?? '—',
      'Razón': i.razon ?? '—',
      'Restricciones alimenticias': i.restricciones_alimenticias ?? '—',
      'Estado pago': i.estado_pago,
      'Retiro': retiro?.nombre ?? '—',
      'Fecha inscripción': new Date(i.created_at as string).toLocaleDateString('es-MX'),
    };
  });

  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Inscritos Retiro');
  return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }) as Buffer;
}

export async function getEventoInscritos(eventoId: string) {
  const { data, error } = await supabaseAdmin
    .from('inscripciones_evento')
    .select('id, nombre_completo, email, whatsapp, estado_pago, created_at')
    .eq('evento_id', eventoId)
    .order('created_at', { ascending: false });

  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function exportEventoToExcel(eventoId: string): Promise<Buffer> {
  const { data, error } = await supabaseAdmin
    .from('inscripciones_evento')
    .select('id, nombre_completo, email, whatsapp, estado_pago, created_at, eventos(nombre)')
    .eq('evento_id', eventoId)
    .order('created_at', { ascending: false });

  if (error) throw new Error(error.message);

  const inscritos = data ?? [];

  const rows = (inscritos as Array<Record<string, unknown>>).map((i) => {
    const evento = i.eventos as { nombre: string } | null;
    return {
      'Nombre completo': i.nombre_completo,
      'Email': i.email,
      'WhatsApp': i.whatsapp,
      'Estado pago': i.estado_pago,
      'Evento': evento?.nombre ?? '—',
      'Fecha inscripción': new Date(i.created_at as string).toLocaleDateString('es-MX'),
    };
  });

  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Inscritos Evento');
  return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }) as Buffer;
}
```

- [ ] **Step 4: Agregar endpoints a admin.ts**

En `backend/src/routes/admin.ts`, agregar el import después del import de `ayurveda-admin.service`:

```typescript
import {
  getRetiroInscritos,
  exportRetiroToExcel,
  getEventoInscritos,
  exportEventoToExcel,
} from '../services/marifer-admin.service';
```

Y agregar los 4 endpoints antes de `export default router;`:

```typescript
router.get('/retiros/:id/inscritos', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const inscritos = await getRetiroInscritos(req.params.id);
    res.json(inscritos);
  } catch (err: unknown) {
    res.status(500).json({ error: err instanceof Error ? err.message : 'Error' });
  }
});

router.get('/exportar/retiro/:id', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const buffer = await exportRetiroToExcel(req.params.id);
    const fecha = new Date().toISOString().split('T')[0];
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="retiro-inscritos-${fecha}.xlsx"`);
    res.send(buffer);
  } catch (err: unknown) {
    res.status(500).json({ error: err instanceof Error ? err.message : 'Error' });
  }
});

router.get('/eventos/:id/inscritos', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const inscritos = await getEventoInscritos(req.params.id);
    res.json(inscritos);
  } catch (err: unknown) {
    res.status(500).json({ error: err instanceof Error ? err.message : 'Error' });
  }
});

router.get('/exportar/evento/:id', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const buffer = await exportEventoToExcel(req.params.id);
    const fecha = new Date().toISOString().split('T')[0];
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="evento-inscritos-${fecha}.xlsx"`);
    res.send(buffer);
  } catch (err: unknown) {
    res.status(500).json({ error: err instanceof Error ? err.message : 'Error' });
  }
});
```

- [ ] **Step 5: Ejecutar todos los tests del backend**

```bash
cd backend && node_modules/.bin/jest tests/ --no-coverage 2>&1 | tail -15
# Expected: 13 suites, all passing
```

- [ ] **Step 6: Commit**

```bash
git add backend/src/services/marifer-admin.service.ts \
        backend/src/routes/admin.ts \
        backend/tests/admin-marifer.test.ts
git commit -m "feat: admin endpoints MARIFER (inscritos + Excel por retiro y evento)"
```

---

## Task 5: Frontend — Retiros (cards + catálogo + detalle + formulario)

**Files:**
- Create: `frontend/components/marifer/RetiroCard.tsx`
- Create: `frontend/app/retiros/page.tsx`
- Create: `frontend/app/retiros/[id]/page.tsx`
- Create: `frontend/app/retiros/inscripcion/page.tsx`

- [ ] **Step 1: Crear RetiroCard**

```typescript
// frontend/components/marifer/RetiroCard.tsx
import Link from 'next/link';

interface Retiro {
  id: string;
  nombre: string;
  descripcion?: string;
  lugar?: string;
  precio: number;
  fecha_inicio?: string;
  fecha_fin?: string;
}

export default function RetiroCard({ retiro }: { retiro: Retiro }) {
  const fechas = retiro.fecha_inicio && retiro.fecha_fin
    ? `${new Date(retiro.fecha_inicio).toLocaleDateString('es-MX', { day: 'numeric', month: 'short' })} – ${new Date(retiro.fecha_fin).toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' })}`
    : null;

  return (
    <div className="card-wellness flex flex-col">
      <div className="flex-1">
        {fechas && <p className="label-wellness mb-3">{fechas}</p>}
        <h3 className="text-xl text-tierra mb-2">{retiro.nombre}</h3>
        {retiro.lugar && <p className="text-tierra-light text-xs mb-2">{retiro.lugar}</p>}
        {retiro.descripcion && (
          <p className="text-tierra-light text-sm leading-relaxed line-clamp-3">{retiro.descripcion}</p>
        )}
      </div>
      <div className="mt-6 pt-6 border-t border-beige-lino flex items-center justify-between">
        <p className="text-2xl font-light text-tierra">
          ${retiro.precio.toLocaleString('es-MX')} <span className="text-sm text-tierra-light">MXN</span>
        </p>
        <Link href={`/retiros/${retiro.id}`} className="btn-primary text-xs">
          Ver más
        </Link>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Crear catálogo de retiros**

```typescript
// frontend/app/retiros/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import RetiroCard from '@/components/marifer/RetiroCard';

interface Retiro {
  id: string;
  nombre: string;
  descripcion?: string;
  lugar?: string;
  precio: number;
  fecha_inicio?: string;
  fecha_fin?: string;
}

export default function RetirosPage() {
  const [retiros, setRetiros] = useState<Retiro[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get<Retiro[]>('/api/retiros')
      .then(setRetiros)
      .catch(() => setRetiros([]))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="min-h-screen px-4 py-16">
      <div className="max-w-5xl mx-auto">

        <div className="text-center mb-16">
          <div className="w-16 h-px bg-sand mx-auto mb-8" />
          <h1 className="text-5xl text-tierra mb-4">Retiros</h1>
          <p className="text-tierra-light max-w-lg mx-auto leading-relaxed">
            Experiencias de bienestar profundo. Retiros de yoga, meditación y reconexión.
          </p>
        </div>

        {loading ? (
          <p className="text-center text-tierra-light text-sm tracking-widest uppercase">Cargando...</p>
        ) : retiros.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-tierra-light text-sm">No hay retiros disponibles por el momento.</p>
            <p className="text-tierra-light text-xs mt-2">Próximamente nuevas fechas.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {retiros.map(r => (
              <RetiroCard key={r.id} retiro={r} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Crear detalle del retiro**

```typescript
// frontend/app/retiros/[id]/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { api } from '@/lib/api';

interface Retiro {
  id: string;
  nombre: string;
  descripcion?: string;
  lugar?: string;
  incluye?: string;
  precio: number;
  fecha_inicio?: string;
  fecha_fin?: string;
  whatsapp_contacto?: string;
  activo: boolean;
}

export default function RetiroDetallePage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [retiro, setRetiro] = useState<Retiro | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get<Retiro>(`/api/retiros/${id}`)
      .then(setRetiro)
      .catch(() => setError('Retiro no encontrado'))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-tierra-light text-sm tracking-widest uppercase">Cargando...</p>
      </div>
    );
  }

  if (error || !retiro) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-tierra-light text-sm mb-4">{error || 'Retiro no encontrado'}</p>
          <button onClick={() => router.push('/retiros')} className="btn-secondary text-xs">
            Ver todos los retiros
          </button>
        </div>
      </div>
    );
  }

  const fechas = retiro.fecha_inicio && retiro.fecha_fin
    ? `${new Date(retiro.fecha_inicio).toLocaleDateString('es-MX', { day: 'numeric', month: 'long' })} – ${new Date(retiro.fecha_fin).toLocaleDateString('es-MX', { day: 'numeric', month: 'long', year: 'numeric' })}`
    : null;

  const waLink = retiro.whatsapp_contacto
    ? `https://wa.me/${retiro.whatsapp_contacto.replace(/\D/g, '')}?text=${encodeURIComponent(`Hola, me interesa el retiro "${retiro.nombre}". ¿Puedes darme más información?`)}`
    : null;

  return (
    <div className="min-h-screen px-4 py-16">
      <div className="max-w-3xl mx-auto">

        <button
          onClick={() => router.push('/retiros')}
          className="text-tierra-light text-xs tracking-widest uppercase mb-10 hover:text-tierra transition-colors"
        >
          ← Todos los retiros
        </button>

        <div className="w-8 h-px bg-sand mb-6" />
        {fechas && <p className="label-wellness mb-3">{fechas}</p>}
        <h1 className="text-4xl text-tierra mb-2">{retiro.nombre}</h1>
        {retiro.lugar && <p className="text-tierra-light text-sm mb-6">{retiro.lugar}</p>}

        {retiro.descripcion && (
          <p className="text-tierra-light leading-relaxed mb-10">{retiro.descripcion}</p>
        )}

        {retiro.incluye && (
          <div className="mb-10">
            <div className="w-6 h-px bg-sand mb-4" />
            <h2 className="text-xl text-tierra mb-3">Incluye</h2>
            <p className="text-tierra-light text-sm leading-relaxed">{retiro.incluye}</p>
          </div>
        )}

        <div className="border border-sand rounded-wellness p-8">
          <div className="mb-6">
            <p className="label-wellness mb-1">Inversión</p>
            <p className="text-4xl font-light text-tierra">
              ${retiro.precio.toLocaleString('es-MX')} <span className="text-base text-tierra-light">MXN</span>
            </p>
          </div>

          <div className="space-y-3">
            <button
              onClick={() => router.push(`/retiros/inscripcion?retiro_id=${retiro.id}`)}
              className="btn-primary w-full text-center"
            >
              Inscribirme
            </button>

            {waLink && (
              <a
                href={waLink}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-secondary w-full text-center block"
              >
                Contactar por WhatsApp
              </a>
            )}
          </div>

          <p className="text-tierra-light text-xs text-center mt-4">
            Recibirás confirmación por WhatsApp una vez validado tu lugar.
          </p>
        </div>

      </div>
    </div>
  );
}
```

- [ ] **Step 4: Crear formulario de inscripción al retiro**

```typescript
// frontend/app/retiros/inscripcion/page.tsx
'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import Input from '@/components/ui/Input';
import Button from '@/components/ui/Button';

interface Retiro {
  id: string;
  nombre: string;
  precio: number;
  lugar?: string;
}

function InscripcionRetiroForm() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const retiroId = searchParams.get('retiro_id') ?? '';

  const [retiro, setRetiro] = useState<Retiro | null>(null);
  const [cargando, setCargando] = useState(true);
  const [enviando, setEnviando] = useState(false);
  const [exito, setExito] = useState(false);
  const [error, setError] = useState('');

  const [form, setForm] = useState({
    nombre_completo: '',
    fecha_nacimiento: '',
    whatsapp: '',
    email: '',
    instagram: '',
    ciudad: '',
    razon: '',
    restricciones_alimenticias: '',
  });

  useEffect(() => {
    if (!retiroId) {
      router.push('/retiros');
      return;
    }
    api.get<Retiro>(`/api/retiros/${retiroId}`)
      .then(setRetiro)
      .catch(() => router.push('/retiros'))
      .finally(() => setCargando(false));
  }, [retiroId, router]);

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setEnviando(true);
    try {
      await api.post('/api/retiros/inscripciones', { retiro_id: retiroId, ...form });
      setExito(true);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error al enviar');
    } finally {
      setEnviando(false);
    }
  }

  if (cargando) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-tierra-light text-sm tracking-widest uppercase">Cargando...</p>
      </div>
    );
  }

  if (exito) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="max-w-md w-full text-center">
          <div className="w-12 h-px bg-sand mx-auto mb-8" />
          <h1 className="text-3xl text-tierra mb-4">Inscripción recibida</h1>
          <p className="text-tierra-light text-sm leading-relaxed mb-8">
            Gracias por inscribirte. Te confirmaremos tu lugar por WhatsApp en breve.
          </p>
          <button onClick={() => router.push('/retiros')} className="btn-secondary">
            Volver a retiros
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen px-4 py-16">
      <div className="max-w-lg mx-auto">
        <button
          onClick={() => router.push(`/retiros/${retiroId}`)}
          className="text-tierra-light text-xs tracking-widest uppercase mb-10 hover:text-tierra transition-colors"
        >
          ← Regresar
        </button>

        <div className="w-8 h-px bg-sand mb-6" />
        <h1 className="text-3xl text-tierra mb-2">Formulario de inscripción</h1>
        {retiro && (
          <p className="text-tierra-light text-sm mb-10">
            {retiro.nombre}{retiro.lugar ? ` · ${retiro.lugar}` : ''}
          </p>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <Input label="Nombre completo" name="nombre_completo" value={form.nombre_completo} onChange={handleChange} required />
          <Input label="Fecha de nacimiento" name="fecha_nacimiento" type="date" value={form.fecha_nacimiento} onChange={handleChange} />
          <Input label="WhatsApp" name="whatsapp" type="tel" value={form.whatsapp} onChange={handleChange} placeholder="10 dígitos" required />
          <Input label="Email" name="email" type="email" value={form.email} onChange={handleChange} required />
          <Input label="Instagram (opcional)" name="instagram" value={form.instagram} onChange={handleChange} placeholder="@usuario" />
          <Input label="Ciudad" name="ciudad" value={form.ciudad} onChange={handleChange} />

          <div>
            <label className="label-wellness block mb-2">¿Por qué quieres asistir?</label>
            <textarea
              name="razon"
              value={form.razon}
              onChange={handleChange}
              rows={3}
              className="w-full px-4 py-3 bg-white border border-beige-lino rounded-wellness text-sm text-tierra placeholder:text-tierra-light/50 focus:outline-none focus:border-sage transition-colors resize-none"
              placeholder="Compártenos tu motivación..."
            />
          </div>

          <div>
            <label className="label-wellness block mb-2">Restricciones alimenticias (opcional)</label>
            <textarea
              name="restricciones_alimenticias"
              value={form.restricciones_alimenticias}
              onChange={handleChange}
              rows={2}
              className="w-full px-4 py-3 bg-white border border-beige-lino rounded-wellness text-sm text-tierra placeholder:text-tierra-light/50 focus:outline-none focus:border-sage transition-colors resize-none"
              placeholder="Alergias, vegetariana, etc."
            />
          </div>

          {error && <p className="text-red-400 text-xs">{error}</p>}

          <Button type="submit" loading={enviando} className="w-full">
            Enviar inscripción
          </Button>

          <p className="text-tierra-light text-xs text-center">
            Tu lugar se confirma por WhatsApp una vez procesado el pago.
          </p>
        </form>
      </div>
    </div>
  );
}

export default function InscripcionRetiroPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-tierra-light text-sm tracking-widest uppercase">Cargando...</p>
      </div>
    }>
      <InscripcionRetiroForm />
    </Suspense>
  );
}
```

- [ ] **Step 5: Verificar compilación**

```bash
cd frontend && node_modules/.bin/next build 2>&1 | grep -E "error|✓|Route" | tail -20
# Expected: no errors, /retiros routes appear in Route table
```

- [ ] **Step 6: Commit**

```bash
git add frontend/components/marifer/RetiroCard.tsx \
        frontend/app/retiros/page.tsx \
        "frontend/app/retiros/[id]/page.tsx" \
        frontend/app/retiros/inscripcion/page.tsx
git commit -m "feat: páginas públicas Retiros (catálogo, detalle, formulario inscripción)"
```

---

## Task 6: Frontend — Eventos (cards + catálogo + detalle + formulario)

**Files:**
- Create: `frontend/components/marifer/EventoCard.tsx`
- Create: `frontend/app/eventos/page.tsx`
- Create: `frontend/app/eventos/[id]/page.tsx`
- Create: `frontend/app/eventos/inscripcion/page.tsx`

- [ ] **Step 1: Crear EventoCard**

```typescript
// frontend/components/marifer/EventoCard.tsx
import Link from 'next/link';

interface Evento {
  id: string;
  nombre: string;
  descripcion?: string;
  lugar?: string;
  precio?: number | null;
  fecha?: string;
  tipo_acceso: 'pago' | 'whatsapp' | 'gratis';
  whatsapp_contacto?: string;
}

export default function EventoCard({ evento }: { evento: Evento }) {
  const fecha = evento.fecha
    ? new Date(evento.fecha).toLocaleDateString('es-MX', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })
    : null;

  const etiquetaPrecio =
    evento.tipo_acceso === 'gratis'
      ? 'Gratis'
      : evento.tipo_acceso === 'whatsapp'
      ? 'Por contacto'
      : evento.precio != null
      ? `$${evento.precio.toLocaleString('es-MX')} MXN`
      : null;

  return (
    <div className="card-wellness flex flex-col">
      <div className="flex-1">
        {fecha && <p className="label-wellness mb-3">{fecha}</p>}
        <h3 className="text-xl text-tierra mb-2">{evento.nombre}</h3>
        {evento.lugar && <p className="text-tierra-light text-xs mb-2">{evento.lugar}</p>}
        {evento.descripcion && (
          <p className="text-tierra-light text-sm leading-relaxed line-clamp-3">{evento.descripcion}</p>
        )}
      </div>
      <div className="mt-6 pt-6 border-t border-beige-lino flex items-center justify-between">
        {etiquetaPrecio && (
          <p className="text-xl font-light text-tierra">{etiquetaPrecio}</p>
        )}
        <Link href={`/eventos/${evento.id}`} className="btn-primary text-xs ml-auto">
          Ver más
        </Link>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Crear catálogo de eventos**

```typescript
// frontend/app/eventos/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import EventoCard from '@/components/marifer/EventoCard';

interface Evento {
  id: string;
  nombre: string;
  descripcion?: string;
  lugar?: string;
  precio?: number | null;
  fecha?: string;
  tipo_acceso: 'pago' | 'whatsapp' | 'gratis';
  whatsapp_contacto?: string;
}

export default function EventosPage() {
  const [eventos, setEventos] = useState<Evento[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get<Evento[]>('/api/eventos')
      .then(setEventos)
      .catch(() => setEventos([]))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="min-h-screen px-4 py-16">
      <div className="max-w-5xl mx-auto">

        <div className="text-center mb-16">
          <div className="w-16 h-px bg-sand mx-auto mb-8" />
          <h1 className="text-5xl text-tierra mb-4">Eventos</h1>
          <p className="text-tierra-light max-w-lg mx-auto leading-relaxed">
            Talleres, workshops y eventos especiales. Momentos para conectar y aprender.
          </p>
        </div>

        {loading ? (
          <p className="text-center text-tierra-light text-sm tracking-widest uppercase">Cargando...</p>
        ) : eventos.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-tierra-light text-sm">No hay eventos próximos por el momento.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {eventos.map(e => (
              <EventoCard key={e.id} evento={e} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Crear detalle del evento**

```typescript
// frontend/app/eventos/[id]/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { api } from '@/lib/api';

interface Evento {
  id: string;
  nombre: string;
  descripcion?: string;
  lugar?: string;
  flyer_url?: string;
  precio?: number | null;
  fecha?: string;
  tipo_acceso: 'pago' | 'whatsapp' | 'gratis';
  whatsapp_contacto?: string;
  activo: boolean;
}

export default function EventoDetallePage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [evento, setEvento] = useState<Evento | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get<Evento>(`/api/eventos/${id}`)
      .then(setEvento)
      .catch(() => setError('Evento no encontrado'))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-tierra-light text-sm tracking-widest uppercase">Cargando...</p>
      </div>
    );
  }

  if (error || !evento) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-tierra-light text-sm mb-4">{error || 'Evento no encontrado'}</p>
          <button onClick={() => router.push('/eventos')} className="btn-secondary text-xs">
            Ver todos los eventos
          </button>
        </div>
      </div>
    );
  }

  const fecha = evento.fecha
    ? new Date(evento.fecha).toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })
    : null;

  const waLink = evento.whatsapp_contacto
    ? `https://wa.me/${evento.whatsapp_contacto.replace(/\D/g, '')}?text=${encodeURIComponent(`Hola, me interesa el evento "${evento.nombre}". ¿Puedes darme más información?`)}`
    : null;

  return (
    <div className="min-h-screen px-4 py-16">
      <div className="max-w-3xl mx-auto">

        <button
          onClick={() => router.push('/eventos')}
          className="text-tierra-light text-xs tracking-widest uppercase mb-10 hover:text-tierra transition-colors"
        >
          ← Todos los eventos
        </button>

        {evento.flyer_url && (
          <div className="mb-10 rounded-wellness overflow-hidden">
            <img src={evento.flyer_url} alt={evento.nombre} className="w-full object-cover" />
          </div>
        )}

        <div className="w-8 h-px bg-sand mb-6" />
        {fecha && <p className="label-wellness mb-3">{fecha}</p>}
        <h1 className="text-4xl text-tierra mb-2">{evento.nombre}</h1>
        {evento.lugar && <p className="text-tierra-light text-sm mb-6">{evento.lugar}</p>}

        {evento.descripcion && (
          <p className="text-tierra-light leading-relaxed mb-10">{evento.descripcion}</p>
        )}

        <div className="border border-sand rounded-wellness p-8">
          {evento.tipo_acceso === 'pago' && evento.precio != null && (
            <div className="mb-6">
              <p className="label-wellness mb-1">Inversión</p>
              <p className="text-4xl font-light text-tierra">
                ${evento.precio.toLocaleString('es-MX')} <span className="text-base text-tierra-light">MXN</span>
              </p>
            </div>
          )}

          {evento.tipo_acceso === 'gratis' && (
            <div className="mb-6">
              <p className="label-wellness mb-1">Acceso</p>
              <p className="text-2xl font-light text-tierra">Gratuito</p>
            </div>
          )}

          <div className="space-y-3">
            {(evento.tipo_acceso === 'pago' || evento.tipo_acceso === 'gratis') && (
              <button
                onClick={() => router.push(`/eventos/inscripcion?evento_id=${evento.id}`)}
                className="btn-primary w-full text-center"
              >
                {evento.tipo_acceso === 'gratis' ? 'Inscribirme gratis' : 'Inscribirme'}
              </button>
            )}

            {(evento.tipo_acceso === 'whatsapp' || waLink) && (
              <a
                href={waLink ?? '#'}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-secondary w-full text-center block"
              >
                Contactar por WhatsApp
              </a>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
```

- [ ] **Step 4: Crear formulario de inscripción al evento**

```typescript
// frontend/app/eventos/inscripcion/page.tsx
'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import Input from '@/components/ui/Input';
import Button from '@/components/ui/Button';

interface Evento {
  id: string;
  nombre: string;
  precio?: number | null;
  tipo_acceso: 'pago' | 'whatsapp' | 'gratis';
}

function InscripcionEventoForm() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const eventoId = searchParams.get('evento_id') ?? '';

  const [evento, setEvento] = useState<Evento | null>(null);
  const [cargando, setCargando] = useState(true);
  const [enviando, setEnviando] = useState(false);
  const [exito, setExito] = useState(false);
  const [error, setError] = useState('');

  const [form, setForm] = useState({ nombre_completo: '', email: '', whatsapp: '' });

  useEffect(() => {
    if (!eventoId) {
      router.push('/eventos');
      return;
    }
    api.get<Evento>(`/api/eventos/${eventoId}`)
      .then(setEvento)
      .catch(() => router.push('/eventos'))
      .finally(() => setCargando(false));
  }, [eventoId, router]);

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setEnviando(true);
    try {
      await api.post('/api/eventos/inscripciones', { evento_id: eventoId, ...form });
      setExito(true);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error al enviar');
    } finally {
      setEnviando(false);
    }
  }

  if (cargando) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-tierra-light text-sm tracking-widest uppercase">Cargando...</p>
      </div>
    );
  }

  if (exito) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="max-w-md w-full text-center">
          <div className="w-12 h-px bg-sand mx-auto mb-8" />
          <h1 className="text-3xl text-tierra mb-4">Inscripción recibida</h1>
          <p className="text-tierra-light text-sm leading-relaxed mb-8">
            ¡Nos vemos pronto! Recibirás confirmación por WhatsApp.
          </p>
          <button onClick={() => router.push('/eventos')} className="btn-secondary">
            Volver a eventos
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen px-4 py-16">
      <div className="max-w-md mx-auto">
        <button
          onClick={() => router.push(`/eventos/${eventoId}`)}
          className="text-tierra-light text-xs tracking-widest uppercase mb-10 hover:text-tierra transition-colors"
        >
          ← Regresar
        </button>

        <div className="w-8 h-px bg-sand mb-6" />
        <h1 className="text-3xl text-tierra mb-2">Inscripción</h1>
        {evento && (
          <p className="text-tierra-light text-sm mb-10">
            {evento.nombre}
            {evento.tipo_acceso === 'gratis' ? ' · Gratuito' : evento.precio != null ? ` · $${evento.precio.toLocaleString('es-MX')} MXN` : ''}
          </p>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <Input label="Nombre completo" name="nombre_completo" value={form.nombre_completo} onChange={handleChange} required />
          <Input label="Email" name="email" type="email" value={form.email} onChange={handleChange} required />
          <Input label="WhatsApp" name="whatsapp" type="tel" value={form.whatsapp} onChange={handleChange} placeholder="10 dígitos" required />

          {error && <p className="text-red-400 text-xs">{error}</p>}

          <Button type="submit" loading={enviando} className="w-full">
            Confirmar inscripción
          </Button>
        </form>
      </div>
    </div>
  );
}

export default function InscripcionEventoPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-tierra-light text-sm tracking-widest uppercase">Cargando...</p>
      </div>
    }>
      <InscripcionEventoForm />
    </Suspense>
  );
}
```

- [ ] **Step 5: Verificar compilación**

```bash
cd frontend && node_modules/.bin/next build 2>&1 | grep -E "error|✓|/eventos|/retiros" | tail -20
# Expected: no errors, /eventos and /retiros routes in Route table
```

- [ ] **Step 6: Commit**

```bash
git add frontend/components/marifer/EventoCard.tsx \
        frontend/app/eventos/page.tsx \
        "frontend/app/eventos/[id]/page.tsx" \
        frontend/app/eventos/inscripcion/page.tsx
git commit -m "feat: páginas públicas Eventos (catálogo, detalle con tipo_acceso, formulario)"
```

---

## Task 7: Frontend — Admin panel MARIFER + nav

**Files:**
- Create: `frontend/app/admin/marifer/page.tsx`
- Modify: `frontend/app/admin/layout.tsx`

- [ ] **Step 1: Crear página admin MARIFER**

```typescript
// frontend/app/admin/marifer/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import Button from '@/components/ui/Button';

interface Retiro {
  id: string;
  nombre: string;
  lugar?: string;
  fecha_inicio?: string;
  fecha_fin?: string;
  precio: number;
}

interface Evento {
  id: string;
  nombre: string;
  fecha?: string;
  tipo_acceso: string;
  precio?: number | null;
}

interface Inscrito {
  id: string;
  nombre_completo: string;
  email: string;
  whatsapp: string;
  estado_pago: string;
  created_at: string;
}

type VistaActual = { tipo: 'retiro'; id: string; nombre: string } | { tipo: 'evento'; id: string; nombre: string } | null;

export default function AdminMariferPage() {
  const [retiros, setRetiros] = useState<Retiro[]>([]);
  const [eventos, setEventos] = useState<Evento[]>([]);
  const [inscritos, setInscritos] = useState<Inscrito[]>([]);
  const [vistaActual, setVistaActual] = useState<VistaActual>(null);
  const [loading, setLoading] = useState(true);
  const [loadingInscritos, setLoadingInscritos] = useState(false);
  const [exportando, setExportando] = useState(false);
  const [exportError, setExportError] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    Promise.all([
      api.get<Retiro[]>('/api/retiros').catch(() => [] as Retiro[]),
      api.get<Evento[]>('/api/eventos').catch(() => [] as Evento[]),
    ])
      .then(([r, e]) => { setRetiros(r); setEventos(e); })
      .catch((err: unknown) => setError(err instanceof Error ? err.message : 'Error'))
      .finally(() => setLoading(false));
  }, []);

  async function verInscritos(tipo: 'retiro' | 'evento', id: string, nombre: string) {
    setVistaActual({ tipo, id, nombre });
    setLoadingInscritos(true);
    setInscritos([]);
    try {
      const endpoint = tipo === 'retiro'
        ? `/api/admin/retiros/${id}/inscritos`
        : `/api/admin/eventos/${id}/inscritos`;
      const data = await api.get<Inscrito[]>(endpoint);
      setInscritos(data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error');
    } finally {
      setLoadingInscritos(false);
    }
  }

  async function handleExportar() {
    if (!vistaActual) return;
    setExportando(true);
    setExportError('');
    try {
      const { createSupabaseClient } = await import('@/lib/supabase');
      const supabase = createSupabaseClient();
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) throw new Error('Sin sesión');

      const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
      const endpoint = vistaActual.tipo === 'retiro'
        ? `/api/admin/exportar/retiro/${vistaActual.id}`
        : `/api/admin/exportar/evento/${vistaActual.id}`;

      const res = await fetch(`${API_URL}${endpoint}`, {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({ error: `Error ${res.status}` }));
        throw new Error(errData.error || `Error ${res.status}`);
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${vistaActual.tipo}-${vistaActual.nombre.replace(/\s+/g, '-')}-${new Date().toISOString().split('T')[0]}.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err: unknown) {
      setExportError(err instanceof Error ? err.message : 'Error al exportar');
    } finally {
      setExportando(false);
    }
  }

  return (
    <div>
      <div className="mb-8">
        <div className="w-8 h-px bg-sand mb-4" />
        <h1 className="text-3xl text-tierra">MARIFER — Retiros & Eventos</h1>
      </div>

      {error && <p className="text-red-500 text-sm mb-4">{error}</p>}

      {loading ? (
        <p className="text-tierra-light text-sm tracking-widest uppercase">Cargando...</p>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">

          {/* Retiros */}
          <div>
            <h2 className="text-lg text-tierra mb-3">Retiros</h2>
            {retiros.length === 0 ? (
              <p className="text-tierra-light text-sm">No hay retiros</p>
            ) : (
              <div className="space-y-2">
                {retiros.map(r => (
                  <div
                    key={r.id}
                    className={`bg-white border rounded-wellness px-4 py-3 cursor-pointer transition-colors ${
                      vistaActual?.id === r.id ? 'border-sage bg-sage-muted/30' : 'border-beige-lino hover:border-sage'
                    }`}
                    onClick={() => verInscritos('retiro', r.id, r.nombre)}
                  >
                    <p className="text-sm text-tierra">{r.nombre}</p>
                    <p className="text-xs text-tierra-light">{r.lugar ?? '—'} · ${r.precio.toLocaleString('es-MX')} MXN</p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Eventos */}
          <div>
            <h2 className="text-lg text-tierra mb-3">Eventos</h2>
            {eventos.length === 0 ? (
              <p className="text-tierra-light text-sm">No hay eventos</p>
            ) : (
              <div className="space-y-2">
                {eventos.map(e => (
                  <div
                    key={e.id}
                    className={`bg-white border rounded-wellness px-4 py-3 cursor-pointer transition-colors ${
                      vistaActual?.id === e.id ? 'border-sage bg-sage-muted/30' : 'border-beige-lino hover:border-sage'
                    }`}
                    onClick={() => verInscritos('evento', e.id, e.nombre)}
                  >
                    <p className="text-sm text-tierra">{e.nombre}</p>
                    <p className="text-xs text-tierra-light">
                      {e.tipo_acceso}
                      {e.precio != null ? ` · $${e.precio.toLocaleString('es-MX')} MXN` : ''}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Inscritos */}
      {vistaActual && (
        <div>
          <div className="mb-4 flex items-center justify-between">
            <div>
              <div className="w-6 h-px bg-sand mb-2" />
              <h2 className="text-xl text-tierra">Inscritos — {vistaActual.nombre}</h2>
              <p className="text-tierra-light text-sm mt-1">{inscritos.length} inscripciones</p>
            </div>
            <Button variant="secondary" onClick={handleExportar} loading={exportando}>
              Exportar Excel
            </Button>
          </div>

          {exportError && <p className="text-red-400 text-xs mb-3">{exportError}</p>}

          {loadingInscritos ? (
            <p className="text-tierra-light text-sm tracking-widest uppercase">Cargando...</p>
          ) : inscritos.length === 0 ? (
            <div className="card-wellness text-center py-10">
              <p className="text-tierra-light text-sm">Sin inscripciones aún</p>
            </div>
          ) : (
            <div className="bg-white border border-beige-lino rounded-wellness overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-beige-lino">
                    <th className="label-wellness text-left px-4 py-3">Nombre</th>
                    <th className="label-wellness text-left px-4 py-3">Email</th>
                    <th className="label-wellness text-left px-4 py-3">WhatsApp</th>
                    <th className="label-wellness text-left px-4 py-3">Pago</th>
                    <th className="label-wellness text-left px-4 py-3">Fecha</th>
                  </tr>
                </thead>
                <tbody>
                  {inscritos.map((ins, i) => (
                    <tr
                      key={ins.id}
                      className={`border-b border-beige-lino last:border-0 ${i % 2 === 0 ? 'bg-white' : 'bg-beige/30'}`}
                    >
                      <td className="px-4 py-3 text-tierra">{ins.nombre_completo}</td>
                      <td className="px-4 py-3 text-tierra-light text-xs">{ins.email}</td>
                      <td className="px-4 py-3 text-tierra-mid">{ins.whatsapp}</td>
                      <td className="px-4 py-3">
                        <span className={`text-xs px-2 py-1 rounded-full ${
                          ins.estado_pago === 'completado'
                            ? 'bg-sage-muted text-sage'
                            : ins.estado_pago === 'fallido'
                            ? 'bg-red-50 text-red-400'
                            : 'bg-beige text-tierra-light'
                        }`}>
                          {ins.estado_pago}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-tierra-light text-xs">
                        {new Date(ins.created_at).toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Actualizar nav del admin**

En `frontend/app/admin/layout.tsx`, reemplazar el array `navLinks`:

```typescript
  const navLinks = [
    { href: '/admin', label: 'Dashboard' },
    { href: '/admin/crm', label: 'CRM' },
    { href: '/admin/shala', label: 'SHALA' },
    { href: '/admin/shala/alumnos', label: '↳ Alumnos' },
    { href: '/admin/ayurveda', label: 'AYURVEDA' },
    { href: '/admin/marifer', label: 'MARIFER' },
  ];
```

- [ ] **Step 3: Verificar compilación final**

```bash
cd frontend && node_modules/.bin/next build 2>&1 | tail -20
# Expected: "✓ Compiled successfully"
```

- [ ] **Step 4: Ejecutar todos los tests del backend**

```bash
cd backend && node_modules/.bin/jest tests/ --no-coverage 2>&1 | tail -10
# Expected: all 13 suites passing
```

- [ ] **Step 5: Commit final**

```bash
git add frontend/app/admin/marifer/page.tsx \
        frontend/app/admin/layout.tsx
git commit -m "feat: panel admin MARIFER (retiros + eventos, inscritos, exportación Excel)"
```

---

## Resumen de lo que se entrega

- ✅ Schema SQL tablas `retiros`, `inscripciones_retiro`, `eventos`, `inscripciones_evento` con RLS
- ✅ API pública retiros + eventos (catálogo, detalle, inscripción sin auth)
- ✅ Admin endpoints: inscritos por retiro/evento + export Excel por id
- ✅ Frontend retiros: catálogo, detalle con botones Inscribirse + WhatsApp, formulario completo
- ✅ Frontend eventos: catálogo, detalle con lógica por `tipo_acceso` (pago/whatsapp/gratis), formulario
- ✅ Panel admin MARIFER: selector de retiro/evento, tabla de inscritos, export Excel
- ✅ Nav admin actualizado con sección MARIFER
