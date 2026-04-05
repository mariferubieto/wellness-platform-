# Fase 3 — MANALI AYURVEDA: Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the complete MANALI AYURVEDA module — diplomados catalog, public detail page, inscription form (no login required), and admin panel with per-generación student lists and Excel export.

**Architecture:** Express.js services in `backend/src/services/` + routes in `backend/src/routes/ayurveda/`. Frontend pages in `frontend/app/ayurveda/` and `frontend/app/admin/ayurveda/`. Payments in this phase create a `pendiente` record only (real Mercado Pago wires up in Phase 6). Admin manually confirms inscriptions.

**Tech Stack:** TypeScript, Express.js, Supabase (supabaseAdmin), Jest + Supertest, Next.js 14 App Router, Tailwind CSS wellness tokens, `@supabase/ssr`, xlsx.

---

## File Map

| File | Action | Responsibility |
|---|---|---|
| `database/migrations/003_ayurveda_schema.sql` | Create | Tables: diplomados, inscripciones_diplomado |
| `backend/src/services/diplomados.service.ts` | Create | CRUD diplomados + crear inscripción |
| `backend/src/services/ayurveda-admin.service.ts` | Create | Admin: alumnos por generación, export Excel |
| `backend/src/routes/ayurveda/diplomados.ts` | Create | Public + admin routes for diplomados |
| `backend/src/routes/ayurveda/index.ts` | Create | Mount ayurveda sub-routes |
| `backend/src/app.ts` | Modify | Register `/api/ayurveda` router |
| `backend/src/routes/admin.ts` | Modify | Add ayurveda admin endpoints |
| `backend/tests/diplomados.test.ts` | Create | Tests for diplomados routes |
| `backend/tests/admin-ayurveda.test.ts` | Create | Tests for admin ayurveda routes |
| `frontend/components/ayurveda/DiplomadoCard.tsx` | Create | Card for catalog page |
| `frontend/app/ayurveda/page.tsx` | Create | Public catalog of diplomados |
| `frontend/app/ayurveda/[id]/page.tsx` | Create | Public detail + inscribirse button |
| `frontend/app/ayurveda/inscripcion/page.tsx` | Create | Inscription form (no auth) |
| `frontend/app/admin/ayurveda/page.tsx` | Create | Admin: diplomados + students by generación |
| `frontend/app/admin/layout.tsx` | Modify | Add MANALI AYURVEDA nav links |

---

## Task 1: DB schema — tablas AYURVEDA

**Files:**
- Create: `database/migrations/003_ayurveda_schema.sql`

- [ ] **Step 1: Crear archivo de migración**

```sql
-- database/migrations/003_ayurveda_schema.sql
-- Run this in Supabase SQL Editor after 002_shala_schema.sql

-- diplomados
CREATE TABLE IF NOT EXISTS diplomados (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre      text NOT NULL,
  descripcion text,
  temario     jsonb,           -- array de strings: módulos o temas
  calendario  jsonb,           -- array de strings: fechas de sesiones
  precio      numeric(10,2) NOT NULL CHECK (precio >= 0),
  generacion  text NOT NULL,   -- ej: "Generación 2026-A"
  activo      boolean DEFAULT true,
  created_at  timestamptz DEFAULT now()
);

-- inscripciones_diplomado
CREATE TABLE IF NOT EXISTS inscripciones_diplomado (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          uuid REFERENCES users(id) ON DELETE SET NULL,  -- nullable: no requiere cuenta
  diplomado_id     uuid REFERENCES diplomados(id) ON DELETE CASCADE,
  nombre_completo  text NOT NULL,
  fecha_nacimiento date,
  whatsapp         text NOT NULL,
  email_gmail      text NOT NULL,
  razon            text,
  pago_id          uuid REFERENCES pagos(id) ON DELETE SET NULL,
  estado_pago      text NOT NULL DEFAULT 'pendiente' CHECK (estado_pago IN ('pendiente', 'completado', 'fallido')),
  created_at       timestamptz DEFAULT now()
);

-- RLS
ALTER TABLE diplomados ENABLE ROW LEVEL SECURITY;
ALTER TABLE inscripciones_diplomado ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service_role_all_diplomados" ON diplomados
  FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "service_role_all_inscripciones_diplomado" ON inscripciones_diplomado
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_diplomados_activo ON diplomados(activo);
CREATE INDEX IF NOT EXISTS idx_diplomados_generacion ON diplomados(generacion);
CREATE INDEX IF NOT EXISTS idx_inscripciones_diplomado_id ON inscripciones_diplomado(diplomado_id);
CREATE INDEX IF NOT EXISTS idx_inscripciones_generacion ON inscripciones_diplomado(diplomado_id, created_at);
```

- [ ] **Step 2: Verificar conteo de tablas creadas**

```bash
grep "CREATE TABLE" database/migrations/003_ayurveda_schema.sql | wc -l
# Expected: 2
```

- [ ] **Step 3: Commit**

```bash
git add database/migrations/003_ayurveda_schema.sql
git commit -m "feat: schema SQL fase 3 - tablas AYURVEDA (diplomados, inscripciones)"
```

---

## Task 2: Backend — Diplomados service + routes + tests

**Files:**
- Create: `backend/src/services/diplomados.service.ts`
- Create: `backend/src/routes/ayurveda/diplomados.ts`
- Create: `backend/src/routes/ayurveda/index.ts`
- Create: `backend/tests/diplomados.test.ts`

- [ ] **Step 1: Escribir el test primero**

```typescript
// backend/tests/diplomados.test.ts
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

describe('GET /api/ayurveda/diplomados', () => {
  it('returns active diplomados (public)', async () => {
    mockFrom.mockReturnValueOnce({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      order: jest.fn().mockResolvedValueOnce({
        data: [
          {
            id: 'dip-1',
            nombre: 'Diplomado Ayurveda 2026',
            descripcion: 'Formación completa',
            precio: 15000,
            generacion: 'Generación 2026-A',
            activo: true,
          },
        ],
        error: null,
      }),
    });

    const res = await request(app).get('/api/ayurveda/diplomados');
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0].nombre).toBe('Diplomado Ayurveda 2026');
  });
});

describe('GET /api/ayurveda/diplomados/:id', () => {
  it('returns diplomado detail (public)', async () => {
    mockFrom.mockReturnValueOnce({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValueOnce({
        data: {
          id: 'dip-1',
          nombre: 'Diplomado Ayurveda 2026',
          descripcion: 'Formación completa',
          temario: ['Módulo 1: Fundamentos', 'Módulo 2: Doshas'],
          calendario: ['15 febrero 2026', '22 febrero 2026'],
          precio: 15000,
          generacion: 'Generación 2026-A',
          activo: true,
        },
        error: null,
      }),
    });

    const res = await request(app).get('/api/ayurveda/diplomados/dip-1');
    expect(res.status).toBe(200);
    expect(res.body.temario).toHaveLength(2);
    expect(res.body.generacion).toBe('Generación 2026-A');
  });

  it('returns 404 when diplomado not found', async () => {
    mockFrom.mockReturnValueOnce({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValueOnce({ data: null, error: { message: 'Not found' } }),
    });

    const res = await request(app).get('/api/ayurveda/diplomados/no-existe');
    expect(res.status).toBe(404);
  });
});

describe('POST /api/ayurveda/diplomados (admin)', () => {
  it('creates a diplomado (admin only)', async () => {
    mockAdminAuth();

    mockFrom.mockReturnValueOnce({
      insert: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValueOnce({
        data: {
          id: 'dip-new',
          nombre: 'Nuevo Diplomado',
          precio: 12000,
          generacion: 'Generación 2026-B',
          activo: true,
        },
        error: null,
      }),
    });

    const res = await request(app)
      .post('/api/ayurveda/diplomados')
      .set('Authorization', 'Bearer admin-token')
      .send({ nombre: 'Nuevo Diplomado', precio: 12000, generacion: 'Generación 2026-B' });

    expect(res.status).toBe(201);
    expect(res.body.id).toBe('dip-new');
  });

  it('rejects non-admin users', async () => {
    mockGetUser.mockResolvedValueOnce({ data: { user: { id: 'auth-user' } }, error: null });
    mockFrom.mockReturnValueOnce({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValueOnce({
        data: { id: 'user-1', rol: 'user', nombre: 'User', email: 'u@t.com', tags: [] },
        error: null,
      }),
    });

    const res = await request(app)
      .post('/api/ayurveda/diplomados')
      .set('Authorization', 'Bearer user-token')
      .send({ nombre: 'Nuevo', precio: 1000, generacion: 'Gen A' });

    expect(res.status).toBe(403);
  });
});

describe('POST /api/ayurveda/inscripciones', () => {
  it('creates an inscription without auth', async () => {
    // 1) check diplomado exists
    mockFrom.mockReturnValueOnce({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValueOnce({
        data: { id: 'dip-1', nombre: 'Diplomado Ayurveda 2026', activo: true },
        error: null,
      }),
    });

    // 2) insert inscripcion
    mockFrom.mockReturnValueOnce({
      insert: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValueOnce({
        data: {
          id: 'insc-1',
          diplomado_id: 'dip-1',
          nombre_completo: 'Ana García',
          whatsapp: '5512345678',
          email_gmail: 'ana@gmail.com',
          estado_pago: 'pendiente',
        },
        error: null,
      }),
    });

    const res = await request(app)
      .post('/api/ayurveda/inscripciones')
      .send({
        diplomado_id: 'dip-1',
        nombre_completo: 'Ana García',
        whatsapp: '5512345678',
        email_gmail: 'ana@gmail.com',
        razon: 'Quiero aprender',
      });

    expect(res.status).toBe(201);
    expect(res.body.nombre_completo).toBe('Ana García');
    expect(res.body.estado_pago).toBe('pendiente');
  });

  it('returns 400 when required fields missing', async () => {
    const res = await request(app)
      .post('/api/ayurveda/inscripciones')
      .send({ diplomado_id: 'dip-1' });

    expect(res.status).toBe(400);
  });

  it('returns 404 when diplomado not found or inactive', async () => {
    mockFrom.mockReturnValueOnce({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValueOnce({ data: null, error: { message: 'Not found' } }),
    });

    const res = await request(app)
      .post('/api/ayurveda/inscripciones')
      .send({
        diplomado_id: 'no-existe',
        nombre_completo: 'Ana',
        whatsapp: '55',
        email_gmail: 'a@gmail.com',
      });

    expect(res.status).toBe(404);
  });
});
```

- [ ] **Step 2: Ejecutar test para verificar que falla**

```bash
cd /Users/mariferubieto/Desktop/wellness-platform
npx jest backend/tests/diplomados.test.ts --no-coverage 2>&1 | tail -20
# Expected: FAIL — "Cannot find module '../src/routes/ayurveda/index'"
```

- [ ] **Step 3: Crear el servicio**

```typescript
// backend/src/services/diplomados.service.ts
import { supabaseAdmin } from '../config/supabase';

export async function getDiplomados() {
  const { data, error } = await supabaseAdmin
    .from('diplomados')
    .select('id, nombre, descripcion, precio, generacion, activo')
    .eq('activo', true)
    .order('created_at', { ascending: false });

  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function getDiplomadoById(id: string) {
  const { data, error } = await supabaseAdmin
    .from('diplomados')
    .select('id, nombre, descripcion, temario, calendario, precio, generacion, activo')
    .eq('id', id)
    .single();

  if (error) throw new Error(error.message);
  return data;
}

export async function createDiplomado(body: {
  nombre: string;
  descripcion?: string;
  temario?: string[];
  calendario?: string[];
  precio: number;
  generacion: string;
}) {
  const { data, error } = await supabaseAdmin
    .from('diplomados')
    .insert({
      nombre: body.nombre,
      descripcion: body.descripcion ?? null,
      temario: body.temario ?? null,
      calendario: body.calendario ?? null,
      precio: body.precio,
      generacion: body.generacion,
    })
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data;
}

export async function updateDiplomado(
  id: string,
  body: Partial<{
    nombre: string;
    descripcion: string;
    temario: string[];
    calendario: string[];
    precio: number;
    generacion: string;
    activo: boolean;
  }>
) {
  const { data, error } = await supabaseAdmin
    .from('diplomados')
    .update(body)
    .eq('id', id)
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data;
}

export async function crearInscripcion(body: {
  diplomado_id: string;
  nombre_completo: string;
  fecha_nacimiento?: string;
  whatsapp: string;
  email_gmail: string;
  razon?: string;
  user_id?: string;
}) {
  // Verify diplomado exists and is active
  const { data: diplomado, error: dipError } = await supabaseAdmin
    .from('diplomados')
    .select('id, activo')
    .eq('id', body.diplomado_id)
    .single();

  if (dipError || !diplomado) throw new Error('Diplomado no encontrado');
  if (!diplomado.activo) throw new Error('Diplomado no disponible');

  const { data, error } = await supabaseAdmin
    .from('inscripciones_diplomado')
    .insert({
      diplomado_id: body.diplomado_id,
      nombre_completo: body.nombre_completo,
      fecha_nacimiento: body.fecha_nacimiento ?? null,
      whatsapp: body.whatsapp,
      email_gmail: body.email_gmail,
      razon: body.razon ?? null,
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
// backend/src/routes/ayurveda/diplomados.ts
import { Router, Request, Response } from 'express';
import { requireAuth } from '../../middleware/auth';
import { requireRole } from '../../middleware/requireRole';
import type { AuthenticatedRequest } from '../../middleware/auth';
import {
  getDiplomados,
  getDiplomadoById,
  createDiplomado,
  updateDiplomado,
  crearInscripcion,
} from '../../services/diplomados.service';

const router = Router();

// Public: catalog
router.get('/', async (_req: Request, res: Response): Promise<void> => {
  try {
    const diplomados = await getDiplomados();
    res.json(diplomados);
  } catch (err: unknown) {
    res.status(500).json({ error: err instanceof Error ? err.message : 'Error' });
  }
});

// Public: detail
router.get('/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const diplomado = await getDiplomadoById(req.params.id);
    res.json(diplomado);
  } catch (err: unknown) {
    res.status(404).json({ error: err instanceof Error ? err.message : 'No encontrado' });
  }
});

// Admin: create
router.post('/', requireAuth, requireRole('admin'), async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { nombre, descripcion, temario, calendario, precio, generacion } = req.body;
    if (!nombre || precio === undefined || !generacion) {
      res.status(400).json({ error: 'nombre, precio y generacion son requeridos' });
      return;
    }
    const diplomado = await createDiplomado({ nombre, descripcion, temario, calendario, precio: Number(precio), generacion });
    res.status(201).json(diplomado);
  } catch (err: unknown) {
    res.status(400).json({ error: err instanceof Error ? err.message : 'Error' });
  }
});

// Admin: update
router.patch('/:id', requireAuth, requireRole('admin'), async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const diplomado = await updateDiplomado(req.params.id, req.body);
    res.json(diplomado);
  } catch (err: unknown) {
    res.status(400).json({ error: err instanceof Error ? err.message : 'Error' });
  }
});

export default router;
```

- [ ] **Step 5: Crear ruta de inscripciones**

```typescript
// backend/src/routes/ayurveda/inscripciones.ts
import { Router, Request, Response } from 'express';
import { crearInscripcion } from '../../services/diplomados.service';

const router = Router();

router.post('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const { diplomado_id, nombre_completo, fecha_nacimiento, whatsapp, email_gmail, razon, user_id } = req.body;

    if (!diplomado_id || !nombre_completo || !whatsapp || !email_gmail) {
      res.status(400).json({ error: 'diplomado_id, nombre_completo, whatsapp y email_gmail son requeridos' });
      return;
    }

    const inscripcion = await crearInscripcion({
      diplomado_id,
      nombre_completo,
      fecha_nacimiento,
      whatsapp,
      email_gmail,
      razon,
      user_id,
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

export default router;
```

- [ ] **Step 6: Crear index de rutas ayurveda**

```typescript
// backend/src/routes/ayurveda/index.ts
import { Router } from 'express';
import diplomadosRouter from './diplomados';
import inscripcionesRouter from './inscripciones';

const router = Router();
router.use('/diplomados', diplomadosRouter);
router.use('/inscripciones', inscripcionesRouter);

export default router;
```

- [ ] **Step 7: Registrar en app.ts**

En `backend/src/app.ts`, agregar después de la línea `import shalaRouter`:

```typescript
import ayurvedaRouter from './routes/ayurveda/index';
```

Y después de `app.use('/api/shala', shalaRouter);`:

```typescript
app.use('/api/ayurveda', ayurvedaRouter);
```

El archivo completo quedará:

```typescript
// backend/src/app.ts
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

app.use('/api/auth', authRouter);
app.use('/api/users', usersRouter);
app.use('/api/admin', adminRouter);
app.use('/api/shala', shalaRouter);
app.use('/api/ayurveda', ayurvedaRouter);

app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Error interno del servidor' });
});

export default app;
```

- [ ] **Step 8: Ejecutar tests**

```bash
cd /Users/mariferubieto/Desktop/wellness-platform
npx jest backend/tests/diplomados.test.ts --no-coverage 2>&1 | tail -20
# Expected: PASS — all 7 tests passing
```

- [ ] **Step 9: Commit**

```bash
git add backend/src/services/diplomados.service.ts \
        backend/src/routes/ayurveda/diplomados.ts \
        backend/src/routes/ayurveda/inscripciones.ts \
        backend/src/routes/ayurveda/index.ts \
        backend/src/app.ts \
        backend/tests/diplomados.test.ts
git commit -m "feat: diplomados service + routes (catálogo público, inscripción, CRUD admin)"
```

---

## Task 3: Backend — Admin AYURVEDA endpoints + tests

**Files:**
- Create: `backend/src/services/ayurveda-admin.service.ts`
- Modify: `backend/src/routes/admin.ts`
- Create: `backend/tests/admin-ayurveda.test.ts`

- [ ] **Step 1: Escribir el test primero**

```typescript
// backend/tests/admin-ayurveda.test.ts
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

describe('GET /api/admin/ayurveda/alumnos', () => {
  it('returns all inscriptions (admin only)', async () => {
    mockAdminAuth();

    mockFrom.mockReturnValueOnce({
      select: jest.fn().mockReturnThis(),
      order: jest.fn().mockResolvedValueOnce({
        data: [
          {
            id: 'insc-1',
            nombre_completo: 'Ana García',
            email_gmail: 'ana@gmail.com',
            whatsapp: '5512345678',
            estado_pago: 'pendiente',
            created_at: '2026-04-01T00:00:00Z',
            diplomados: { nombre: 'Diplomado Ayurveda 2026', generacion: 'Generación 2026-A' },
          },
        ],
        error: null,
      }),
    });

    const res = await request(app)
      .get('/api/admin/ayurveda/alumnos')
      .set('Authorization', 'Bearer admin-token');

    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0].nombre_completo).toBe('Ana García');
  });

  it('filters by generacion when provided', async () => {
    mockAdminAuth();

    mockFrom.mockReturnValueOnce({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      order: jest.fn().mockResolvedValueOnce({
        data: [],
        error: null,
      }),
    });

    const res = await request(app)
      .get('/api/admin/ayurveda/alumnos?generacion=Generaci%C3%B3n+2026-A')
      .set('Authorization', 'Bearer admin-token');

    expect(res.status).toBe(200);
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
      .get('/api/admin/ayurveda/alumnos')
      .set('Authorization', 'Bearer user-token');

    expect(res.status).toBe(403);
  });
});

describe('GET /api/admin/ayurveda/exportar/:generacion', () => {
  it('returns xlsx buffer for a generacion (admin only)', async () => {
    mockAdminAuth();

    mockFrom.mockReturnValueOnce({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      order: jest.fn().mockResolvedValueOnce({
        data: [
          {
            id: 'insc-1',
            nombre_completo: 'Ana García',
            email_gmail: 'ana@gmail.com',
            whatsapp: '5512345678',
            fecha_nacimiento: '1990-05-15',
            razon: 'Aprender',
            estado_pago: 'pendiente',
            created_at: '2026-04-01T00:00:00Z',
            diplomados: { nombre: 'Diplomado Ayurveda 2026', generacion: 'Generación 2026-A' },
          },
        ],
        error: null,
      }),
    });

    const res = await request(app)
      .get('/api/admin/ayurveda/exportar/Generaci%C3%B3n+2026-A')
      .set('Authorization', 'Bearer admin-token');

    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toContain('spreadsheetml');
  });
});
```

- [ ] **Step 2: Ejecutar test para verificar que falla**

```bash
cd /Users/mariferubieto/Desktop/wellness-platform
npx jest backend/tests/admin-ayurveda.test.ts --no-coverage 2>&1 | tail -10
# Expected: FAIL — routes not found
```

- [ ] **Step 3: Crear el servicio admin**

```typescript
// backend/src/services/ayurveda-admin.service.ts
import { supabaseAdmin } from '../config/supabase';
import * as XLSX from 'xlsx';

export async function getAyurvedaAlumnos(generacion?: string) {
  let query = supabaseAdmin
    .from('inscripciones_diplomado')
    .select('id, nombre_completo, email_gmail, whatsapp, fecha_nacimiento, razon, estado_pago, created_at, diplomados(nombre, generacion)');

  if (generacion) {
    query = (query as ReturnType<typeof supabaseAdmin.from>).eq('diplomados.generacion', generacion) as typeof query;
  }

  const { data, error } = await query.order('created_at', { ascending: false });

  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function exportAyurvedaAlumnosToExcel(generacion: string): Promise<Buffer> {
  const { data, error } = await supabaseAdmin
    .from('inscripciones_diplomado')
    .select('id, nombre_completo, email_gmail, whatsapp, fecha_nacimiento, razon, estado_pago, created_at, diplomados(nombre, generacion)')
    .eq('diplomados.generacion', generacion)
    .order('created_at', { ascending: false });

  if (error) throw new Error(error.message);

  const alumnos = data ?? [];

  const rows = (alumnos as Array<Record<string, unknown>>).map((a) => {
    const diplomado = a.diplomados as { nombre: string; generacion: string } | null;
    return {
      'Nombre completo': a.nombre_completo,
      'Email Gmail': a.email_gmail,
      'WhatsApp': a.whatsapp,
      'Fecha de nacimiento': a.fecha_nacimiento ? new Date(a.fecha_nacimiento as string).toLocaleDateString('es-MX') : '—',
      'Razón': a.razon ?? '—',
      'Estado pago': a.estado_pago,
      'Diplomado': diplomado?.nombre ?? '—',
      'Generación': diplomado?.generacion ?? generacion,
      'Fecha inscripción': new Date(a.created_at as string).toLocaleDateString('es-MX'),
    };
  });

  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Alumnos Ayurveda');
  return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }) as Buffer;
}
```

- [ ] **Step 4: Agregar endpoints a admin.ts**

En `backend/src/routes/admin.ts`, agregar el import al inicio (después de los imports existentes de shala-admin.service):

```typescript
import {
  getAyurvedaAlumnos,
  exportAyurvedaAlumnosToExcel,
} from '../services/ayurveda-admin.service';
```

Y agregar los endpoints antes del `export default router;`:

```typescript
router.get('/ayurveda/alumnos', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { generacion } = req.query as Record<string, string>;
    const alumnos = await getAyurvedaAlumnos(generacion);
    res.json(alumnos);
  } catch (err: unknown) {
    res.status(500).json({ error: err instanceof Error ? err.message : 'Error' });
  }
});

router.get('/ayurveda/exportar/:generacion', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const generacion = decodeURIComponent(req.params.generacion);
    const buffer = await exportAyurvedaAlumnosToExcel(generacion);
    const fecha = new Date().toISOString().split('T')[0];
    const nombreArch = `ayurveda-${generacion.replace(/\s+/g, '-')}-${fecha}.xlsx`;
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${nombreArch}"`);
    res.send(buffer);
  } catch (err: unknown) {
    res.status(500).json({ error: err instanceof Error ? err.message : 'Error' });
  }
});
```

- [ ] **Step 5: Ejecutar todos los tests del backend**

```bash
cd /Users/mariferubieto/Desktop/wellness-platform
npx jest backend/tests/ --no-coverage 2>&1 | tail -20
# Expected: all test suites PASS
```

- [ ] **Step 6: Commit**

```bash
git add backend/src/services/ayurveda-admin.service.ts \
        backend/src/routes/admin.ts \
        backend/tests/admin-ayurveda.test.ts
git commit -m "feat: admin endpoints AYURVEDA (alumnos por generación, exportación Excel)"
```

---

## Task 4: Frontend — Página pública Ayurveda

**Files:**
- Create: `frontend/components/ayurveda/DiplomadoCard.tsx`
- Create: `frontend/app/ayurveda/page.tsx`
- Create: `frontend/app/ayurveda/[id]/page.tsx`
- Create: `frontend/app/ayurveda/inscripcion/page.tsx`

- [ ] **Step 1: Crear componente DiplomadoCard**

```typescript
// frontend/components/ayurveda/DiplomadoCard.tsx
import Link from 'next/link';

interface Diplomado {
  id: string;
  nombre: string;
  descripcion?: string;
  precio: number;
  generacion: string;
}

export default function DiplomadoCard({ diplomado }: { diplomado: Diplomado }) {
  return (
    <div className="card-wellness flex flex-col">
      <div className="flex-1">
        <p className="label-wellness mb-3">{diplomado.generacion}</p>
        <h3 className="text-xl text-tierra mb-2">{diplomado.nombre}</h3>
        {diplomado.descripcion && (
          <p className="text-tierra-light text-sm leading-relaxed line-clamp-3">{diplomado.descripcion}</p>
        )}
      </div>
      <div className="mt-6 pt-6 border-t border-beige-lino flex items-center justify-between">
        <p className="text-2xl font-light text-tierra">
          ${diplomado.precio.toLocaleString('es-MX')} <span className="text-sm text-tierra-light">MXN</span>
        </p>
        <Link href={`/ayurveda/${diplomado.id}`} className="btn-primary text-xs">
          Ver más
        </Link>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Crear página catálogo Ayurveda**

```typescript
// frontend/app/ayurveda/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import DiplomadoCard from '@/components/ayurveda/DiplomadoCard';

interface Diplomado {
  id: string;
  nombre: string;
  descripcion?: string;
  precio: number;
  generacion: string;
}

export default function AyurvedaPage() {
  const [diplomados, setDiplomados] = useState<Diplomado[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get<Diplomado[]>('/api/ayurveda/diplomados')
      .then(setDiplomados)
      .catch(() => setDiplomados([]))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="min-h-screen px-4 py-16">
      <div className="max-w-5xl mx-auto">

        <div className="text-center mb-16">
          <div className="w-16 h-px bg-sand mx-auto mb-8" />
          <h1 className="text-5xl text-tierra mb-4">Manali Ayurveda</h1>
          <p className="text-tierra-light max-w-lg mx-auto leading-relaxed">
            Formación profesional en Ayurveda. Diplomados online con maestras certificadas.
          </p>
        </div>

        {loading ? (
          <p className="text-center text-tierra-light text-sm tracking-widest uppercase">Cargando...</p>
        ) : diplomados.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-tierra-light text-sm">No hay diplomados disponibles por el momento.</p>
            <p className="text-tierra-light text-xs mt-2">Próximamente nuevas generaciones.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {diplomados.map(d => (
              <DiplomadoCard key={d.id} diplomado={d} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Crear página detalle del diplomado**

```typescript
// frontend/app/ayurveda/[id]/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { api } from '@/lib/api';

interface Diplomado {
  id: string;
  nombre: string;
  descripcion?: string;
  temario?: string[];
  calendario?: string[];
  precio: number;
  generacion: string;
  activo: boolean;
}

export default function DiplomadoDetallePage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [diplomado, setDiplomado] = useState<Diplomado | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get<Diplomado>(`/api/ayurveda/diplomados/${id}`)
      .then(setDiplomado)
      .catch(() => setError('Diplomado no encontrado'))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-tierra-light text-sm tracking-widest uppercase">Cargando...</p>
      </div>
    );
  }

  if (error || !diplomado) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-tierra-light text-sm mb-4">{error || 'Diplomado no encontrado'}</p>
          <button onClick={() => router.push('/ayurveda')} className="btn-secondary text-xs">
            Ver todos los diplomados
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen px-4 py-16">
      <div className="max-w-3xl mx-auto">

        <button
          onClick={() => router.push('/ayurveda')}
          className="text-tierra-light text-xs tracking-widest uppercase mb-10 hover:text-tierra transition-colors"
        >
          ← Todos los diplomados
        </button>

        <div className="w-8 h-px bg-sand mb-6" />
        <p className="label-wellness mb-3">{diplomado.generacion}</p>
        <h1 className="text-4xl text-tierra mb-6">{diplomado.nombre}</h1>

        {diplomado.descripcion && (
          <p className="text-tierra-light leading-relaxed mb-10">{diplomado.descripcion}</p>
        )}

        {diplomado.temario && diplomado.temario.length > 0 && (
          <div className="mb-10">
            <div className="w-6 h-px bg-sand mb-4" />
            <h2 className="text-xl text-tierra mb-4">Temario</h2>
            <ul className="space-y-2">
              {diplomado.temario.map((modulo, i) => (
                <li key={i} className="flex gap-3 text-sm text-tierra-light">
                  <span className="text-sand font-light mt-0.5">—</span>
                  <span>{modulo}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {diplomado.calendario && diplomado.calendario.length > 0 && (
          <div className="mb-10">
            <div className="w-6 h-px bg-sand mb-4" />
            <h2 className="text-xl text-tierra mb-4">Calendario</h2>
            <ul className="space-y-2">
              {diplomado.calendario.map((fecha, i) => (
                <li key={i} className="flex gap-3 text-sm text-tierra-light">
                  <span className="text-sand font-light mt-0.5">—</span>
                  <span>{fecha}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="border border-sand rounded-wellness p-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <p className="label-wellness mb-1">Inversión</p>
              <p className="text-4xl font-light text-tierra">
                ${diplomado.precio.toLocaleString('es-MX')} <span className="text-base text-tierra-light">MXN</span>
              </p>
            </div>
          </div>
          <button
            onClick={() => router.push(`/ayurveda/inscripcion?diplomado_id=${diplomado.id}`)}
            className="btn-primary w-full text-center"
          >
            Inscribirme
          </button>
          <p className="text-tierra-light text-xs text-center mt-4">
            Recibirás confirmación por WhatsApp una vez validado tu pago.
          </p>
        </div>

      </div>
    </div>
  );
}
```

- [ ] **Step 4: Crear página de formulario de inscripción**

```typescript
// frontend/app/ayurveda/inscripcion/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import Input from '@/components/ui/Input';
import Button from '@/components/ui/Button';

interface Diplomado {
  id: string;
  nombre: string;
  precio: number;
  generacion: string;
}

export default function InscripcionPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const diplomadoId = searchParams.get('diplomado_id') ?? '';

  const [diplomado, setDiplomado] = useState<Diplomado | null>(null);
  const [cargando, setCargando] = useState(true);
  const [enviando, setEnviando] = useState(false);
  const [exito, setExito] = useState(false);
  const [error, setError] = useState('');

  const [form, setForm] = useState({
    nombre_completo: '',
    fecha_nacimiento: '',
    whatsapp: '',
    email_gmail: '',
    razon: '',
  });

  useEffect(() => {
    if (!diplomadoId) {
      router.push('/ayurveda');
      return;
    }
    api.get<Diplomado>(`/api/ayurveda/diplomados/${diplomadoId}`)
      .then(setDiplomado)
      .catch(() => router.push('/ayurveda'))
      .finally(() => setCargando(false));
  }, [diplomadoId, router]);

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setEnviando(true);

    try {
      await api.post('/api/ayurveda/inscripciones', {
        diplomado_id: diplomadoId,
        ...form,
      });
      setExito(true);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error al enviar inscripción');
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
            Gracias por inscribirte. Recibirás confirmación por WhatsApp en las próximas horas.
          </p>
          <button onClick={() => router.push('/ayurveda')} className="btn-secondary">
            Volver a diplomados
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen px-4 py-16">
      <div className="max-w-lg mx-auto">
        <button
          onClick={() => router.push(`/ayurveda/${diplomadoId}`)}
          className="text-tierra-light text-xs tracking-widest uppercase mb-10 hover:text-tierra transition-colors"
        >
          ← Regresar
        </button>

        <div className="w-8 h-px bg-sand mb-6" />
        <h1 className="text-3xl text-tierra mb-2">Formulario de inscripción</h1>
        {diplomado && (
          <p className="text-tierra-light text-sm mb-10">
            {diplomado.nombre} · {diplomado.generacion}
          </p>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <Input
            label="Nombre completo"
            name="nombre_completo"
            value={form.nombre_completo}
            onChange={handleChange}
            required
          />
          <Input
            label="Fecha de nacimiento"
            name="fecha_nacimiento"
            type="date"
            value={form.fecha_nacimiento}
            onChange={handleChange}
          />
          <Input
            label="WhatsApp"
            name="whatsapp"
            type="tel"
            value={form.whatsapp}
            onChange={handleChange}
            placeholder="10 dígitos"
            required
          />
          <Input
            label="Email Gmail"
            name="email_gmail"
            type="email"
            value={form.email_gmail}
            onChange={handleChange}
            placeholder="nombre@gmail.com"
            required
          />

          <div>
            <label className="label-wellness block mb-2">¿Por qué quieres estudiar Ayurveda?</label>
            <textarea
              name="razon"
              value={form.razon}
              onChange={handleChange}
              rows={4}
              className="w-full px-4 py-3 bg-white border border-beige-lino rounded-wellness text-sm text-tierra placeholder:text-tierra-light/50 focus:outline-none focus:border-sage transition-colors resize-none"
              placeholder="Compártenos tu motivación..."
            />
          </div>

          {error && <p className="text-red-400 text-xs">{error}</p>}

          <Button type="submit" loading={enviando} className="w-full">
            Enviar inscripción
          </Button>

          <p className="text-tierra-light text-xs text-center">
            Al enviar confirmas tu intención de inscripción. El pago y confirmación se coordinan por WhatsApp.
          </p>
        </form>
      </div>
    </div>
  );
}
```

- [ ] **Step 5: Verificar compilación del frontend**

```bash
cd /Users/mariferubieto/Desktop/wellness-platform/frontend
npx next build 2>&1 | tail -20
# Expected: "✓ Compiled successfully" (or Route (app) table with no errors)
```

- [ ] **Step 6: Commit**

```bash
git add frontend/components/ayurveda/DiplomadoCard.tsx \
        frontend/app/ayurveda/page.tsx \
        frontend/app/ayurveda/[id]/page.tsx \
        frontend/app/ayurveda/inscripcion/page.tsx
git commit -m "feat: página pública Ayurveda (catálogo, detalle, formulario inscripción)"
```

---

## Task 5: Frontend — Admin panel AYURVEDA

**Files:**
- Create: `frontend/app/admin/ayurveda/page.tsx`
- Modify: `frontend/app/admin/layout.tsx`

- [ ] **Step 1: Actualizar el sidebar del admin con links AYURVEDA**

En `frontend/app/admin/layout.tsx`, reemplazar el array `navLinks`:

```typescript
  const navLinks = [
    { href: '/admin', label: 'Dashboard' },
    { href: '/admin/crm', label: 'CRM' },
    { href: '/admin/shala', label: 'SHALA' },
    { href: '/admin/shala/alumnos', label: '↳ Alumnos' },
    { href: '/admin/ayurveda', label: 'AYURVEDA' },
  ];
```

- [ ] **Step 2: Crear página admin Ayurveda**

```typescript
// frontend/app/admin/ayurveda/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import Button from '@/components/ui/Button';

interface Inscripcion {
  id: string;
  nombre_completo: string;
  email_gmail: string;
  whatsapp: string;
  fecha_nacimiento?: string;
  razon?: string;
  estado_pago: string;
  created_at: string;
  diplomados: { nombre: string; generacion: string } | null;
}

interface Diplomado {
  id: string;
  nombre: string;
  generacion: string;
  precio: number;
  activo: boolean;
}

export default function AdminAyurvedaPage() {
  const [inscripciones, setInscripciones] = useState<Inscripcion[]>([]);
  const [diplomados, setDiplomados] = useState<Diplomado[]>([]);
  const [generacionFiltro, setGeneracionFiltro] = useState('');
  const [generaciones, setGeneraciones] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [exportando, setExportando] = useState(false);
  const [exportError, setExportError] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    Promise.all([
      api.get<Inscripcion[]>('/api/admin/ayurveda/alumnos').catch(() => [] as Inscripcion[]),
      api.get<Diplomado[]>('/api/ayurveda/diplomados').catch(() => [] as Diplomado[]),
    ])
      .then(([insc, dips]) => {
        setInscripciones(insc);
        setDiplomados(dips);
        const gens = [...new Set(insc.map(i => i.diplomados?.generacion).filter(Boolean))] as string[];
        setGeneraciones(gens);
      })
      .catch((err: unknown) => setError(err instanceof Error ? err.message : 'Error'))
      .finally(() => setLoading(false));
  }, []);

  const inscripcionesFiltradas = generacionFiltro
    ? inscripciones.filter(i => i.diplomados?.generacion === generacionFiltro)
    : inscripciones;

  async function handleExportar() {
    if (!generacionFiltro) return;
    setExportando(true);
    setExportError('');
    try {
      const { createSupabaseClient } = await import('@/lib/supabase');
      const supabase = createSupabaseClient();
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) throw new Error('Sin sesión');

      const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
      const genEncoded = encodeURIComponent(generacionFiltro);
      const res = await fetch(`${API_URL}/api/admin/ayurveda/exportar/${genEncoded}`, {
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
      a.download = `ayurveda-${generacionFiltro.replace(/\s+/g, '-')}-${new Date().toISOString().split('T')[0]}.xlsx`;
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
      <div className="mb-8 flex items-start justify-between">
        <div>
          <div className="w-8 h-px bg-sand mb-4" />
          <h1 className="text-3xl text-tierra">AYURVEDA — Inscripciones</h1>
          <p className="text-tierra-light text-sm mt-1">{inscripciones.length} inscripciones totales</p>
        </div>
      </div>

      {error && <p className="text-red-500 text-sm mb-4">{error}</p>}

      {/* Diplomados activos */}
      {diplomados.length > 0 && (
        <div className="mb-8">
          <h2 className="text-lg text-tierra mb-3">Diplomados activos</h2>
          <div className="flex flex-wrap gap-3">
            {diplomados.map(d => (
              <div key={d.id} className="bg-white border border-beige-lino rounded-wellness px-4 py-3">
                <p className="text-sm text-tierra">{d.nombre}</p>
                <p className="text-xs text-tierra-light">{d.generacion} · ${d.precio.toLocaleString('es-MX')} MXN</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Filtro por generación */}
      <div className="mb-6 flex items-center gap-4 flex-wrap">
        <div>
          <label className="label-wellness block mb-2">Filtrar por generación</label>
          <select
            value={generacionFiltro}
            onChange={e => setGeneracionFiltro(e.target.value)}
            className="px-4 py-2 bg-white border border-beige-lino rounded-wellness text-sm text-tierra focus:outline-none focus:border-sage"
          >
            <option value="">Todas las generaciones</option>
            {generaciones.map(g => (
              <option key={g} value={g}>{g}</option>
            ))}
          </select>
        </div>
        {generacionFiltro && (
          <div className="mt-6">
            <Button variant="secondary" onClick={handleExportar} loading={exportando}>
              Exportar {generacionFiltro}
            </Button>
          </div>
        )}
      </div>

      {exportError && <p className="text-red-400 text-xs mb-4">{exportError}</p>}

      {/* Tabla de inscripciones */}
      {loading ? (
        <p className="text-tierra-light text-sm tracking-widest uppercase">Cargando...</p>
      ) : inscripcionesFiltradas.length === 0 ? (
        <div className="card-wellness text-center py-12">
          <p className="text-tierra-light text-sm">No hay inscripciones</p>
        </div>
      ) : (
        <div className="bg-white border border-beige-lino rounded-wellness overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-beige-lino">
                <th className="label-wellness text-left px-4 py-3">Nombre</th>
                <th className="label-wellness text-left px-4 py-3">WhatsApp</th>
                <th className="label-wellness text-left px-4 py-3">Gmail</th>
                <th className="label-wellness text-left px-4 py-3">Generación</th>
                <th className="label-wellness text-left px-4 py-3">Pago</th>
                <th className="label-wellness text-left px-4 py-3">Fecha</th>
              </tr>
            </thead>
            <tbody>
              {inscripcionesFiltradas.map((insc, i) => (
                <tr
                  key={insc.id}
                  className={`border-b border-beige-lino last:border-0 ${i % 2 === 0 ? 'bg-white' : 'bg-beige/30'}`}
                >
                  <td className="px-4 py-3 text-tierra">{insc.nombre_completo}</td>
                  <td className="px-4 py-3 text-tierra-mid">{insc.whatsapp}</td>
                  <td className="px-4 py-3 text-tierra-light text-xs">{insc.email_gmail}</td>
                  <td className="px-4 py-3 text-tierra-light text-xs">{insc.diplomados?.generacion ?? '—'}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-1 rounded-full ${
                      insc.estado_pago === 'completado'
                        ? 'bg-sage-muted text-sage'
                        : insc.estado_pago === 'fallido'
                        ? 'bg-red-50 text-red-400'
                        : 'bg-beige text-tierra-light'
                    }`}>
                      {insc.estado_pago}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-tierra-light text-xs">
                    {new Date(insc.created_at).toLocaleDateString('es-MX', {
                      day: 'numeric', month: 'short', year: 'numeric',
                    })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 3: Verificar compilación final**

```bash
cd /Users/mariferubieto/Desktop/wellness-platform/frontend
npx next build 2>&1 | tail -20
# Expected: "✓ Compiled successfully"
```

- [ ] **Step 4: Ejecutar todos los tests del backend**

```bash
cd /Users/mariferubieto/Desktop/wellness-platform
npx jest backend/tests/ --no-coverage 2>&1 | tail -15
# Expected: all test suites PASS
```

- [ ] **Step 5: Commit final**

```bash
git add frontend/app/admin/ayurveda/page.tsx \
        frontend/app/admin/layout.tsx
git commit -m "feat: panel admin AYURVEDA (inscripciones por generación, exportación Excel)"
```

---

## Resumen de lo que se entrega

- ✅ Schema SQL tablas `diplomados` + `inscripciones_diplomado` con RLS
- ✅ API de diplomados (GET público catálogo y detalle, POST/PATCH admin)
- ✅ Inscripción sin login requerido (nombre, fecha de nacimiento, WhatsApp, Gmail, razón)
- ✅ Admin: lista de inscripciones filtrable por generación + exportación Excel por generación
- ✅ Frontend: catálogo de diplomados, página de detalle, formulario de inscripción
- ✅ Panel admin Ayurveda con tabla de inscritos y export
- ✅ Nav del admin actualizado con sección AYURVEDA
