# Shala App Enhancements Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Añadir tipos de espacio (Salón/Jardín) a las clases, un planificador mensual con plantilla semanal y copy-paste para el admin, y una UX de reservas mejorada para el usuario (vista semanal con detalle de día + historial de reservas).

**Architecture:** El backend recibe un nuevo campo `espacio_tipo` en todas las operaciones de clases y un endpoint POST /batch para creación masiva. El frontend-shala añade una página de planificador en admin, reescribe el calendario de usuario a vista semanal y añade la página Mis Reservas. No hay cambios de infraestructura ni en el backend de reservas (ya soporta cancelación con regla de 2 horas).

**Tech Stack:** Next.js 14 App Router, Express + Supabase, Tailwind CSS wellness tokens, TypeScript.

---

## File Map

| Archivo | Acción | Responsabilidad |
|---|---|---|
| `database/migrations/009_clases_espacio.sql` | Crear | ADD COLUMN espacio_tipo a clases |
| `backend/src/services/clases.service.ts` | Modificar | espacio_tipo en CreateClaseInput, createClase, updateClase, getClases + nueva fn createClasesBatch |
| `backend/src/routes/shala/clases.ts` | Modificar | POST /batch endpoint |
| `backend/tests/clases-batch.test.ts` | Crear | Tests del batch endpoint |
| `frontend-shala/app/admin/shala/planificador/page.tsx` | Crear | Planificador mensual completo |
| `frontend-shala/app/admin/layout.tsx` | Modificar | Añadir link "PLANIFICADOR" al sidebar |
| `frontend-shala/app/shala/calendario/page.tsx` | Modificar | Vista semanal con detalle por día + espacio_tipo |
| `frontend-shala/components/shala/ClaseCard.tsx` | Modificar | Mostrar espacio_tipo |
| `frontend-shala/app/mis-reservas/page.tsx` | Crear | Historial de reservas (Próximas + Historial) |
| `frontend-shala/components/ui/Navbar.tsx` | Modificar | Añadir "Mis Reservas" a NAV_ITEMS |

---

## Task 1: Migración DB + Service Update (espacio_tipo)

**Files:**
- Create: `database/migrations/009_clases_espacio.sql`
- Modify: `backend/src/services/clases.service.ts`

- [ ] **Step 1: Crear migración SQL**

Crear el archivo `database/migrations/009_clases_espacio.sql` con:

```sql
-- 009: add espacio_tipo to clases
ALTER TABLE clases
  ADD COLUMN IF NOT EXISTS espacio_tipo text
    CHECK (espacio_tipo IN ('salon', 'jardin'))
    DEFAULT 'salon';
```

- [ ] **Step 2: Ejecutar migración en Supabase**

En el SQL Editor de Supabase (https://supabase.com/dashboard/project/rsahtjffquqveshjalky/sql/new), pegar y ejecutar el contenido de `009_clases_espacio.sql`.

Verificar: `SELECT column_name FROM information_schema.columns WHERE table_name = 'clases' AND column_name = 'espacio_tipo';` debe retornar una fila.

- [ ] **Step 3: Actualizar `backend/src/services/clases.service.ts`**

Reemplazar el contenido completo del archivo con:

```typescript
import { supabaseAdmin } from '../config/supabase';

export interface CreateClaseInput {
  maestro_id?: string;
  nombre: string;
  descripcion?: string;
  inicio: string;
  fin: string;
  capacidad: number;
  espacio_tipo?: 'salon' | 'jardin';
  tipo?: 'regular' | 'especial';
  precio_especial?: number;
}

export async function getClases(tipo?: string, desde?: string, hasta?: string) {
  const ahora = desde ?? new Date().toISOString();
  let query = supabaseAdmin
    .from('clases')
    .select('id, nombre, descripcion, inicio, fin, capacidad, cupo_actual, tipo, precio_especial, activo, espacio_tipo, maestros(id, users(nombre))')
    .eq('activo', true)
    .gte('inicio', ahora)
    .order('inicio');

  if (tipo) {
    query = query.eq('tipo', tipo);
  }
  if (hasta) {
    query = query.lte('inicio', hasta);
  }

  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function createClase(input: CreateClaseInput) {
  const { data, error } = await supabaseAdmin
    .from('clases')
    .insert({
      maestro_id: input.maestro_id ?? null,
      nombre: input.nombre,
      descripcion: input.descripcion ?? null,
      inicio: input.inicio,
      fin: input.fin,
      capacidad: input.capacidad,
      espacio_tipo: input.espacio_tipo ?? 'salon',
      tipo: input.tipo ?? 'regular',
      precio_especial: input.precio_especial ?? null,
    })
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data;
}

export async function createClasesBatch(inputs: CreateClaseInput[]) {
  const rows = inputs.map(input => ({
    maestro_id: input.maestro_id ?? null,
    nombre: input.nombre,
    descripcion: input.descripcion ?? null,
    inicio: input.inicio,
    fin: input.fin,
    capacidad: input.capacidad,
    espacio_tipo: input.espacio_tipo ?? 'salon',
    tipo: input.tipo ?? 'regular',
    precio_especial: input.precio_especial ?? null,
  }));

  const { data, error } = await supabaseAdmin
    .from('clases')
    .insert(rows)
    .select();

  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function updateClase(id: string, updates: Partial<CreateClaseInput & { activo: boolean }>) {
  const ALLOWED = ['maestro_id', 'nombre', 'descripcion', 'inicio', 'fin', 'capacidad', 'espacio_tipo', 'tipo', 'precio_especial', 'activo'];
  const filtered = Object.fromEntries(
    Object.entries(updates).filter(([k]) => ALLOWED.includes(k))
  );

  const { data, error } = await supabaseAdmin
    .from('clases')
    .update(filtered)
    .eq('id', id)
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data;
}

export async function deleteClase(id: string) {
  const { error } = await supabaseAdmin
    .from('clases')
    .update({ activo: false })
    .eq('id', id);

  if (error) throw new Error(error.message);
}
```

- [ ] **Step 4: Actualizar `getMisReservas` en `backend/src/services/reservas.service.ts`**

En la función `getMisReservas`, actualizar el select para incluir `espacio_tipo`:

```typescript
export async function getMisReservas(userId: string) {
  const { data, error } = await supabaseAdmin
    .from('reservas')
    .select('id, estado, credito_devuelto, created_at, clases(id, nombre, inicio, fin, tipo, espacio_tipo)')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) throw new Error(error.message);
  return data ?? [];
}
```

- [ ] **Step 5: Commit**

```bash
cd /Users/mariferubieto/Desktop/wellness-platform
git add database/migrations/009_clases_espacio.sql backend/src/services/clases.service.ts backend/src/services/reservas.service.ts
git commit -m "feat: add espacio_tipo to clases (salon/jardin) + batch service fn + getMisReservas update"
```

---

## Task 2: Backend — Ruta POST /batch + Tests

**Files:**
- Modify: `backend/src/routes/shala/clases.ts`
- Create: `backend/tests/clases-batch.test.ts`

- [ ] **Step 1: Escribir el test que debe fallar**

Crear `backend/tests/clases-batch.test.ts`:

```typescript
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

describe('POST /api/shala/clases/batch', () => {
  it('creates multiple classes and returns count', async () => {
    mockAdminAuth();

    const clases = [
      { nombre: 'Hatha Yoga', inicio: '2026-05-05T07:00:00', fin: '2026-05-05T08:00:00', capacidad: 10, espacio_tipo: 'salon' },
      { nombre: 'Vinyasa', inicio: '2026-05-07T09:00:00', fin: '2026-05-07T10:00:00', capacidad: 70, espacio_tipo: 'jardin' },
    ];

    mockFrom.mockReturnValueOnce({
      insert: jest.fn().mockReturnThis(),
      select: jest.fn().mockResolvedValueOnce({
        data: [
          { id: 'c1', ...clases[0] },
          { id: 'c2', ...clases[1] },
        ],
        error: null,
      }),
    });

    const res = await request(app)
      .post('/api/shala/clases/batch')
      .set('Authorization', 'Bearer admin-token')
      .send({ clases });

    expect(res.status).toBe(201);
    expect(res.body.created).toBe(2);
    expect(res.body.clases).toHaveLength(2);
  });

  it('returns 400 if clases array is missing', async () => {
    mockAdminAuth();

    const res = await request(app)
      .post('/api/shala/clases/batch')
      .set('Authorization', 'Bearer admin-token')
      .send({});

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/clases/);
  });

  it('returns 400 if clases array is empty', async () => {
    mockAdminAuth();

    const res = await request(app)
      .post('/api/shala/clases/batch')
      .set('Authorization', 'Bearer admin-token')
      .send({ clases: [] });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/clases/);
  });

  it('returns 401 if not authenticated', async () => {
    mockGetUser.mockResolvedValueOnce({ data: { user: null }, error: { message: 'Not authenticated' } });

    const res = await request(app)
      .post('/api/shala/clases/batch')
      .send({ clases: [{ nombre: 'X', inicio: 'a', fin: 'b', capacidad: 10 }] });

    expect(res.status).toBe(401);
  });
});
```

- [ ] **Step 2: Correr el test y verificar que falla**

```bash
cd /Users/mariferubieto/Desktop/wellness-platform/backend
npx jest tests/clases-batch.test.ts --no-coverage 2>&1 | tail -20
```

Expected: FAIL — "Cannot POST /api/shala/clases/batch" or similar.

- [ ] **Step 3: Actualizar `backend/src/routes/shala/clases.ts`**

Reemplazar el contenido completo con:

```typescript
import { Router, Response, Request } from 'express';
import { requireAuth } from '../../middleware/auth';
import { requireRole } from '../../middleware/requireRole';
import { getClases, createClase, createClasesBatch, updateClase, deleteClase } from '../../services/clases.service';
import type { AuthenticatedRequest } from '../../middleware/auth';

const router = Router();

router.get('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const tipo = req.query.tipo as string | undefined;
    const desde = req.query.desde as string | undefined;
    const hasta = req.query.hasta as string | undefined;
    const clases = await getClases(tipo, desde, hasta);
    res.json(clases);
  } catch (err: unknown) {
    res.status(500).json({ error: err instanceof Error ? err.message : 'Error' });
  }
});

router.post('/batch', requireAuth, requireRole('admin'), async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { clases } = req.body;
    if (!Array.isArray(clases) || clases.length === 0) {
      res.status(400).json({ error: 'clases debe ser un array no vacío' });
      return;
    }
    const created = await createClasesBatch(clases);
    res.status(201).json({ created: created.length, clases: created });
  } catch (err: unknown) {
    res.status(400).json({ error: err instanceof Error ? err.message : 'Error' });
  }
});

router.post('/', requireAuth, requireRole('admin'), async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { nombre, inicio, fin, capacidad } = req.body;
    if (!nombre || !inicio || !fin || !capacidad) {
      res.status(400).json({ error: 'nombre, inicio, fin y capacidad son requeridos' });
      return;
    }
    const clase = await createClase(req.body);
    res.status(201).json(clase);
  } catch (err: unknown) {
    res.status(400).json({ error: err instanceof Error ? err.message : 'Error' });
  }
});

router.patch('/:id', requireAuth, requireRole('admin'), async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const clase = await updateClase(req.params.id, req.body);
    res.json(clase);
  } catch (err: unknown) {
    res.status(400).json({ error: err instanceof Error ? err.message : 'Error' });
  }
});

router.delete('/:id', requireAuth, requireRole('admin'), async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    await deleteClase(req.params.id);
    res.status(204).send();
  } catch (err: unknown) {
    res.status(400).json({ error: err instanceof Error ? err.message : 'Error' });
  }
});

export default router;
```

- [ ] **Step 4: Correr tests y verificar que pasan**

```bash
cd /Users/mariferubieto/Desktop/wellness-platform/backend
npx jest tests/clases-batch.test.ts --no-coverage 2>&1 | tail -20
```

Expected: PASS — 4 tests passed.

- [ ] **Step 5: Correr todos los tests del backend**

```bash
cd /Users/mariferubieto/Desktop/wellness-platform/backend
npx jest --no-coverage 2>&1 | tail -10
```

Expected: todos los tests existentes siguen pasando.

- [ ] **Step 6: Commit**

```bash
cd /Users/mariferubieto/Desktop/wellness-platform
git add backend/src/routes/shala/clases.ts backend/tests/clases-batch.test.ts
git commit -m "feat: add POST /api/shala/clases/batch endpoint with tests"
```

---

## Task 3: Admin — Planificador Mensual

**Files:**
- Create: `frontend-shala/app/admin/shala/planificador/page.tsx`
- Modify: `frontend-shala/app/admin/layout.tsx`

- [ ] **Step 1: Crear la página del planificador**

Crear `frontend-shala/app/admin/shala/planificador/page.tsx`:

```typescript
'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import Button from '@/components/ui/Button';

interface Maestro { id: string; nombre: string; }
interface Estilo { id: string; nombre: string; }

interface ClasePlantilla {
  hora_inicio: string; // "HH:MM"
  hora_fin: string;    // "HH:MM"
  nombre: string;
  espacio_tipo: 'salon' | 'jardin';
  capacidad: number;
  maestro_id?: string;
  tipo: 'regular' | 'especial';
}

interface ClaseBorrador extends ClasePlantilla {
  fecha: string; // "YYYY-MM-DD"
  _key: string;  // unique key for React rendering
}

// 0=Lun, 1=Mar, ..., 6=Dom (Monday-first)
type SemanaBase = Record<number, ClasePlantilla[]>;

const DIAS_SEMANA = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
const HORAS = Array.from({ length: 24 }, (_, i) => {
  const h = i.toString().padStart(2, '0');
  return [`${h}:00`, `${h}:30`];
}).flat();

const DEFAULT_PLANTILLA: ClasePlantilla = {
  hora_inicio: '07:00',
  hora_fin: '08:00',
  nombre: '',
  espacio_tipo: 'salon',
  capacidad: 10,
  tipo: 'regular',
};

function getDiasDelMes(year: number, month: number): string[] {
  const dias: string[] = [];
  const d = new Date(year, month, 1);
  while (d.getMonth() === month) {
    dias.push(d.toISOString().slice(0, 10));
    d.setDate(d.getDate() + 1);
  }
  return dias;
}

// Returns Monday-first week grids: string[][] where each inner array is Mon-Sun
function getCalendarioGrid(year: number, month: number): (string | null)[][] {
  const dias: (string | null)[] = [];
  const primer = new Date(year, month, 1);
  // Monday-first offset (0=Mon...6=Sun)
  const offset = (primer.getDay() + 6) % 7;
  for (let i = 0; i < offset; i++) dias.push(null);
  const ultimo = new Date(year, month + 1, 0).getDate();
  for (let d = 1; d <= ultimo; d++) {
    dias.push(`${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`);
  }
  while (dias.length % 7 !== 0) dias.push(null);
  const semanas: (string | null)[][] = [];
  for (let i = 0; i < dias.length; i += 7) semanas.push(dias.slice(i, i + 7));
  return semanas;
}

function diaToWeekday(fecha: string): number {
  // Returns 0=Lun ... 6=Dom
  const d = new Date(fecha + 'T12:00:00');
  return (d.getDay() + 6) % 7;
}

function uniqueKey() {
  return Math.random().toString(36).slice(2);
}

export default function PlanificadorPage() {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth());
  const [semanaBase, setSemanaBase] = useState<SemanaBase>({ 0: [], 1: [], 2: [], 3: [], 4: [], 5: [], 6: [] });
  const [borradores, setBorradores] = useState<ClaseBorrador[]>([]);
  const [copiando, setCopiando] = useState<ClasePlantilla | null>(null);
  const [editando, setEditando] = useState<{ borrador: ClaseBorrador; index: number } | null>(null);
  const [maestros, setMaestros] = useState<Maestro[]>([]);
  const [estilos, setEstilos] = useState<Estilo[]>([]);
  const [guardando, setGuardando] = useState(false);
  const [msg, setMsg] = useState('');

  useEffect(() => {
    Promise.all([
      api.get<Maestro[]>('/api/shala/maestros'),
      api.get<Estilo[]>('/api/shala/estilos'),
    ]).then(([m, e]) => { setMaestros(m); setEstilos(e); }).catch(() => {});
  }, []);

  function showMsg(m: string) { setMsg(m); setTimeout(() => setMsg(''), 4000); }

  function addPlantillaAlDia(dia: number) {
    setSemanaBase(prev => ({
      ...prev,
      [dia]: [...(prev[dia] ?? []), { ...DEFAULT_PLANTILLA }],
    }));
  }

  function updatePlantilla(dia: number, idx: number, field: keyof ClasePlantilla, value: string | number) {
    setSemanaBase(prev => {
      const updated = [...(prev[dia] ?? [])];
      updated[idx] = { ...updated[idx], [field]: value };
      if (field === 'espacio_tipo') {
        updated[idx].capacidad = value === 'salon' ? 10 : 70;
      }
      return { ...prev, [dia]: updated };
    });
  }

  function removePlantilla(dia: number, idx: number) {
    setSemanaBase(prev => ({
      ...prev,
      [dia]: prev[dia].filter((_, i) => i !== idx),
    }));
  }

  function aplicarAlMes() {
    const diasDelMes = getDiasDelMes(year, month);
    const nuevas: ClaseBorrador[] = [];
    for (const fecha of diasDelMes) {
      const diaSemana = diaToWeekday(fecha);
      const plantillas = semanaBase[diaSemana] ?? [];
      for (const p of plantillas) {
        nuevas.push({ ...p, fecha, _key: uniqueKey() });
      }
    }
    setBorradores(nuevas);
    showMsg(`${nuevas.length} clases generadas — revisa y guarda`);
  }

  function addClaseDia(fecha: string) {
    const diaSemana = diaToWeekday(fecha);
    const espacio: 'salon' | 'jardin' = 'salon';
    const nuevaBorrador: ClaseBorrador = {
      ...DEFAULT_PLANTILLA,
      espacio_tipo: espacio,
      capacidad: 10,
      fecha,
      _key: uniqueKey(),
    };
    const idx = borradores.length;
    setBorradores(prev => [...prev, nuevaBorrador]);
    setEditando({ borrador: nuevaBorrador, index: idx });
    void diaSemana;
  }

  function copiarClase(b: ClaseBorrador) {
    const { fecha: _f, _key: _k, ...plantilla } = b;
    setCopiando(plantilla);
    showMsg('Clase copiada — haz clic en "Pegar" en otro día');
  }

  function pegarEnDia(fecha: string) {
    if (!copiando) return;
    const nuevo: ClaseBorrador = { ...copiando, fecha, _key: uniqueKey() };
    const idx = borradores.length;
    setBorradores(prev => [...prev, nuevo]);
    setEditando({ borrador: nuevo, index: idx });
    setCopiando(null);
  }

  function eliminarBorrador(key: string) {
    setBorradores(prev => prev.filter(b => b._key !== key));
  }

  function guardarEdicion(updated: ClaseBorrador) {
    setBorradores(prev => prev.map(b => b._key === updated._key ? updated : b));
    setEditando(null);
  }

  async function guardarMes() {
    if (borradores.length === 0) { showMsg('No hay clases en el borrador'); return; }
    setGuardando(true);
    try {
      const payload = borradores.map(b => ({
        nombre: b.nombre,
        descripcion: undefined as string | undefined,
        inicio: `${b.fecha}T${b.hora_inicio}:00`,
        fin: `${b.fecha}T${b.hora_fin}:00`,
        capacidad: b.capacidad,
        espacio_tipo: b.espacio_tipo,
        maestro_id: b.maestro_id || undefined,
        tipo: b.tipo,
      }));
      const result = await api.post<{ created: number }>('/api/shala/clases/batch', { clases: payload });
      showMsg(`✓ ${result.created} clases guardadas exitosamente`);
      setBorradores([]);
    } catch (err: unknown) {
      showMsg(err instanceof Error ? err.message : 'Error al guardar');
    } finally {
      setGuardando(false);
    }
  }

  const MESES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
  const grid = getCalendarioGrid(year, month);
  const borradoresPorFecha: Record<string, ClaseBorrador[]> = {};
  for (const b of borradores) {
    if (!borradoresPorFecha[b.fecha]) borradoresPorFecha[b.fecha] = [];
    borradoresPorFecha[b.fecha].push(b);
  }

  return (
    <div>
      <div className="mb-6">
        <div className="w-8 h-px bg-sand mb-4" />
        <h1 className="text-3xl text-tierra">Planificador de Clases</h1>
      </div>

      {msg && (
        <div className="mb-4 p-3 bg-sage-muted border border-sage text-sage text-sm rounded-wellness">{msg}</div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-[320px_1fr] gap-8">

        {/* ── Panel Semana Tipo ── */}
        <div>
          <div className="card-wellness">
            <h2 className="text-sm tracking-widest uppercase text-tierra mb-4">Semana tipo</h2>
            <p className="text-tierra-light text-xs mb-4">Define las clases que se repiten cada semana. Luego aplica al mes.</p>

            {DIAS_SEMANA.map((dia, idx) => (
              <div key={idx} className="mb-4">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs tracking-widest uppercase text-tierra-light">{dia}</span>
                  <button
                    onClick={() => addPlantillaAlDia(idx)}
                    className="text-xs text-sage hover:text-tierra transition-colors"
                  >+ clase</button>
                </div>
                {(semanaBase[idx] ?? []).map((p, pidx) => (
                  <div key={pidx} className="bg-white border border-beige-lino rounded-wellness p-3 mb-2 space-y-2">
                    <div className="flex gap-2">
                      <select
                        value={p.hora_inicio}
                        onChange={e => updatePlantilla(idx, pidx, 'hora_inicio', e.target.value)}
                        className="input-wellness text-xs flex-1"
                      >
                        {HORAS.map(h => <option key={h} value={h}>{h}</option>)}
                      </select>
                      <span className="text-tierra-light text-xs self-center">–</span>
                      <select
                        value={p.hora_fin}
                        onChange={e => updatePlantilla(idx, pidx, 'hora_fin', e.target.value)}
                        className="input-wellness text-xs flex-1"
                      >
                        {HORAS.map(h => <option key={h} value={h}>{h}</option>)}
                      </select>
                    </div>
                    <input
                      list={`estilos-list-${idx}-${pidx}`}
                      value={p.nombre}
                      onChange={e => updatePlantilla(idx, pidx, 'nombre', e.target.value)}
                      className="input-wellness text-xs w-full"
                      placeholder="Nombre / estilo..."
                    />
                    <datalist id={`estilos-list-${idx}-${pidx}`}>
                      {estilos.map(e => <option key={e.id} value={e.nombre} />)}
                    </datalist>
                    <div className="flex gap-2">
                      <select
                        value={p.espacio_tipo}
                        onChange={e => updatePlantilla(idx, pidx, 'espacio_tipo', e.target.value)}
                        className="input-wellness text-xs flex-1"
                      >
                        <option value="salon">Salón (10)</option>
                        <option value="jardin">Jardín (70)</option>
                      </select>
                      <select
                        value={p.maestro_id ?? ''}
                        onChange={e => updatePlantilla(idx, pidx, 'maestro_id', e.target.value)}
                        className="input-wellness text-xs flex-1"
                      >
                        <option value="">— Maestra/o —</option>
                        {maestros.map(m => <option key={m.id} value={m.id}>{m.nombre}</option>)}
                      </select>
                    </div>
                    <button
                      onClick={() => removePlantilla(idx, pidx)}
                      className="text-tierra-light text-xs hover:text-red-400"
                    >✕ eliminar</button>
                  </div>
                ))}
                {(semanaBase[idx] ?? []).length === 0 && (
                  <p className="text-tierra-light/50 text-xs italic">Sin clases</p>
                )}
              </div>
            ))}

            <div className="mt-4 pt-4 border-t border-beige-lino">
              <Button onClick={aplicarAlMes} variant="secondary" className="w-full">
                Aplicar al mes →
              </Button>
            </div>
          </div>
        </div>

        {/* ── Calendario Mensual ── */}
        <div>
          {/* Navegación mes */}
          <div className="flex items-center justify-between mb-4">
            <button
              onClick={() => { if (month === 0) { setMonth(11); setYear(y => y - 1); } else setMonth(m => m - 1); }}
              className="text-tierra-light hover:text-tierra text-sm px-2"
            >← anterior</button>
            <h2 className="text-lg text-tierra">{MESES[month]} {year}</h2>
            <button
              onClick={() => { if (month === 11) { setMonth(0); setYear(y => y + 1); } else setMonth(m => m + 1); }}
              className="text-tierra-light hover:text-tierra text-sm px-2"
            >siguiente →</button>
          </div>

          {/* Header días de semana */}
          <div className="grid grid-cols-7 mb-2">
            {DIAS_SEMANA.map(d => (
              <div key={d} className="text-center text-xs tracking-widest uppercase text-tierra-light pb-1">{d}</div>
            ))}
          </div>

          {/* Grid */}
          <div className="space-y-1">
            {grid.map((semana, si) => (
              <div key={si} className="grid grid-cols-7 gap-1">
                {semana.map((fecha, di) => {
                  if (!fecha) return <div key={di} className="min-h-[80px]" />;
                  const clasesDelDia = borradoresPorFecha[fecha] ?? [];
                  const diaNum = parseInt(fecha.slice(8, 10));
                  const esModoCopiado = !!copiando;

                  return (
                    <div
                      key={fecha}
                      className={`min-h-[80px] bg-white border rounded-wellness p-1 ${esModoCopiado ? 'border-sage cursor-pointer hover:bg-sage-muted' : 'border-beige-lino'}`}
                      onClick={esModoCopiado ? () => pegarEnDia(fecha) : undefined}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs text-tierra-light">{diaNum}</span>
                        {!esModoCopiado && (
                          <button
                            onClick={() => addClaseDia(fecha)}
                            className="text-tierra-light/50 hover:text-sage text-xs leading-none"
                          >+</button>
                        )}
                        {esModoCopiado && (
                          <span className="text-sage text-xs">pegar</span>
                        )}
                      </div>
                      <div className="space-y-0.5">
                        {clasesDelDia.map(b => (
                          <div
                            key={b._key}
                            className={`rounded px-1 py-0.5 text-[10px] flex items-center justify-between gap-0.5 ${b.espacio_tipo === 'jardin' ? 'bg-sage-muted text-sage' : 'bg-sand/20 text-tierra-mid'}`}
                          >
                            <span className="truncate flex-1">{b.hora_inicio} {b.nombre || '—'}</span>
                            <button
                              onClick={() => {
                                const idx = borradores.findIndex(x => x._key === b._key);
                                setEditando({ borrador: b, index: idx });
                              }}
                              className="hover:opacity-70 shrink-0"
                              title="Editar"
                            >✎</button>
                            <button
                              onClick={() => copiarClase(b)}
                              className="hover:opacity-70 shrink-0"
                              title="Copiar"
                            >⧉</button>
                            <button
                              onClick={() => eliminarBorrador(b._key)}
                              className="hover:opacity-70 shrink-0"
                              title="Eliminar"
                            >✕</button>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            ))}
          </div>

          {/* Footer */}
          <div className="mt-6 flex items-center justify-between">
            <div className="flex gap-4 text-xs text-tierra-light">
              <span className="flex items-center gap-1">
                <span className="w-3 h-3 rounded bg-sand/30 inline-block" /> Salón (10p)
              </span>
              <span className="flex items-center gap-1">
                <span className="w-3 h-3 rounded bg-sage-muted inline-block" /> Jardín (70p)
              </span>
              {copiando && (
                <span className="text-sage">
                  Modo copia activo — haz clic en un día para pegar · <button onClick={() => setCopiando(null)} className="underline">cancelar</button>
                </span>
              )}
            </div>
            <Button onClick={guardarMes} loading={guardando} disabled={borradores.length === 0}>
              Guardar mes ({borradores.length} clases)
            </Button>
          </div>
        </div>
      </div>

      {/* ── Modal Editar Clase ── */}
      {editando && (
        <div className="fixed inset-0 bg-tierra/20 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-wellness shadow-lg p-6 w-full max-w-md space-y-4">
            <h3 className="text-tierra text-lg">Editar clase · {editando.borrador.fecha}</h3>

            <div>
              <label className="label-wellness">Nombre / Estilo</label>
              <input
                list="edit-estilos"
                value={editando.borrador.nombre}
                onChange={e => setEditando(prev => prev && ({ ...prev, borrador: { ...prev.borrador, nombre: e.target.value } }))}
                className="input-wellness w-full mt-1"
                placeholder="Hatha Yoga, Vinyasa..."
              />
              <datalist id="edit-estilos">
                {estilos.map(e => <option key={e.id} value={e.nombre} />)}
              </datalist>
            </div>

            <div className="flex gap-3">
              <div className="flex-1">
                <label className="label-wellness">Inicio</label>
                <select
                  value={editando.borrador.hora_inicio}
                  onChange={e => setEditando(prev => prev && ({ ...prev, borrador: { ...prev.borrador, hora_inicio: e.target.value } }))}
                  className="input-wellness w-full mt-1"
                >
                  {HORAS.map(h => <option key={h} value={h}>{h}</option>)}
                </select>
              </div>
              <div className="flex-1">
                <label className="label-wellness">Fin</label>
                <select
                  value={editando.borrador.hora_fin}
                  onChange={e => setEditando(prev => prev && ({ ...prev, borrador: { ...prev.borrador, hora_fin: e.target.value } }))}
                  className="input-wellness w-full mt-1"
                >
                  {HORAS.map(h => <option key={h} value={h}>{h}</option>)}
                </select>
              </div>
            </div>

            <div>
              <label className="label-wellness">Espacio</label>
              <select
                value={editando.borrador.espacio_tipo}
                onChange={e => {
                  const esp = e.target.value as 'salon' | 'jardin';
                  setEditando(prev => prev && ({
                    ...prev,
                    borrador: { ...prev.borrador, espacio_tipo: esp, capacidad: esp === 'salon' ? 10 : 70 },
                  }));
                }}
                className="input-wellness w-full mt-1"
              >
                <option value="salon">Salón (10 personas)</option>
                <option value="jardin">Jardín (70 personas)</option>
              </select>
            </div>

            <div>
              <label className="label-wellness">Capacidad (editable)</label>
              <input
                type="number"
                value={editando.borrador.capacidad}
                onChange={e => setEditando(prev => prev && ({ ...prev, borrador: { ...prev.borrador, capacidad: Number(e.target.value) } }))}
                className="input-wellness w-full mt-1"
              />
            </div>

            <div>
              <label className="label-wellness">Maestra/o</label>
              <select
                value={editando.borrador.maestro_id ?? ''}
                onChange={e => setEditando(prev => prev && ({ ...prev, borrador: { ...prev.borrador, maestro_id: e.target.value || undefined } }))}
                className="input-wellness w-full mt-1"
              >
                <option value="">— Sin asignar —</option>
                {maestros.map(m => <option key={m.id} value={m.id}>{m.nombre}</option>)}
              </select>
            </div>

            <div className="flex gap-3 pt-2">
              <Button onClick={() => guardarEdicion(editando.borrador)} className="flex-1">
                Guardar
              </Button>
              <Button variant="secondary" onClick={() => setEditando(null)} className="flex-1">
                Cancelar
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Verificar que Button acepta `variant` y `onClick`**

Leer `frontend-shala/components/ui/Button.tsx` y confirmar que tiene props `variant?: 'primary' | 'secondary'` y `onClick`. Si solo tiene `type`, ajustar las llamadas al componente para usar className directamente en lugar de variant.

Si `Button` no tiene `variant`, reemplazar `<Button variant="secondary" ...>` por `<button className="btn-secondary ..." ...>` en el planificador.

- [ ] **Step 3: Añadir link al sidebar del admin**

En `frontend-shala/app/admin/layout.tsx`, reemplazar la array `navLinks`:

```typescript
const navLinks = [
  { href: '/admin', label: 'Dashboard' },
  { href: '/admin/shala', label: 'CLASES Y PAQUETES' },
  { href: '/admin/shala/planificador', label: 'PLANIFICADOR' },
  { href: '/admin/codigos', label: 'CÓDIGOS PROMO' },
];
```

- [ ] **Step 4: Verificar build de frontend-shala**

```bash
cd /Users/mariferubieto/Desktop/wellness-platform/frontend-shala
npm run build 2>&1 | tail -20
```

Expected: Build exitoso sin errores de TypeScript.

- [ ] **Step 5: Commit**

```bash
cd /Users/mariferubieto/Desktop/wellness-platform
git add frontend-shala/app/admin/shala/planificador/page.tsx frontend-shala/app/admin/layout.tsx
git commit -m "feat: admin planificador mensual con plantilla semanal y copy-paste"
```

---

## Task 4: Usuario — Calendario Vista Semanal

**Files:**
- Modify: `frontend-shala/app/shala/calendario/page.tsx`
- Modify: `frontend-shala/components/shala/ClaseCard.tsx`

- [ ] **Step 1: Actualizar `ClaseCard` para mostrar espacio_tipo**

En `frontend-shala/components/shala/ClaseCard.tsx`, actualizar la interfaz `Clase` y añadir el badge de espacio:

```typescript
'use client';

interface Clase {
  id: string;
  nombre: string;
  descripcion?: string;
  inicio: string;
  fin: string;
  capacidad: number;
  cupo_actual: number;
  tipo: 'regular' | 'especial';
  precio_especial?: number;
  espacio_tipo?: 'salon' | 'jardin';
  maestros?: { id: string; users: { nombre: string } } | null;
}

interface ClaseCardProps {
  clase: Clase;
  onReservar?: (id: string) => void;
  onCancelar?: (id: string) => void;
  reservando?: boolean;
  cancelando?: boolean;
  yaReservada?: boolean;
  tieneCreditos?: boolean;
  reservaId?: string;
}

const ESPACIO_LABELS: Record<string, string> = {
  salon: 'Salón',
  jardin: 'Jardín',
};

export default function ClaseCard({
  clase, onReservar, onCancelar, reservando, cancelando, yaReservada, tieneCreditos, reservaId
}: ClaseCardProps) {
  const inicio = new Date(clase.inicio);
  const fin = new Date(clase.fin);
  const cuposLibres = clase.capacidad - clase.cupo_actual;
  const llena = cuposLibres === 0;

  const horaInicio = inicio.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' });
  const horaFin = fin.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' });

  return (
    <div className={`card-wellness ${llena && !yaReservada ? 'opacity-60' : ''}`}>
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <h3 className="text-base text-tierra font-medium">{clase.nombre}</h3>
          {clase.maestros?.users?.nombre && (
            <p className="text-tierra-light text-sm mt-0.5">{clase.maestros.users.nombre}</p>
          )}
          <p className="text-tierra-mid text-sm mt-1">{horaInicio} – {horaFin}</p>
          {clase.espacio_tipo && (
            <p className="text-tierra-light text-xs mt-0.5">{ESPACIO_LABELS[clase.espacio_tipo]}</p>
          )}
        </div>
        <div className="text-right ml-4 space-y-1">
          <span className={`block text-xs px-2 py-1 rounded-full ${
            llena ? 'bg-red-50 text-red-400'
            : cuposLibres <= 3 ? 'bg-sand/20 text-tierra-mid'
            : 'bg-sage-muted text-sage'
          }`}>
            {llena ? 'Llena' : `${cuposLibres} lugar${cuposLibres !== 1 ? 'es' : ''}`}
          </span>
        </div>
      </div>

      {clase.descripcion && (
        <p className="text-tierra-light text-xs mt-3 leading-relaxed">{clase.descripcion}</p>
      )}

      {(onReservar || onCancelar) && (
        <div className="mt-4 pt-4 border-t border-beige-lino">
          {yaReservada ? (
            <div className="flex items-center justify-between">
              <span className="text-sage text-xs tracking-widest uppercase">✓ Reservada</span>
              {onCancelar && reservaId && (
                <button
                  onClick={() => onCancelar(reservaId)}
                  disabled={cancelando}
                  className="text-tierra-light text-xs hover:text-red-400 transition-colors disabled:opacity-50"
                >
                  {cancelando ? 'Cancelando...' : 'Cancelar reserva'}
                </button>
              )}
            </div>
          ) : llena ? (
            <span className="text-tierra-light text-xs">Sin cupo</span>
          ) : !tieneCreditos ? (
            <span className="text-tierra-light text-xs">Necesitas un paquete activo</span>
          ) : onReservar ? (
            <button
              onClick={() => onReservar(clase.id)}
              disabled={reservando}
              className="btn-primary text-xs disabled:opacity-50"
            >
              {reservando ? 'Reservando...' : 'Reservar'}
            </button>
          ) : null}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Reescribir la página del calendario con vista semanal**

Reemplazar el contenido de `frontend-shala/app/shala/calendario/page.tsx`:

```typescript
'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import ClaseCard from '@/components/shala/ClaseCard';

interface Clase {
  id: string;
  nombre: string;
  descripcion?: string;
  inicio: string;
  fin: string;
  capacidad: number;
  cupo_actual: number;
  tipo: 'regular' | 'especial';
  precio_especial?: number;
  espacio_tipo?: 'salon' | 'jardin';
  maestros?: { id: string; users: { nombre: string } } | null;
}

interface PaqueteUsuario { id: string; clases_restantes: number; expira_en: string; }
interface Reserva { id: string; estado: string; clases: { id: string }; }

const DIAS_SEMANA_CORTO = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

function getMondayOfWeek(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

function getSemana(monday: Date): Date[] {
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return d;
  });
}

function toDateKey(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export default function CalendarioPage() {
  const [clases, setClases] = useState<Clase[]>([]);
  const [misPaquetes, setMisPaquetes] = useState<PaqueteUsuario[]>([]);
  const [misReservas, setMisReservas] = useState<Reserva[]>([]);
  const [loading, setLoading] = useState(true);
  const [reservando, setReservando] = useState<string | null>(null);
  const [cancelando, setCancelando] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [exito, setExito] = useState('');

  const [lunes, setLunes] = useState<Date>(() => getMondayOfWeek(new Date()));
  const [diaSeleccionado, setDiaSeleccionado] = useState<string>(() => toDateKey(new Date()));

  const semana = getSemana(lunes);

  const tieneCreditos = misPaquetes.some(p => p.clases_restantes > 0);
  const creditosTotal = misPaquetes.reduce((s, p) => s + p.clases_restantes, 0);

  async function loadData() {
    const [clasesData, paquetesData, reservasData] = await Promise.allSettled([
      api.get<Clase[]>('/api/shala/clases?tipo=regular'),
      api.get<PaqueteUsuario[]>('/api/shala/paquetes/mis-paquetes').catch(() => [] as PaqueteUsuario[]),
      api.get<Reserva[]>('/api/shala/reservas/mis-reservas').catch(() => [] as Reserva[]),
    ]);
    if (clasesData.status === 'fulfilled') setClases(clasesData.value);
    if (paquetesData.status === 'fulfilled') setMisPaquetes(paquetesData.value);
    if (reservasData.status === 'fulfilled') setMisReservas(reservasData.value);
  }

  useEffect(() => {
    loadData().finally(() => setLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function showMsg(ok: boolean, msg: string) {
    if (ok) { setExito(msg); setTimeout(() => setExito(''), 4000); }
    else { setError(msg); setTimeout(() => setError(''), 4000); }
  }

  async function handleReservar(claseId: string) {
    setReservando(claseId);
    try {
      await api.post('/api/shala/reservas', { clase_id: claseId });
      await loadData();
      const clase = clases.find(c => c.id === claseId);
      const hora = clase ? new Date(clase.inicio).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' }) : '';
      showMsg(true, `✓ Reserva confirmada${hora ? ' para las ' + hora : ''}`);
    } catch (err: unknown) {
      showMsg(false, err instanceof Error ? err.message : 'Error al reservar');
    } finally {
      setReservando(null);
    }
  }

  async function handleCancelar(reservaId: string) {
    setCancelando(reservaId);
    try {
      const result = await api.delete<{ credito_devuelto: boolean }>(`/api/shala/reservas/${reservaId}`);
      await loadData();
      showMsg(true, result.credito_devuelto ? '✓ Reserva cancelada — crédito devuelto' : '✓ Reserva cancelada');
    } catch (err: unknown) {
      showMsg(false, err instanceof Error ? err.message : 'Error al cancelar');
    } finally {
      setCancelando(null);
    }
  }

  const clasesByDate = clases.reduce<Record<string, Clase[]>>((acc, c) => {
    const key = new Date(c.inicio).toISOString().slice(0, 10);
    if (!acc[key]) acc[key] = [];
    acc[key].push(c);
    return acc;
  }, {});

  // Map clase_id → reserva for quick lookup
  const reservasPorClase = new Map(
    misReservas
      .filter(r => r.estado === 'activa')
      .map(r => [r.clases?.id, r.id])
  );

  const clasesDelDia = (clasesByDate[diaSeleccionado] ?? []).sort(
    (a, b) => new Date(a.inicio).getTime() - new Date(b.inicio).getTime()
  );

  const semanaLabel = (() => {
    const fin = semana[6];
    const lunesLabel = lunes.toLocaleDateString('es-MX', { day: 'numeric', month: 'short' });
    const finLabel = fin.toLocaleDateString('es-MX', { day: 'numeric', month: 'short' });
    return `${lunesLabel} – ${finLabel}`;
  })();

  return (
    <div className="min-h-screen px-4 py-12">
      <div className="max-w-3xl mx-auto">

        <div className="mb-8">
          <div className="w-8 h-px bg-sand mb-4" />
          <h1 className="text-3xl text-tierra">Calendario de clases</h1>
          {tieneCreditos && (
            <p className="text-sage text-sm mt-2">{creditosTotal} crédito{creditosTotal !== 1 ? 's' : ''} disponible{creditosTotal !== 1 ? 's' : ''}</p>
          )}
        </div>

        {error && <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-600 text-sm rounded-wellness">{error}</div>}
        {exito && <div className="mb-6 p-4 bg-sage-muted border border-sage text-sage text-sm rounded-wellness">{exito}</div>}

        {loading ? (
          <p className="text-tierra-light text-sm tracking-widest uppercase">Cargando clases...</p>
        ) : (
          <>
            {/* Navegación semanal */}
            <div className="flex items-center justify-between mb-4">
              <button
                onClick={() => {
                  const prev = new Date(lunes);
                  prev.setDate(lunes.getDate() - 7);
                  setLunes(prev);
                }}
                className="text-tierra-light hover:text-tierra text-sm px-2"
              >← anterior</button>
              <span className="text-tierra-light text-xs tracking-widest uppercase">{semanaLabel}</span>
              <button
                onClick={() => {
                  const next = new Date(lunes);
                  next.setDate(lunes.getDate() + 7);
                  setLunes(next);
                }}
                className="text-tierra-light hover:text-tierra text-sm px-2"
              >siguiente →</button>
            </div>

            {/* Botones de días */}
            <div className="grid grid-cols-7 gap-1 mb-8">
              {semana.map((dia, idx) => {
                const key = toDateKey(dia);
                const count = (clasesByDate[key] ?? []).length;
                const esHoy = key === toDateKey(new Date());
                const seleccionado = key === diaSeleccionado;
                return (
                  <button
                    key={key}
                    onClick={() => setDiaSeleccionado(key)}
                    className={`flex flex-col items-center py-3 rounded-wellness border transition-colors ${
                      seleccionado
                        ? 'bg-tierra text-white border-tierra'
                        : 'bg-white border-beige-lino hover:border-tierra-light text-tierra-light'
                    }`}
                  >
                    <span className="text-[10px] tracking-wider uppercase">{DIAS_SEMANA_CORTO[idx]}</span>
                    <span className={`text-lg font-light mt-0.5 ${esHoy && !seleccionado ? 'text-sage' : ''}`}>
                      {dia.getDate()}
                    </span>
                    {count > 0 && (
                      <span className={`text-[10px] mt-1 ${seleccionado ? 'text-white/70' : 'text-tierra-light'}`}>
                        {count} clase{count !== 1 ? 's' : ''}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Clases del día seleccionado */}
            <div>
              <p className="label-wellness mb-4 capitalize">
                {new Date(diaSeleccionado + 'T12:00:00').toLocaleDateString('es-MX', {
                  weekday: 'long', day: 'numeric', month: 'long'
                })}
              </p>

              {clasesDelDia.length === 0 ? (
                <div className="card-wellness text-center py-10">
                  <p className="text-tierra-light text-sm">No hay clases programadas este día</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {clasesDelDia.map(clase => (
                    <ClaseCard
                      key={clase.id}
                      clase={clase}
                      onReservar={handleReservar}
                      onCancelar={handleCancelar}
                      reservando={reservando === clase.id}
                      cancelando={cancelando === reservasPorClase.get(clase.id)}
                      yaReservada={reservasPorClase.has(clase.id)}
                      tieneCreditos={tieneCreditos}
                      reservaId={reservasPorClase.get(clase.id)}
                    />
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Verificar build**

```bash
cd /Users/mariferubieto/Desktop/wellness-platform/frontend-shala
npm run build 2>&1 | tail -20
```

Expected: Build exitoso.

- [ ] **Step 4: Commit**

```bash
cd /Users/mariferubieto/Desktop/wellness-platform
git add frontend-shala/app/shala/calendario/page.tsx frontend-shala/components/shala/ClaseCard.tsx
git commit -m "feat: calendario semanal con detalle por día y espacio_tipo"
```

---

## Task 5: Usuario — Página Mis Reservas

**Files:**
- Create: `frontend-shala/app/mis-reservas/page.tsx`

- [ ] **Step 1: Crear la página**

Crear `frontend-shala/app/mis-reservas/page.tsx`:

```typescript
'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';

interface ClaseDeReserva {
  id: string;
  nombre: string;
  inicio: string;
  fin: string;
  tipo: string;
  espacio_tipo?: string;
}

interface Reserva {
  id: string;
  estado: string;
  credito_devuelto?: boolean;
  created_at: string;
  clases: ClaseDeReserva;
}

const ESPACIO_LABELS: Record<string, string> = {
  salon: 'Salón',
  jardin: 'Jardín',
};

export default function MisReservasPage() {
  const [reservas, setReservas] = useState<Reserva[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'proximas' | 'historial'>('proximas');
  const [cancelando, setCancelando] = useState<string | null>(null);
  const [msg, setMsg] = useState('');
  const [error, setError] = useState('');

  async function loadReservas() {
    const data = await api.get<Reserva[]>('/api/shala/reservas/mis-reservas');
    setReservas(data);
  }

  useEffect(() => {
    loadReservas().catch(() => {}).finally(() => setLoading(false));
  }, []);

  function showMsg(ok: boolean, m: string) {
    if (ok) { setMsg(m); setTimeout(() => setMsg(''), 4000); }
    else { setError(m); setTimeout(() => setError(''), 4000); }
  }

  async function cancelar(reservaId: string) {
    setCancelando(reservaId);
    try {
      const result = await api.delete<{ credito_devuelto: boolean }>(`/api/shala/reservas/${reservaId}`);
      await loadReservas();
      showMsg(true, result.credito_devuelto ? '✓ Reserva cancelada — crédito devuelto' : '✓ Reserva cancelada (sin crédito — menos de 2 horas)');
    } catch (err: unknown) {
      showMsg(false, err instanceof Error ? err.message : 'No se pudo cancelar');
    } finally {
      setCancelando(null);
    }
  }

  const ahora = new Date();

  const proximas = reservas.filter(r => {
    if (r.estado !== 'activa') return false;
    return new Date(r.clases.inicio) > ahora;
  }).sort((a, b) => new Date(a.clases.inicio).getTime() - new Date(b.clases.inicio).getTime());

  const historial = reservas.filter(r => {
    const pasada = new Date(r.clases.inicio) <= ahora;
    const cancelada = r.estado === 'cancelada';
    return pasada || cancelada;
  }).sort((a, b) => new Date(b.clases.inicio).getTime() - new Date(a.clases.inicio).getTime());

  function puedeCancel(reserva: Reserva): boolean {
    const inicioMs = new Date(reserva.clases.inicio).getTime();
    return inicioMs > ahora.getTime();
  }

  function formatFechaHora(iso: string) {
    const d = new Date(iso);
    const fecha = d.toLocaleDateString('es-MX', { weekday: 'short', day: 'numeric', month: 'short' });
    const hora = d.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' });
    return `${fecha} · ${hora}`;
  }

  return (
    <div className="min-h-screen px-4 py-12">
      <div className="max-w-2xl mx-auto">

        <div className="mb-8">
          <div className="w-8 h-px bg-sand mb-4" />
          <h1 className="text-3xl text-tierra">Mis Reservas</h1>
        </div>

        {msg && <div className="mb-6 p-4 bg-sage-muted border border-sage text-sage text-sm rounded-wellness">{msg}</div>}
        {error && <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-600 text-sm rounded-wellness">{error}</div>}

        {/* Tabs */}
        <div className="flex gap-6 border-b border-beige-lino mb-8">
          {[
            { key: 'proximas' as const, label: `Próximas (${proximas.length})` },
            { key: 'historial' as const, label: 'Historial' },
          ].map(t => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`pb-3 text-xs tracking-widest uppercase transition-colors ${
                tab === t.key ? 'text-tierra border-b-2 border-sand' : 'text-tierra-light'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {loading ? (
          <p className="text-tierra-light text-sm tracking-widest uppercase">Cargando...</p>
        ) : (
          <>
            {/* Próximas */}
            {tab === 'proximas' && (
              <div className="space-y-4">
                {proximas.length === 0 ? (
                  <div className="card-wellness text-center py-10">
                    <p className="text-tierra-light text-sm">No tienes clases reservadas próximamente</p>
                    <a href="/shala/calendario" className="text-sage text-xs mt-2 block hover:underline">
                      Ver calendario →
                    </a>
                  </div>
                ) : (
                  proximas.map(r => (
                    <div key={r.id} className="card-wellness">
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="text-tierra font-medium">{r.clases.nombre}</p>
                          <p className="text-tierra-light text-sm mt-1">{formatFechaHora(r.clases.inicio)}</p>
                          {r.clases.espacio_tipo && (
                            <p className="text-tierra-light text-xs mt-0.5">{ESPACIO_LABELS[r.clases.espacio_tipo] ?? r.clases.espacio_tipo}</p>
                          )}
                        </div>
                        {puedeCancel(r) && (
                          <button
                            onClick={() => cancelar(r.id)}
                            disabled={cancelando === r.id}
                            className="text-tierra-light text-xs hover:text-red-400 transition-colors disabled:opacity-50 shrink-0 ml-4"
                          >
                            {cancelando === r.id ? 'Cancelando...' : 'Cancelar'}
                          </button>
                        )}
                      </div>
                      <p className="text-tierra-light/50 text-xs mt-3">
                        * Cancelaciones con más de 2 horas de anticipación devuelven el crédito
                      </p>
                    </div>
                  ))
                )}
              </div>
            )}

            {/* Historial */}
            {tab === 'historial' && (
              <div className="space-y-3">
                {historial.length === 0 ? (
                  <div className="card-wellness text-center py-10">
                    <p className="text-tierra-light text-sm">Sin historial de clases</p>
                  </div>
                ) : (
                  historial.map(r => (
                    <div key={r.id} className={`card-wellness py-3 ${r.estado === 'cancelada' ? 'opacity-60' : ''}`}>
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="text-tierra text-sm font-medium">{r.clases.nombre}</p>
                          <p className="text-tierra-light text-xs mt-0.5">{formatFechaHora(r.clases.inicio)}</p>
                        </div>
                        <span className={`text-xs px-2 py-1 rounded-full shrink-0 ml-3 ${
                          r.estado === 'cancelada' ? 'bg-red-50 text-red-400' : 'bg-sage-muted text-sage'
                        }`}>
                          {r.estado === 'cancelada' ? 'Cancelada' : 'Asistida'}
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verificar build**

```bash
cd /Users/mariferubieto/Desktop/wellness-platform/frontend-shala
npm run build 2>&1 | tail -20
```

Expected: Build exitoso.

- [ ] **Step 3: Commit**

```bash
cd /Users/mariferubieto/Desktop/wellness-platform
git add frontend-shala/app/mis-reservas/page.tsx
git commit -m "feat: página Mis Reservas con próximas e historial"
```

---

## Task 6: Navbar + Middleware — Mis Reservas

**Files:**
- Modify: `frontend-shala/components/ui/Navbar.tsx`
- Modify: `frontend-shala/middleware.ts`

- [ ] **Step 1: Añadir "Mis Reservas" al Navbar**

En `frontend-shala/components/ui/Navbar.tsx`, reemplazar la constante `NAV_ITEMS`:

```typescript
const NAV_ITEMS = [
  { label: 'Calendario', href: '/shala/calendario' },
  { label: 'Mis Reservas', href: '/mis-reservas' },
  { label: 'Mis Paquetes', href: '/shala/mis-paquetes' },
];
```

Nota: actualiza también los `href` existentes si actualmente apuntan a `/calendario` sin el prefijo `/shala/` — verificar que coincidan con las rutas reales del filesystem (la ruta existe en `app/shala/calendario/page.tsx`).

- [ ] **Step 2: Proteger /mis-reservas en middleware**

Leer `frontend-shala/middleware.ts` y añadir `/mis-reservas` a la lista de rutas protegidas que requieren autenticación. Si el middleware ya tiene un matcher genérico que incluye rutas de usuario, verificar que `/mis-reservas` queda cubierta.

Si el middleware tiene una lista explícita como `['/shala/:path*', '/mis-paquetes', '/perfil']`, añadir `'/mis-reservas'` a esa lista.

- [ ] **Step 3: Verificar build final**

```bash
cd /Users/mariferubieto/Desktop/wellness-platform/frontend-shala
npm run build 2>&1 | tail -20
```

Expected: Build exitoso sin errores.

- [ ] **Step 4: Correr todos los tests del backend**

```bash
cd /Users/mariferubieto/Desktop/wellness-platform/backend
npx jest --no-coverage 2>&1 | tail -10
```

Expected: todos los tests pasan.

- [ ] **Step 5: Commit final**

```bash
cd /Users/mariferubieto/Desktop/wellness-platform
git add frontend-shala/components/ui/Navbar.tsx frontend-shala/middleware.ts
git commit -m "feat: añadir Mis Reservas al navbar y proteger ruta con middleware"
```

---

## Deploy

Tras completar todos los tasks:

```bash
# Deploy frontend-shala a Vercel
cd /Users/mariferubieto/Desktop/wellness-platform/frontend-shala
vercel --prod

# El backend en Render se actualiza automáticamente con el push a GitHub
```

Verificar en Vercel que el build de producción pasa y que los cambios están activos.
