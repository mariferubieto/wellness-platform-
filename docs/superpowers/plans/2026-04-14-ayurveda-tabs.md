# Ayurveda Tabs Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reescribir `/ayurveda` con 4 tabs (Diplomados · Cocina · Pranayamas · Cursos Especiales), modal de detalle al hacer clic, e inscripción con MercadoPago (pago) o captura de leads (gratis) según `tipo_acceso` del curso.

**Architecture:** Migración SQL agrega `tipo_acceso` a `cursos_ayurveda`, renombra `mudras→pranayamas` y crea `inscripciones_cursos`. Backend expone `POST /api/ayurveda/cursos-inscripciones` y agrega `'curso_ayurveda'` a pagos. Frontend reescribe la página pública con tabs + modal y actualiza el admin y la página de inscripción.

**Tech Stack:** Next.js 14 App Router · Express + Supabase · Tailwind CSS wellness tokens · TypeScript

**Working directory:** `/Users/mariferubieto/Desktop/wellness-platform`

---

## File Map

| Archivo | Acción |
|---|---|
| `database/migrations/010_cursos_ayurveda_update.sql` | Crear |
| `backend/src/routes/ayurveda/cursos.ts` | Modificar |
| `backend/src/routes/ayurveda/cursos-inscripciones.ts` | Crear |
| `backend/src/routes/ayurveda/index.ts` | Modificar |
| `backend/src/routes/pagos/index.ts` | Modificar |
| `backend/tests/cursos-inscripciones.test.ts` | Crear |
| `frontend-marifer/lib/pagos.ts` | Modificar |
| `frontend-marifer/app/admin/ayurveda/page.tsx` | Modificar |
| `frontend-marifer/components/ayurveda/DiplomadoCard.tsx` | Modificar |
| `frontend-marifer/components/ayurveda/CursoCard.tsx` | Crear |
| `frontend-marifer/components/ayurveda/ModalDetalleCurso.tsx` | Crear |
| `frontend-marifer/app/ayurveda/page.tsx` | Reescribir |
| `frontend-marifer/app/ayurveda/inscripcion/page.tsx` | Modificar |

---

## Task 1: Migración SQL 010

**Files:**
- Create: `database/migrations/010_cursos_ayurveda_update.sql`

- [ ] **Step 1: Crear el archivo de migración**

```sql
-- database/migrations/010_cursos_ayurveda_update.sql

-- 1. Agregar tipo_acceso a cursos_ayurveda
ALTER TABLE cursos_ayurveda
  ADD COLUMN IF NOT EXISTS tipo_acceso text
    CHECK (tipo_acceso IN ('pago', 'whatsapp', 'gratis'))
    DEFAULT 'pago';

-- 2. Renombrar mudras → pranayamas (UPDATE debe ir antes de cambiar la constraint)
UPDATE cursos_ayurveda SET tipo = 'pranayamas' WHERE tipo = 'mudras';

-- 3. Actualizar CHECK constraint del tipo
ALTER TABLE cursos_ayurveda DROP CONSTRAINT IF EXISTS cursos_ayurveda_tipo_check;
ALTER TABLE cursos_ayurveda
  ADD CONSTRAINT cursos_ayurveda_tipo_check
    CHECK (tipo IN ('cocina', 'pranayamas', 'extras'));

-- 4. Tabla de inscripciones para cursos
CREATE TABLE IF NOT EXISTS inscripciones_cursos (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  curso_id uuid REFERENCES cursos_ayurveda(id) ON DELETE CASCADE NOT NULL,
  nombre_completo text NOT NULL,
  whatsapp text NOT NULL,
  email text NOT NULL,
  created_at timestamptz DEFAULT now()
);
```

- [ ] **Step 2: Ejecutar en Supabase**

Abrir https://supabase.com/dashboard/project/rsahtjffquqveshjalky/sql/new, pegar el contenido del archivo y ejecutar.

Expected: Sin errores. Verificar en Table Editor que `cursos_ayurveda` tiene columna `tipo_acceso` y existe la tabla `inscripciones_cursos`.

- [ ] **Step 3: Commit**

```bash
git add database/migrations/010_cursos_ayurveda_update.sql
git commit -m "feat: migración 010 — tipo_acceso, pranayamas, inscripciones_cursos"
```

---

## Task 2: Backend — cursos + inscripciones + pagos

**Files:**
- Modify: `backend/src/routes/ayurveda/cursos.ts`
- Create: `backend/src/routes/ayurveda/cursos-inscripciones.ts`
- Modify: `backend/src/routes/ayurveda/index.ts`
- Modify: `backend/src/routes/pagos/index.ts`
- Create: `backend/tests/cursos-inscripciones.test.ts`

- [ ] **Step 1: Escribir tests para el nuevo endpoint**

Crear `backend/tests/cursos-inscripciones.test.ts`:

```typescript
import request from 'supertest';
import app from '../src/app';

const VALID_BODY = {
  curso_id: 'curso-1',
  nombre_completo: 'Ana García',
  whatsapp: '5512345678',
  email: 'ana@example.com',
};

jest.mock('../src/config/supabase', () => ({
  supabaseAdmin: {
    from: jest.fn().mockReturnThis(),
    insert: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    single: jest.fn().mockResolvedValue({
      data: { id: 'insc-1', ...VALID_BODY, created_at: new Date().toISOString() },
      error: null,
    }),
  },
}));

describe('POST /api/ayurveda/cursos-inscripciones', () => {
  it('creates inscription with valid body', async () => {
    const res = await request(app)
      .post('/api/ayurveda/cursos-inscripciones')
      .send(VALID_BODY);
    expect(res.status).toBe(201);
    expect(res.body.id).toBe('insc-1');
    expect(res.body.nombre_completo).toBe('Ana García');
  });

  it('returns 400 when nombre_completo is missing', async () => {
    const { nombre_completo, ...body } = VALID_BODY;
    const res = await request(app)
      .post('/api/ayurveda/cursos-inscripciones')
      .send(body);
    expect(res.status).toBe(400);
    expect(res.body.error).toBeDefined();
  });

  it('returns 400 when email is missing', async () => {
    const { email, ...body } = VALID_BODY;
    const res = await request(app)
      .post('/api/ayurveda/cursos-inscripciones')
      .send(body);
    expect(res.status).toBe(400);
  });

  it('returns 400 when curso_id is missing', async () => {
    const { curso_id, ...body } = VALID_BODY;
    const res = await request(app)
      .post('/api/ayurveda/cursos-inscripciones')
      .send(body);
    expect(res.status).toBe(400);
  });
});
```

- [ ] **Step 2: Ejecutar tests para verificar que fallan**

```bash
cd /Users/mariferubieto/Desktop/wellness-platform/backend
npx jest --no-coverage tests/cursos-inscripciones.test.ts 2>&1 | tail -10
```

Expected: FAIL — "Cannot find module" o similar.

- [ ] **Step 3: Crear el endpoint cursos-inscripciones**

Crear `backend/src/routes/ayurveda/cursos-inscripciones.ts`:

```typescript
import { Router, Request, Response } from 'express';
import { supabaseAdmin } from '../../config/supabase';

const router = Router();

router.post('/', async (req: Request, res: Response): Promise<void> => {
  const { curso_id, nombre_completo, whatsapp, email } = req.body;

  if (!curso_id || !nombre_completo || !whatsapp || !email) {
    res.status(400).json({ error: 'curso_id, nombre_completo, whatsapp y email son requeridos' });
    return;
  }

  const { data, error } = await supabaseAdmin
    .from('inscripciones_cursos')
    .insert({ curso_id, nombre_completo, whatsapp, email })
    .select()
    .single();

  if (error) {
    res.status(400).json({ error: error.message });
    return;
  }

  res.status(201).json(data);
});

export default router;
```

- [ ] **Step 4: Montar el nuevo router en index.ts**

Leer `backend/src/routes/ayurveda/index.ts` — reemplazar su contenido con:

```typescript
import { Router } from 'express';
import diplomadosRouter from './diplomados';
import inscripcionesRouter from './inscripciones';
import cursosRouter from './cursos';
import cursosInscripcionesRouter from './cursos-inscripciones';

const router = Router();
router.use('/diplomados', diplomadosRouter);
router.use('/inscripciones', inscripcionesRouter);
router.use('/cursos', cursosRouter);
router.use('/cursos-inscripciones', cursosInscripcionesRouter);

export default router;
```

- [ ] **Step 5: Ejecutar tests para verificar que pasan**

```bash
npx jest --no-coverage tests/cursos-inscripciones.test.ts 2>&1 | tail -10
```

Expected: PASS — 4/4 tests passing.

- [ ] **Step 6: Actualizar cursos.ts — renombrar mudras→pranayamas y añadir tipo_acceso**

Leer `backend/src/routes/ayurveda/cursos.ts`. Aplicar estos cambios:

```typescript
// Cambiar la definición de tipo (línea ~8):
type TipoCurso = 'cocina' | 'pranayamas' | 'extras';

// En GET /:tipo — cambiar el array de validación (línea ~15):
if (!['cocina', 'pranayamas', 'extras'].includes(tipo)) {

// En POST / — cambiar el array de validación y añadir tipo_acceso:
if (!['cocina', 'pranayamas', 'extras'].includes(tipo)) {
// Añadir tipo_acceso en el destructuring del body:
const { tipo, nombre, descripcion, temario, fechas, precio, foto_url, cupo_maximo, tipo_acceso } = req.body;
// Añadir tipo_acceso en el insert:
.insert({
  tipo,
  nombre,
  descripcion: descripcion ?? null,
  temario: temario ?? null,
  fechas: fechas ?? null,
  precio: precio ? Number(precio) : 0,
  foto_url: foto_url ?? null,
  cupo_maximo: cupo_maximo ? Number(cupo_maximo) : null,
  tipo_acceso: tipo_acceso ?? 'pago',
})

// En PATCH /:id — añadir tipo_acceso al destructuring y al objeto updates:
const { nombre, descripcion, temario, fechas, precio, foto_url, cupo_maximo, activo, tipo_acceso } = req.body;
// Añadir al bloque de updates:
if (tipo_acceso !== undefined) updates.tipo_acceso = tipo_acceso;
```

- [ ] **Step 7: Añadir 'curso_ayurveda' al endpoint de pagos**

Leer `backend/src/routes/pagos/index.ts`. Localizar la línea con `validConceptos` y cambiarla:

```typescript
// Antes:
const validConceptos = ['paquete_shala', 'diplomado', 'retiro', 'evento'];
// Después:
const validConceptos = ['paquete_shala', 'diplomado', 'retiro', 'evento', 'curso_ayurveda'];
```

- [ ] **Step 8: Correr todos los tests del backend**

```bash
npx jest --no-coverage 2>&1 | tail -8
```

Expected: 4 nuevos tests passing. Total ~94 passing, 2 pre-existing failures (maestros, pagos webhook).

- [ ] **Step 9: Commit**

```bash
git add backend/src/routes/ayurveda/cursos.ts \
        backend/src/routes/ayurveda/cursos-inscripciones.ts \
        backend/src/routes/ayurveda/index.ts \
        backend/src/routes/pagos/index.ts \
        backend/tests/cursos-inscripciones.test.ts
git commit -m "feat: backend ayurveda — pranayamas, tipo_acceso, cursos-inscripciones, pagos"
```

---

## Task 3: Admin — pranayamas + tipo_acceso

**Files:**
- Modify: `frontend-marifer/app/admin/ayurveda/page.tsx`

- [ ] **Step 1: Renombrar mudras→pranayamas y añadir tipo_acceso**

Leer `frontend-marifer/app/admin/ayurveda/page.tsx`. Aplicar los siguientes cambios:

**a) Tipo CursoAyurveda (línea ~25):**
```typescript
// Antes:
tipo: 'cocina' | 'mudras' | 'extras';
// Después:
tipo: 'cocina' | 'pranayamas' | 'extras';
// Añadir campo:
tipo_acceso: 'pago' | 'whatsapp' | 'gratis';
```

**b) CursoTabProps (línea ~37):**
```typescript
// Antes:
interface CursoTabProps { tipo: 'cocina' | 'mudras' | 'extras'; label: string; }
// Después:
interface CursoTabProps { tipo: 'cocina' | 'pranayamas' | 'extras'; label: string; }
```

**c) TabId (línea ~45):**
```typescript
// Antes:
type TabId = 'diplomados' | 'cocina' | 'mudras' | 'extras' | 'inscripciones';
// Después:
type TabId = 'diplomados' | 'cocina' | 'pranayamas' | 'extras' | 'inscripciones';
```

**d) Array TABS (líneas ~47-53):**
```typescript
const TABS: { id: TabId; label: string }[] = [
  { id: 'diplomados', label: 'Diplomados' },
  { id: 'cocina', label: 'Clases de Cocina' },
  { id: 'pranayamas', label: 'Pranayamas' },
  { id: 'extras', label: 'Cursos Especiales' },
  { id: 'inscripciones', label: 'Inscripciones' },
];
```

**e) Form state de CursoTab — añadir tipo_acceso:**
```typescript
// En el useState del form dentro de CursoTab, añadir campo:
const [form, setForm] = useState({
  nombre: '', descripcion: '', temario: '', fechas: '', precio: '',
  foto_url: '', cupo_maximo: '', tipo_acceso: 'pago' as 'pago' | 'whatsapp' | 'gratis',
});
```

**f) handleSubmit de CursoTab — incluir tipo_acceso en el POST:**
```typescript
await api.post('/api/ayurveda/cursos', {
  tipo,
  nombre: form.nombre,
  descripcion: form.descripcion || undefined,
  temario: form.temario ? parseLines(form.temario) : undefined,
  fechas: form.fechas ? parseLines(form.fechas) : undefined,
  precio: Number(form.precio) || 0,
  foto_url: form.foto_url || undefined,
  cupo_maximo: form.cupo_maximo ? Number(form.cupo_maximo) : undefined,
  tipo_acceso: form.tipo_acceso,
});
```

**g) JSX del form de CursoTab — añadir select antes del botón de submit:**
```tsx
<div>
  <label className="label-wellness">Tipo de acceso</label>
  <select
    value={form.tipo_acceso}
    onChange={e => setForm(f => ({ ...f, tipo_acceso: e.target.value as 'pago' | 'whatsapp' | 'gratis' }))}
    className="input-wellness mt-1"
  >
    <option value="pago">Pago (MercadoPago)</option>
    <option value="whatsapp">WhatsApp (contacto directo)</option>
    <option value="gratis">Recopilación de datos</option>
  </select>
</div>
```

**h) Renderizado al pie — cambiar mudras por pranayamas:**
```tsx
// Antes:
{activeTab === 'mudras' && <CursoTab tipo="mudras" label="Mudras y Bandhas" />}
// Después:
{activeTab === 'pranayamas' && <CursoTab tipo="pranayamas" label="Pranayamas" />}
```

- [ ] **Step 2: Verificar build del frontend-marifer**

```bash
cd /Users/mariferubieto/Desktop/wellness-platform/frontend-marifer
npm run build 2>&1 | tail -10
```

Expected: Build exitoso sin errores TypeScript.

- [ ] **Step 3: Commit**

```bash
git add frontend-marifer/app/admin/ayurveda/page.tsx
git commit -m "feat: admin ayurveda — pranayamas, tipo_acceso en formulario de cursos"
```

---

## Task 4: DiplomadoCard + CursoCard

**Files:**
- Modify: `frontend-marifer/components/ayurveda/DiplomadoCard.tsx`
- Create: `frontend-marifer/components/ayurveda/CursoCard.tsx`

- [ ] **Step 1: Modificar DiplomadoCard para aceptar onClick**

Leer `frontend-marifer/components/ayurveda/DiplomadoCard.tsx`. Reemplazar todo el contenido con:

```tsx
import Link from 'next/link';

interface Diplomado {
  id: string;
  nombre: string;
  descripcion?: string;
  precio: number;
  generacion: string;
}

interface Props {
  diplomado: Diplomado;
  onClick?: () => void;
}

export default function DiplomadoCard({ diplomado, onClick }: Props) {
  const inner = (
    <>
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
        <span className="btn-primary text-xs">Ver más</span>
      </div>
    </>
  );

  if (onClick) {
    return (
      <div
        className="card-wellness flex flex-col cursor-pointer hover:shadow-md transition-shadow"
        onClick={onClick}
      >
        {inner}
      </div>
    );
  }

  return (
    <Link href={`/ayurveda/${diplomado.id}`} className="card-wellness flex flex-col">
      {inner}
    </Link>
  );
}
```

- [ ] **Step 2: Crear CursoCard**

Crear `frontend-marifer/components/ayurveda/CursoCard.tsx`:

```tsx
interface Curso {
  id: string;
  nombre: string;
  descripcion?: string;
  fechas?: string[];
  precio: number;
  foto_url?: string;
  tipo_acceso: 'pago' | 'whatsapp' | 'gratis';
}

export default function CursoCard({ curso, onClick }: { curso: Curso; onClick: () => void }) {
  return (
    <div
      className="card-wellness flex flex-col cursor-pointer hover:shadow-md transition-shadow"
      onClick={onClick}
    >
      {curso.foto_url && (
        <img
          src={curso.foto_url}
          alt={curso.nombre}
          className="w-full h-40 object-cover rounded-t-wellness mb-4"
        />
      )}
      <div className="flex-1">
        <div className="flex items-start justify-between gap-2 mb-2">
          <h3 className="text-xl text-tierra">{curso.nombre}</h3>
          {curso.tipo_acceso === 'gratis' && (
            <span className="text-xs px-2 py-0.5 bg-sage-muted text-sage rounded-full whitespace-nowrap">
              Registro abierto
            </span>
          )}
        </div>
        {curso.descripcion && (
          <p className="text-tierra-light text-sm leading-relaxed line-clamp-3">{curso.descripcion}</p>
        )}
        {curso.fechas && curso.fechas.length > 0 && (
          <p className="text-tierra-light text-xs mt-2">{curso.fechas[0]}</p>
        )}
      </div>
      <div className="mt-6 pt-6 border-t border-beige-lino flex items-center justify-between">
        {curso.precio > 0 ? (
          <p className="text-2xl font-light text-tierra">
            ${curso.precio.toLocaleString('es-MX')} <span className="text-sm text-tierra-light">MXN</span>
          </p>
        ) : (
          <p className="text-tierra-light text-sm">Consultar precio</p>
        )}
        <span className="btn-secondary text-xs pointer-events-none">Ver más</span>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Verificar build**

```bash
cd /Users/mariferubieto/Desktop/wellness-platform/frontend-marifer
npm run build 2>&1 | tail -10
```

Expected: Build exitoso.

- [ ] **Step 4: Commit**

```bash
git add frontend-marifer/components/ayurveda/DiplomadoCard.tsx \
        frontend-marifer/components/ayurveda/CursoCard.tsx
git commit -m "feat: DiplomadoCard con onClick, CursoCard nuevo componente"
```

---

## Task 5: ModalDetalleCurso

**Files:**
- Create: `frontend-marifer/components/ayurveda/ModalDetalleCurso.tsx`

- [ ] **Step 1: Crear el modal**

Crear `frontend-marifer/components/ayurveda/ModalDetalleCurso.tsx`:

```tsx
'use client';

import Link from 'next/link';

interface Diplomado {
  id: string;
  nombre: string;
  descripcion?: string;
  temario?: string[];
  calendario?: string[];
  precio: number;
  generacion: string;
}

interface Curso {
  id: string;
  nombre: string;
  descripcion?: string;
  temario?: string[];
  fechas?: string[];
  precio: number;
  foto_url?: string;
  tipo_acceso: 'pago' | 'whatsapp' | 'gratis';
}

type ModalItem =
  | { kind: 'diplomado'; data: Diplomado }
  | { kind: 'curso'; data: Curso };

interface Props {
  item: ModalItem;
  onClose: () => void;
}

export default function ModalDetalleCurso({ item, onClose }: Props) {
  const { kind, data } = item;

  return (
    <div
      className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-wellness max-w-lg w-full max-h-[90vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        {/* Imagen header para cursos con foto */}
        {kind === 'curso' && data.foto_url && (
          <img
            src={data.foto_url}
            alt={data.nombre}
            className="w-full h-48 object-cover rounded-t-wellness"
          />
        )}

        <div className="p-8">
          {/* Botón cerrar */}
          <div className="flex items-start justify-between mb-6">
            <div>
              <p className="label-wellness mb-1">
                {kind === 'diplomado' ? data.generacion : (
                  kind === 'curso' ? (
                    data.tipo_acceso === 'gratis' ? 'Registro abierto' : 'Curso'
                  ) : ''
                )}
              </p>
              <h2 className="text-2xl text-tierra">{data.nombre}</h2>
            </div>
            <button
              onClick={onClose}
              className="text-tierra-light hover:text-tierra transition-colors ml-4 text-lg"
              aria-label="Cerrar"
            >
              ✕
            </button>
          </div>

          {/* Descripción */}
          {data.descripcion && (
            <p className="text-tierra-mid text-sm leading-relaxed mb-6">{data.descripcion}</p>
          )}

          {/* Temario */}
          {data.temario && data.temario.length > 0 && (
            <div className="mb-6">
              <div className="w-6 h-px bg-sand mb-3" />
              <p className="label-wellness mb-2">Temario</p>
              <ul className="space-y-1">
                {data.temario.map((item, i) => (
                  <li key={i} className="text-tierra-light text-sm flex gap-2">
                    <span className="text-sand mt-0.5">·</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Fechas: diplomado usa calendario, curso usa fechas */}
          {kind === 'diplomado' && data.calendario && data.calendario.length > 0 && (
            <div className="mb-6">
              <div className="w-6 h-px bg-sand mb-3" />
              <p className="label-wellness mb-2">Calendario</p>
              <ul className="space-y-1">
                {data.calendario.map((f, i) => (
                  <li key={i} className="text-tierra-light text-sm flex gap-2">
                    <span className="text-sand mt-0.5">·</span>
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
          {kind === 'curso' && data.fechas && data.fechas.length > 0 && (
            <div className="mb-6">
              <div className="w-6 h-px bg-sand mb-3" />
              <p className="label-wellness mb-2">Fechas</p>
              <ul className="space-y-1">
                {data.fechas.map((f, i) => (
                  <li key={i} className="text-tierra-light text-sm flex gap-2">
                    <span className="text-sand mt-0.5">·</span>
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Precio */}
          {data.precio > 0 && (
            <p className="text-3xl font-light text-tierra mb-8">
              ${data.precio.toLocaleString('es-MX')}
              <span className="text-sm text-tierra-light ml-1">MXN</span>
            </p>
          )}

          {/* Acción */}
          {kind === 'diplomado' && (
            <Link
              href={`/ayurveda/inscripcion?diplomado_id=${data.id}`}
              className="btn-primary w-full text-center block"
            >
              Inscribirme
            </Link>
          )}

          {kind === 'curso' && data.tipo_acceso === 'pago' && (
            <Link
              href={`/ayurveda/inscripcion?curso_id=${data.id}&nombre=${encodeURIComponent(data.nombre)}&precio=${data.precio}`}
              className="btn-primary w-full text-center block"
            >
              Inscribirme
            </Link>
          )}

          {kind === 'curso' && data.tipo_acceso === 'whatsapp' && (
            <a
              href={`https://wa.me/52${process.env.NEXT_PUBLIC_WHATSAPP_MARIFER ?? ''}?text=${encodeURIComponent(`Hola, me interesa el curso: ${data.nombre}`)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-primary w-full text-center block"
            >
              Contactar por WhatsApp
            </a>
          )}

          {kind === 'curso' && data.tipo_acceso === 'gratis' && (
            <Link
              href={`/ayurveda/inscripcion?curso_id=${data.id}&nombre=${encodeURIComponent(data.nombre)}&modo=leads`}
              className="btn-primary w-full text-center block"
            >
              Inscribirme
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verificar build**

```bash
cd /Users/mariferubieto/Desktop/wellness-platform/frontend-marifer
npm run build 2>&1 | tail -10
```

Expected: Build exitoso.

- [ ] **Step 3: Commit**

```bash
git add frontend-marifer/components/ayurveda/ModalDetalleCurso.tsx
git commit -m "feat: ModalDetalleCurso con lógica de tipo_acceso"
```

---

## Task 6: Reescribir /ayurveda/page.tsx

**Files:**
- Modify: `frontend-marifer/app/ayurveda/page.tsx`

- [ ] **Step 1: Reescribir la página**

Leer el archivo actual para confirmar su estructura. Reemplazar todo el contenido con:

```tsx
'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import DiplomadoCard from '@/components/ayurveda/DiplomadoCard';
import CursoCard from '@/components/ayurveda/CursoCard';
import ModalDetalleCurso from '@/components/ayurveda/ModalDetalleCurso';

interface Diplomado {
  id: string;
  nombre: string;
  descripcion?: string;
  temario?: string[];
  calendario?: string[];
  precio: number;
  generacion: string;
}

interface Curso {
  id: string;
  tipo: 'cocina' | 'pranayamas' | 'extras';
  nombre: string;
  descripcion?: string;
  temario?: string[];
  fechas?: string[];
  precio: number;
  foto_url?: string;
  cupo_maximo?: number;
  tipo_acceso: 'pago' | 'whatsapp' | 'gratis';
}

type ModalItem =
  | { kind: 'diplomado'; data: Diplomado }
  | { kind: 'curso'; data: Curso };

type TabId = 'diplomados' | 'cocina' | 'pranayamas' | 'extras';

const TABS: { id: TabId; label: string }[] = [
  { id: 'diplomados', label: 'Diplomados' },
  { id: 'cocina', label: 'Cocina' },
  { id: 'pranayamas', label: 'Pranayamas' },
  { id: 'extras', label: 'Cursos Especiales' },
];

export default function AyurvedaPage() {
  const [activeTab, setActiveTab] = useState<TabId>('diplomados');
  const [diplomados, setDiplomados] = useState<Diplomado[]>([]);
  const [cursosCocina, setCursosCocina] = useState<Curso[]>([]);
  const [cursosPranayamas, setCursosPranayamas] = useState<Curso[]>([]);
  const [cursosExtras, setCursosExtras] = useState<Curso[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<ModalItem | null>(null);

  useEffect(() => {
    Promise.all([
      api.get<Diplomado[]>('/api/ayurveda/diplomados').catch(() => [] as Diplomado[]),
      api.get<Curso[]>('/api/ayurveda/cursos/cocina').catch(() => [] as Curso[]),
      api.get<Curso[]>('/api/ayurveda/cursos/pranayamas').catch(() => [] as Curso[]),
      api.get<Curso[]>('/api/ayurveda/cursos/extras').catch(() => [] as Curso[]),
    ]).then(([d, cocina, pranayamas, extras]) => {
      setDiplomados(d);
      setCursosCocina(cocina);
      setCursosPranayamas(pranayamas);
      setCursosExtras(extras);
    }).finally(() => setLoading(false));
  }, []);

  const cursosByTab: Record<TabId, Curso[]> = {
    diplomados: [],
    cocina: cursosCocina,
    pranayamas: cursosPranayamas,
    extras: cursosExtras,
  };

  return (
    <div className="min-h-screen">
      {/* Encabezado */}
      <section className="px-4 pt-20 pb-12 text-center">
        <div className="max-w-2xl mx-auto">
          <div className="w-16 h-px bg-sand mx-auto mb-8" />
          <h1
            className="text-5xl text-tierra mb-4"
            style={{ fontFamily: 'var(--font-josefin)', fontWeight: 300, letterSpacing: '0.12em' }}
          >
            MANALI AYURVEDA
          </h1>
          <p className="text-tierra-light max-w-lg mx-auto leading-relaxed">
            Formación y experiencias en la ciencia de la vida.
          </p>
        </div>
      </section>

      {/* Tabs */}
      <div className="max-w-5xl mx-auto px-4">
        <div className="flex gap-0 border-b border-beige-lino mb-10 overflow-x-auto">
          {TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-6 py-3 text-xs tracking-widest uppercase whitespace-nowrap transition-colors -mb-px border-b-2 ${
                activeTab === tab.id
                  ? 'border-tierra text-tierra font-medium'
                  : 'border-transparent text-tierra-light hover:text-tierra'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Grid */}
      <div className="max-w-5xl mx-auto px-4 pb-24">
        {loading ? (
          <p className="text-center text-tierra-light text-sm tracking-widest uppercase py-20">
            Cargando...
          </p>
        ) : activeTab === 'diplomados' ? (
          diplomados.length === 0 ? (
            <p className="text-center text-tierra-light text-sm py-20">
              Próximamente nuevas generaciones.
            </p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {diplomados.map(d => (
                <DiplomadoCard
                  key={d.id}
                  diplomado={d}
                  onClick={() => setSelected({ kind: 'diplomado', data: d })}
                />
              ))}
            </div>
          )
        ) : (
          cursosByTab[activeTab].length === 0 ? (
            <p className="text-center text-tierra-light text-sm py-20">
              Próximamente nuevos cursos.
            </p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {cursosByTab[activeTab].map(c => (
                <CursoCard
                  key={c.id}
                  curso={c}
                  onClick={() => setSelected({ kind: 'curso', data: c })}
                />
              ))}
            </div>
          )
        )}
      </div>

      {/* Modal */}
      {selected && (
        <ModalDetalleCurso
          item={selected}
          onClose={() => setSelected(null)}
        />
      )}
    </div>
  );
}
```

- [ ] **Step 2: Verificar build**

```bash
cd /Users/mariferubieto/Desktop/wellness-platform/frontend-marifer
npm run build 2>&1 | tail -10
```

Expected: Build exitoso, ruta `/ayurveda` compila sin errores TypeScript.

- [ ] **Step 3: Commit**

```bash
git add frontend-marifer/app/ayurveda/page.tsx
git commit -m "feat: /ayurveda con tabs y modal de detalle"
```

---

## Task 7: Actualizar /ayurveda/inscripcion para cursos

**Files:**
- Modify: `frontend-marifer/app/ayurveda/inscripcion/page.tsx`
- Modify: `frontend-marifer/lib/pagos.ts`

- [ ] **Step 1: Actualizar tipo en pagos.ts**

Leer `frontend-marifer/lib/pagos.ts`. Cambiar el tipo `concepto`:

```typescript
interface IniciarPagoParams {
  concepto: 'paquete_shala' | 'diplomado' | 'retiro' | 'evento' | 'curso_ayurveda';
  concepto_id: string;
  monto: number;
  titulo: string;
}
```

- [ ] **Step 2: Reescribir la página de inscripción**

Leer `frontend-marifer/app/ayurveda/inscripcion/page.tsx` completo. Reemplazar con:

```tsx
'use client';

import { useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { iniciarPago } from '@/lib/pagos';
import Input from '@/components/ui/Input';
import Button from '@/components/ui/Button';

function InscripcionForm() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const diplomadoId = searchParams.get('diplomado_id') ?? '';
  const cursoId = searchParams.get('curso_id') ?? '';
  const cursoNombre = searchParams.get('nombre') ?? 'Curso';
  const cursoPrecio = parseFloat(searchParams.get('precio') ?? '0');
  const modo = searchParams.get('modo') ?? '';

  const [enviando, setEnviando] = useState(false);
  const [exito, setExito] = useState(false);
  const [error, setError] = useState('');

  // Diplomado flow — keeps existing fields
  const [formDiplomado, setFormDiplomado] = useState({
    nombre_completo: '',
    fecha_nacimiento: '',
    whatsapp: '',
    email_gmail: '',
    razon: '',
  });

  // Curso flow — simplified fields
  const [formCurso, setFormCurso] = useState({
    nombre_completo: '',
    whatsapp: '',
    email_gmail: '',
  });

  // Redirect to /ayurveda if no item specified
  if (!diplomadoId && !cursoId) {
    router.push('/ayurveda');
    return null;
  }

  async function handleSubmitDiplomado(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setEnviando(true);
    try {
      await api.post('/api/ayurveda/inscripciones', {
        diplomado_id: diplomadoId,
        ...formDiplomado,
      });
      setExito(true);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error al enviar inscripción');
    } finally {
      setEnviando(false);
    }
  }

  async function handleSubmitCurso(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setEnviando(true);
    try {
      await api.post('/api/ayurveda/cursos-inscripciones', {
        curso_id: cursoId,
        nombre_completo: formCurso.nombre_completo,
        whatsapp: formCurso.whatsapp,
        email: formCurso.email_gmail,
      });
      if (modo === 'leads') {
        setExito(true);
      } else {
        await iniciarPago({
          concepto: 'curso_ayurveda',
          concepto_id: cursoId,
          monto: cursoPrecio,
          titulo: cursoNombre,
        });
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error al procesar la inscripción');
      setEnviando(false);
    }
  }

  if (exito) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="max-w-md w-full text-center">
          <div className="w-12 h-px bg-sand mx-auto mb-8" />
          <h1 className="text-3xl text-tierra mb-4">Inscripción recibida</h1>
          <p className="text-tierra-light text-sm leading-relaxed mb-8">
            Gracias por inscribirte. Nos pondremos en contacto por WhatsApp para confirmar tu lugar.
          </p>
          <button onClick={() => router.push('/ayurveda')} className="btn-secondary">
            Volver a Ayurveda
          </button>
        </div>
      </div>
    );
  }

  // ── Diplomado form (existing logic) ──
  if (diplomadoId) {
    return (
      <div className="min-h-screen px-4 py-16">
        <div className="max-w-lg mx-auto">
          <button
            onClick={() => router.push('/ayurveda')}
            className="text-tierra-light text-xs tracking-widest uppercase mb-10 hover:text-tierra transition-colors"
          >
            ← Regresar
          </button>
          <div className="w-8 h-px bg-sand mb-6" />
          <h1 className="text-3xl text-tierra mb-2">Formulario de inscripción</h1>
          <p className="text-tierra-light text-sm mb-10">Diplomado Manali Ayurveda</p>
          <form onSubmit={handleSubmitDiplomado} className="space-y-5">
            <Input label="Nombre completo" name="nombre_completo"
              value={formDiplomado.nombre_completo}
              onChange={e => setFormDiplomado(f => ({ ...f, nombre_completo: e.target.value }))} required />
            <Input label="Fecha de nacimiento" name="fecha_nacimiento" type="date"
              value={formDiplomado.fecha_nacimiento}
              onChange={e => setFormDiplomado(f => ({ ...f, fecha_nacimiento: e.target.value }))} />
            <Input label="WhatsApp" name="whatsapp" type="tel"
              value={formDiplomado.whatsapp}
              onChange={e => setFormDiplomado(f => ({ ...f, whatsapp: e.target.value }))}
              placeholder="10 dígitos" required />
            <Input label="Email Gmail" name="email_gmail" type="email"
              value={formDiplomado.email_gmail}
              onChange={e => setFormDiplomado(f => ({ ...f, email_gmail: e.target.value }))}
              placeholder="nombre@gmail.com" required />
            <div>
              <label className="label-wellness block mb-2">¿Por qué quieres estudiar Ayurveda?</label>
              <textarea
                name="razon"
                value={formDiplomado.razon}
                onChange={e => setFormDiplomado(f => ({ ...f, razon: e.target.value }))}
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

  // ── Curso form ──
  return (
    <div className="min-h-screen px-4 py-16">
      <div className="max-w-lg mx-auto">
        <button
          onClick={() => router.push('/ayurveda')}
          className="text-tierra-light text-xs tracking-widest uppercase mb-10 hover:text-tierra transition-colors"
        >
          ← Regresar
        </button>
        <div className="w-8 h-px bg-sand mb-6" />
        <h1 className="text-3xl text-tierra mb-2">Inscripción</h1>
        <p className="text-tierra-light text-sm mb-10">{cursoNombre}</p>
        <form onSubmit={handleSubmitCurso} className="space-y-5">
          <Input label="Nombre completo" name="nombre_completo"
            value={formCurso.nombre_completo}
            onChange={e => setFormCurso(f => ({ ...f, nombre_completo: e.target.value }))} required />
          <Input label="WhatsApp" name="whatsapp" type="tel"
            value={formCurso.whatsapp}
            onChange={e => setFormCurso(f => ({ ...f, whatsapp: e.target.value }))}
            placeholder="10 dígitos" required />
          <Input label="Email" name="email_gmail" type="email"
            value={formCurso.email_gmail}
            onChange={e => setFormCurso(f => ({ ...f, email_gmail: e.target.value }))} required />
          {error && <p className="text-red-400 text-xs">{error}</p>}
          <Button type="submit" loading={enviando} className="w-full">
            Inscribirme
          </Button>
          <p className="text-tierra-light text-xs text-center">
            {modo === 'leads'
              ? 'Nos pondremos en contacto por WhatsApp para confirmar tu lugar.'
              : 'Al continuar serás redirigido a MercadoPago para completar el pago.'}
          </p>
        </form>
      </div>
    </div>
  );
}

export default function InscripcionPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-tierra-light text-sm tracking-widest uppercase">Cargando...</p>
      </div>
    }>
      <InscripcionForm />
    </Suspense>
  );
}
```

- [ ] **Step 3: Verificar build final completo**

```bash
cd /Users/mariferubieto/Desktop/wellness-platform/frontend-marifer
npm run build 2>&1 | tail -15
```

Expected: Build exitoso, todas las rutas compilan.

- [ ] **Step 4: Correr tests del backend**

```bash
cd /Users/mariferubieto/Desktop/wellness-platform/backend
npx jest --no-coverage 2>&1 | tail -8
```

Expected: ~94 passing, 2 pre-existing failures.

- [ ] **Step 5: Commit**

```bash
git add frontend-marifer/app/ayurveda/inscripcion/page.tsx \
        frontend-marifer/lib/pagos.ts
git commit -m "feat: inscripción cursos ayurveda — pago MP y modo leads"
```

---

## Deploy

Tras completar todos los tasks, hacer push para que Vercel auto-despliegue:

```bash
git push origin main
```

Verificar en Vercel que el build pasa y `/ayurveda` muestra las 4 tabs correctamente.

**Recordatorio:** La migración SQL `010_cursos_ayurveda_update.sql` debe ejecutarse manualmente en Supabase antes de que el frontend funcione en producción.
