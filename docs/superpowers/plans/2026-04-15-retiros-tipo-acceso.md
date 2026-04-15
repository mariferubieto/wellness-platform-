# Retiros tipo_acceso + imagen Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Añadir `tipo_acceso: 'pago' | 'whatsapp'` a retiros e `imagen_url` en los cards, con CTA adaptado en la página de detalle.

**Architecture:** Migración SQL agrega `tipo_acceso`. Backend lo expone en selects y valida en POST/PATCH. El admin permite cambiarlo inline. RetiroCard muestra `imagen_url`. La página de detalle muestra un solo botón según el tipo.

**Tech Stack:** Next.js 14 App Router · Express + Supabase · Tailwind CSS wellness tokens · TypeScript

**Working directory:** `/Users/mariferubieto/Desktop/wellness-platform`

---

## File Map

| Archivo | Acción |
|---|---|
| `database/migrations/011_retiros_tipo_acceso.sql` | Crear |
| `backend/src/services/retiros.service.ts` | Modificar |
| `backend/src/routes/retiros/index.ts` | Modificar |
| `backend/tests/retiros.test.ts` | Modificar — añadir casos tipo_acceso |
| `frontend-marifer/app/admin/marifer/page.tsx` | Modificar |
| `frontend-marifer/components/marifer/RetiroCard.tsx` | Modificar |
| `frontend-marifer/app/retiros/[id]/page.tsx` | Modificar |

---

## Task 1: Migración SQL 011

**Files:**
- Create: `database/migrations/011_retiros_tipo_acceso.sql`

- [ ] **Step 1: Crear el archivo de migración**

```sql
-- database/migrations/011_retiros_tipo_acceso.sql

ALTER TABLE retiros
  ADD COLUMN IF NOT EXISTS tipo_acceso text
    CHECK (tipo_acceso IN ('pago', 'whatsapp'))
    DEFAULT 'pago';
```

- [ ] **Step 2: Ejecutar en Supabase**

Abrir https://supabase.com/dashboard/project/rsahtjffquqveshjalky/sql/new, pegar el contenido y ejecutar.

Expected: Sin errores. Verificar en Table Editor que `retiros` tiene columna `tipo_acceso` con valor `'pago'` en filas existentes.

- [ ] **Step 3: Commit**

```bash
git add database/migrations/011_retiros_tipo_acceso.sql
git commit -m "feat: migración 011 — tipo_acceso en retiros"
```

---

## Task 2: Backend — tipo_acceso en service + routes

**Files:**
- Modify: `backend/src/services/retiros.service.ts`
- Modify: `backend/src/routes/retiros/index.ts`
- Modify: `backend/tests/retiros.test.ts`

- [ ] **Step 1: Leer los archivos actuales**

```bash
cat backend/src/services/retiros.service.ts
cat backend/src/routes/retiros/index.ts
cat backend/tests/retiros.test.ts
```

- [ ] **Step 2: Actualizar `retiros.service.ts`**

Aplicar estos cambios en `backend/src/services/retiros.service.ts`:

**a) `getRetiros()` — añadir `tipo_acceso` e `imagen_url` al select:**
```typescript
.select('id, nombre, descripcion, lugar, precio, fecha_inicio, fecha_fin, imagen_url, activo, tipo_acceso')
```

**b) `getRetiroById()` — añadir `tipo_acceso` al select:**
```typescript
.select('id, nombre, descripcion, lugar, incluye, precio, fecha_inicio, fecha_fin, imagen_url, activo, tipo_acceso')
```

**c) `createRetiro()` — añadir `tipo_acceso` al tipo del parámetro y al insert:**

Cambiar la firma:
```typescript
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
  tipo_acceso?: 'pago' | 'whatsapp';
}) {
```

Añadir en el objeto `.insert(...)`:
```typescript
tipo_acceso: body.tipo_acceso ?? 'pago',
```

**d) `updateRetiro()` — añadir `tipo_acceso` al tipo del parámetro:**

Cambiar el tipo `Partial<{...}>` para incluir:
```typescript
tipo_acceso?: 'pago' | 'whatsapp';
```

(El resto del update ya usa `body` directamente, por lo que `tipo_acceso` se incluirá automáticamente si viene en el body.)

- [ ] **Step 3: Actualizar `retiros/index.ts` — validación en POST y PATCH**

Leer `backend/src/routes/retiros/index.ts`. En el handler POST (admin: create), añadir validación de `tipo_acceso` antes del `createRetiro`:

```typescript
// Admin: create — añadir después de la validación de nombre y precio:
const { nombre, precio, tipo_acceso } = req.body;
if (tipo_acceso !== undefined && !['pago', 'whatsapp'].includes(tipo_acceso)) {
  res.status(400).json({ error: 'tipo_acceso debe ser pago o whatsapp' });
  return;
}
```

En el handler PATCH (admin: update), añadir validación:
```typescript
// Admin: update — añadir al inicio del handler:
const { tipo_acceso } = req.body;
if (tipo_acceso !== undefined && !['pago', 'whatsapp'].includes(tipo_acceso)) {
  res.status(400).json({ error: 'tipo_acceso debe ser pago o whatsapp' });
  return;
}
```

- [ ] **Step 4: Añadir test de validación tipo_acceso en `backend/tests/retiros.test.ts`**

Leer `backend/tests/retiros.test.ts` completo para entender los patrones de mock existentes, luego añadir al final del archivo:

```typescript
describe('PATCH /api/retiros/:id (admin)', () => {
  it('returns 400 for invalid tipo_acceso', async () => {
    mockAdminAuth();
    const res = await request(app)
      .patch('/api/retiros/ret-1')
      .set('Authorization', 'Bearer valid-token')
      .send({ tipo_acceso: 'gratis' });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/tipo_acceso/);
  });
});
```

- [ ] **Step 5: Ejecutar tests**

```bash
cd /Users/mariferubieto/Desktop/wellness-platform/backend
npx jest --no-coverage tests/retiros.test.ts 2>&1 | tail -10
```

Expected: todos los tests de retiros passing incluido el nuevo.

- [ ] **Step 6: Commit**

```bash
git add backend/src/services/retiros.service.ts \
        backend/src/routes/retiros/index.ts \
        backend/tests/retiros.test.ts
git commit -m "feat: backend retiros — tipo_acceso en service, routes y tests"
```

---

## Task 3: Admin — badge + inline select tipo_acceso

**Files:**
- Modify: `frontend-marifer/app/admin/marifer/page.tsx`

- [ ] **Step 1: Leer el archivo**

```bash
cat frontend-marifer/app/admin/marifer/page.tsx
```

- [ ] **Step 2: Actualizar la interfaz `Retiro` y añadir función de toggle**

**a) Cambiar la interfaz `Retiro` (línea ~7):**
```typescript
interface Retiro {
  id: string;
  nombre: string;
  lugar?: string;
  fecha_inicio?: string;
  fecha_fin?: string;
  precio: number;
  tipo_acceso: 'pago' | 'whatsapp';
}
```

**b) Añadir función `handleTipoAcceso` después de `verInscritos`:**
```typescript
async function handleTipoAcceso(retiroId: string, tipo: 'pago' | 'whatsapp') {
  try {
    await api.patch(`/api/retiros/${retiroId}`, { tipo_acceso: tipo });
    setRetiros(prev => prev.map(r => r.id === retiroId ? { ...r, tipo_acceso: tipo } : r));
  } catch {
    setError('Error al actualizar tipo de acceso');
  }
}
```

**c) Actualizar el render de cada retiro en la lista** — reemplazar el bloque del item de retiro:
```tsx
<div
  key={r.id}
  className={`bg-white border rounded-wellness px-4 py-3 transition-colors ${
    vistaActual?.id === r.id ? 'border-sage bg-sage-muted/30' : 'border-beige-lino hover:border-sage'
  }`}
>
  <div
    className="cursor-pointer"
    onClick={() => verInscritos('retiro', r.id, r.nombre)}
  >
    <p className="text-sm text-tierra">{r.nombre}</p>
    <p className="text-xs text-tierra-light">{r.lugar ?? '—'} · ${r.precio.toLocaleString('es-MX')} MXN</p>
  </div>
  <div className="mt-2 flex items-center gap-2">
    <select
      value={r.tipo_acceso}
      onChange={e => handleTipoAcceso(r.id, e.target.value as 'pago' | 'whatsapp')}
      className="text-xs border border-beige-lino rounded px-2 py-1 text-tierra-light bg-white"
      onClick={e => e.stopPropagation()}
    >
      <option value="pago">Pago</option>
      <option value="whatsapp">WhatsApp</option>
    </select>
  </div>
</div>
```

- [ ] **Step 3: Verificar TypeScript**

```bash
cd /Users/mariferubieto/Desktop/wellness-platform/frontend-marifer
npx tsc --noEmit 2>&1 | grep "error TS" | grep "admin/marifer" | head -10
```

Expected: Sin errores en `admin/marifer/page.tsx`.

- [ ] **Step 4: Commit**

```bash
git add frontend-marifer/app/admin/marifer/page.tsx
git commit -m "feat: admin marifer — tipo_acceso visible y editable en lista de retiros"
```

---

## Task 4: RetiroCard — imagen_url

**Files:**
- Modify: `frontend-marifer/components/marifer/RetiroCard.tsx`

- [ ] **Step 1: Leer el archivo actual**

```bash
cat frontend-marifer/components/marifer/RetiroCard.tsx
```

- [ ] **Step 2: Reemplazar el contenido completo**

```tsx
import Link from 'next/link';
import Image from 'next/image';

interface Retiro {
  id: string;
  nombre: string;
  descripcion?: string;
  lugar?: string;
  precio: number;
  fecha_inicio?: string;
  fecha_fin?: string;
  imagen_url?: string;
}

export default function RetiroCard({ retiro }: { retiro: Retiro }) {
  const fechas = retiro.fecha_inicio && retiro.fecha_fin
    ? `${new Date(retiro.fecha_inicio).toLocaleDateString('es-MX', { day: 'numeric', month: 'short' })} – ${new Date(retiro.fecha_fin).toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' })}`
    : null;

  return (
    <div className="card-wellness flex flex-col">
      {retiro.imagen_url && (
        <div className="relative w-full h-40 mb-4">
          <Image
            src={retiro.imagen_url}
            alt={retiro.nombre}
            fill
            className="object-cover rounded-wellness"
          />
        </div>
      )}
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

- [ ] **Step 3: Verificar la imagen en el retiro list page**

Leer `frontend-marifer/app/retiros/page.tsx` para confirmar que pasa `retiro` completo a `<RetiroCard retiro={r} />` incluyendo `imagen_url`. Si la interfaz `Retiro` en ese archivo no incluye `imagen_url`, añadirla:

```typescript
interface Retiro {
  id: string;
  nombre: string;
  descripcion?: string;
  lugar?: string;
  precio: number;
  fecha_inicio?: string;
  fecha_fin?: string;
  imagen_url?: string;
}
```

- [ ] **Step 4: TypeScript check**

```bash
cd /Users/mariferubieto/Desktop/wellness-platform/frontend-marifer
npx tsc --noEmit 2>&1 | grep "error TS" | grep "RetiroCard\|retiros/page" | head -10
```

Expected: Sin errores nuevos.

- [ ] **Step 5: Commit**

```bash
git add frontend-marifer/components/marifer/RetiroCard.tsx \
        frontend-marifer/app/retiros/page.tsx
git commit -m "feat: RetiroCard con imagen_url"
```

---

## Task 5: /retiros/[id] — CTA adaptado por tipo_acceso

**Files:**
- Modify: `frontend-marifer/app/retiros/[id]/page.tsx`

- [ ] **Step 1: Leer el archivo actual**

```bash
cat "frontend-marifer/app/retiros/[id]/page.tsx"
```

- [ ] **Step 2: Actualizar la interfaz y el CTA**

**a) Actualizar la interfaz `Retiro` — añadir `tipo_acceso`, quitar `whatsapp_contacto`:**

```typescript
interface Retiro {
  id: string;
  nombre: string;
  descripcion?: string;
  lugar?: string;
  incluye?: string;
  precio: number;
  fecha_inicio?: string;
  fecha_fin?: string;
  imagen_url?: string;
  tipo_acceso: 'pago' | 'whatsapp';
  activo: boolean;
}
```

**b) Eliminar la variable `waLink` (líneas ~59-62)** — ya no se usa `whatsapp_contacto`.

**c) Reemplazar el bloque del CTA** — cambiar el bloque `<div className="border border-sand...">` completo con:

```tsx
<div className="border border-sand rounded-wellness p-8">
  <div className="mb-6">
    <p className="label-wellness mb-1">Inversión</p>
    <p className="text-4xl font-light text-tierra">
      ${retiro.precio.toLocaleString('es-MX')} <span className="text-base text-tierra-light">MXN</span>
    </p>
  </div>

  {retiro.tipo_acceso === 'pago' ? (
    <button
      onClick={() => router.push(`/retiros/inscripcion?retiro_id=${retiro.id}&precio=${retiro.precio}&nombre=${encodeURIComponent(retiro.nombre)}`)}
      className="btn-primary w-full text-center"
    >
      Inscribirme
    </button>
  ) : (
    <a
      href={`https://wa.me/52${process.env.NEXT_PUBLIC_WHATSAPP_MARIFER ?? ''}?text=${encodeURIComponent(`Hola, me interesa el retiro "${retiro.nombre}". ¿Puedes darme más información?`)}`}
      target="_blank"
      rel="noopener noreferrer"
      className="btn-primary w-full text-center block"
    >
      Contactar por WhatsApp
    </a>
  )}

  <p className="text-tierra-light text-xs text-center mt-4">
    {retiro.tipo_acceso === 'pago'
      ? 'Recibirás confirmación por WhatsApp una vez validado tu lugar.'
      : 'Te responderemos a la brevedad por WhatsApp.'}
  </p>
</div>
```

**d) Opcional — añadir imagen header** si `imagen_url` existe. Después de `<div className="w-8 h-px bg-sand mb-6" />` y antes de `{fechas && ...}`, añadir:

```tsx
{retiro.imagen_url && (
  <div className="relative w-full h-64 mb-8 rounded-wellness overflow-hidden">
    <Image src={retiro.imagen_url} alt={retiro.nombre} fill className="object-cover" />
  </div>
)}
```

Y añadir el import al inicio del archivo:
```typescript
import Image from 'next/image';
```

- [ ] **Step 3: TypeScript check**

```bash
cd /Users/mariferubieto/Desktop/wellness-platform/frontend-marifer
npx tsc --noEmit 2>&1 | grep "error TS" | grep "retiros/\[id\]" | head -10
```

Expected: Sin errores en el archivo de detalle.

- [ ] **Step 4: Correr todos los tests del backend**

```bash
cd /Users/mariferubieto/Desktop/wellness-platform/backend
npx jest --no-coverage 2>&1 | tail -6
```

Expected: ~96+ passing, mismas 2-3 fallas pre-existentes (maestros fixture, pagos webhook).

- [ ] **Step 5: Commit**

```bash
git add "frontend-marifer/app/retiros/[id]/page.tsx"
git commit -m "feat: detalle retiro — CTA adaptado por tipo_acceso, imagen header"
```
