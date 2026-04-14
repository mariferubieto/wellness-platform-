# Ayurveda Page — Tabs con Cursos y tipo_acceso

## Goal

Mejorar la página pública `/ayurveda` para mostrar las 4 categorías (Diplomados · Cocina · Pranayamas · Cursos Especiales) con tabs, un modal de detalle al hacer clic en cualquier card, y un flujo de inscripción adaptado según el `tipo_acceso` del curso.

## Architecture

Sin cambios de infraestructura. Una migración SQL agrega `tipo_acceso` a `cursos_ayurveda`, renombra `mudras → pranayamas` y crea la tabla `inscripciones_cursos`. El backend actualiza la validación de tipo y expone un nuevo endpoint de inscripciones para cursos. El frontend reescribe `/ayurveda/page.tsx` con tabs + modal y actualiza el admin para soportar `tipo_acceso` y el nuevo tipo `pranayamas`.

## Tech Stack

Next.js 14 App Router · Express + Supabase · Tailwind CSS wellness tokens · TypeScript

---

## 1. Base de Datos — Migration `010_cursos_ayurveda_update.sql`

```sql
-- 1. Agregar tipo_acceso a cursos_ayurveda
ALTER TABLE cursos_ayurveda
  ADD COLUMN IF NOT EXISTS tipo_acceso text
    CHECK (tipo_acceso IN ('pago', 'whatsapp', 'gratis'))
    DEFAULT 'pago';

-- 2. Renombrar mudras → pranayamas (UPDATE antes de cambiar la constraint)
UPDATE cursos_ayurveda SET tipo = 'pranayamas' WHERE tipo = 'mudras';

-- 3. Actualizar CHECK constraint del tipo
ALTER TABLE cursos_ayurveda DROP CONSTRAINT IF EXISTS cursos_ayurveda_tipo_check;
ALTER TABLE cursos_ayurveda
  ADD CONSTRAINT cursos_ayurveda_tipo_check
    CHECK (tipo IN ('cocina', 'pranayamas', 'extras'));

-- 4. Tabla de inscripciones para cursos (separada de inscripciones_diplomado)
CREATE TABLE IF NOT EXISTS inscripciones_cursos (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  curso_id uuid REFERENCES cursos_ayurveda(id) ON DELETE CASCADE NOT NULL,
  nombre_completo text NOT NULL,
  whatsapp text NOT NULL,
  email text NOT NULL,
  created_at timestamptz DEFAULT now()
);
```

---

## 2. Backend

### `backend/src/routes/ayurveda/cursos.ts` — Modificar

- Cambiar `TipoCurso = 'cocina' | 'mudras' | 'extras'` → `'cocina' | 'pranayamas' | 'extras'`
- Actualizar el array de validación en GET y POST
- Incluir `tipo_acceso` en `POST /` (create) y `PATCH /:id` (update), con valor permitido: `'pago' | 'whatsapp' | 'gratis'`

### `backend/src/routes/ayurveda/cursos-inscripciones.ts` — Crear (nuevo)

```
POST /api/ayurveda/cursos-inscripciones
Auth: pública (sin requireAuth)
Body: { curso_id, nombre_completo, whatsapp, email }
Validación: todos los campos requeridos
Acción: INSERT en inscripciones_cursos
Response: 201 { id, curso_id, nombre_completo, whatsapp, email, created_at }
```

### `backend/src/routes/ayurveda/index.ts` — Modificar

Agregar:
```typescript
import cursosInscripcionesRouter from './cursos-inscripciones';
router.use('/cursos-inscripciones', cursosInscripcionesRouter);
```

---

## 3. Admin — `frontend-marifer/app/admin/ayurveda/page.tsx` — Modificar

Dos cambios puntuales:

**a) Renombrar mudras → pranayamas:**
- `CursoTabProps.tipo`: `'cocina' | 'mudras' | 'extras'` → `'cocina' | 'pranayamas' | 'extras'`
- `CursoAyurveda.tipo`: mismo cambio
- `TabId`: reemplazar `'mudras'` por `'pranayamas'`
- TABS array: `{ id: 'mudras', label: 'Mudras y Bandhas' }` → `{ id: 'pranayamas', label: 'Pranayamas' }`
- Renderizado: `activeTab === 'mudras'` → `activeTab === 'pranayamas'`

**b) Añadir campo tipo_acceso al formulario de CursoTab:**
```typescript
// En el form state de CursoTab, agregar:
tipo_acceso: 'pago' as 'pago' | 'whatsapp' | 'gratis'

// En handleSubmit, incluir tipo_acceso en el body del POST

// En el JSX del form, añadir select:
<label className="label-wellness">Tipo de acceso</label>
<select
  value={form.tipo_acceso}
  onChange={e => setForm(f => ({ ...f, tipo_acceso: e.target.value as 'pago' | 'whatsapp' | 'gratis' }))}
  className="input-wellness mt-1"
>
  <option value="pago">Pago</option>
  <option value="whatsapp">WhatsApp (contacto directo)</option>
  <option value="gratis">Gratuito</option>
</select>
```

---

## 4. Frontend Público — `/ayurveda/page.tsx` — Reescritura

### Estado

```typescript
type TabId = 'diplomados' | 'cocina' | 'pranayamas' | 'extras';

const TABS: { id: TabId; label: string }[] = [
  { id: 'diplomados', label: 'Diplomados' },
  { id: 'cocina', label: 'Cocina' },
  { id: 'pranayamas', label: 'Pranayamas' },
  { id: 'extras', label: 'Cursos Especiales' },
];

// Tipos
interface Diplomado {
  id: string; nombre: string; descripcion?: string;
  temario?: string[]; calendario?: string[]; precio: number; generacion: string;
}
interface Curso {
  id: string; tipo: 'cocina' | 'pranayamas' | 'extras'; nombre: string;
  descripcion?: string; temario?: string[]; fechas?: string[];
  precio: number; foto_url?: string; cupo_maximo?: number;
  tipo_acceso: 'pago' | 'whatsapp' | 'gratis';
}
type ModalItem = { kind: 'diplomado'; data: Diplomado } | { kind: 'curso'; data: Curso };

// Estado del componente
const [activeTab, setActiveTab] = useState<TabId>('diplomados');
const [diplomados, setDiplomados] = useState<Diplomado[]>([]);
const [cursosCocina, setCursosCocina] = useState<Curso[]>([]);
const [cursosPranayamas, setCursosPranayamas] = useState<Curso[]>([]);
const [cursosExtras, setCursosExtras] = useState<Curso[]>([]);
const [loading, setLoading] = useState(true);
const [selected, setSelected] = useState<ModalItem | null>(null);
```

### Carga de datos

```typescript
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
```

### Layout

```
Encabezado (hero section igual al actual)
Tabs: [Diplomados] [Cocina] [Pranayamas] [Cursos Especiales]
Grid de cards (activo)
Modal (cuando selected !== null)
```

### Tabs

Barra de tabs con estilo consistente al admin pero para el público:
- Tab activo: `border-b-2 border-tierra text-tierra`
- Tab inactivo: `text-tierra-light hover:text-tierra`

### Cards

- Tab Diplomados → `<DiplomadoCard>` existente pero `onClick` abre modal en vez de navegar:
  ```tsx
  // Modificar DiplomadoCard para aceptar onClick optional
  // Cuando se pasa onClick, NO renderizar el <Link>, en su lugar <div onClick={onClick}>
  ```
- Tabs Cocina/Pranayamas/Extras → `<CursoCard>` (nuevo)

---

## 5. Componente `CursoCard.tsx` — Crear

`frontend-marifer/components/ayurveda/CursoCard.tsx`

```tsx
interface Curso {
  id: string; nombre: string; descripcion?: string;
  fechas?: string[]; precio: number; foto_url?: string;
  tipo_acceso: 'pago' | 'whatsapp' | 'gratis';
}

export default function CursoCard({ curso, onClick }: { curso: Curso; onClick: () => void }) {
  return (
    <div className="card-wellness flex flex-col cursor-pointer hover:shadow-md transition-shadow" onClick={onClick}>
      {curso.foto_url && (
        <img src={curso.foto_url} alt={curso.nombre}
          className="w-full h-40 object-cover rounded-t-wellness mb-4" />
      )}
      <div className="flex-1">
        <div className="flex items-start justify-between gap-2 mb-2">
          <h3 className="text-xl text-tierra">{curso.nombre}</h3>
          {curso.tipo_acceso === 'gratis' && (
            <span className="text-xs px-2 py-0.5 bg-sage-muted text-sage rounded-full whitespace-nowrap">Registro abierto</span>
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
        {/* El precio siempre se muestra — tipo_acceso:'gratis' es modo de captura temporal, no indica precio $0 */}
        <span className="btn-secondary text-xs pointer-events-none">Ver más</span>
      </div>
    </div>
  );
}
```

---

## 6. Componente `ModalDetalleCurso.tsx` — Crear

`frontend-marifer/components/ayurveda/ModalDetalleCurso.tsx`

Recibe `item: ModalItem` y `onClose: () => void`.

### Estructura del modal

```
Overlay oscuro (fixed inset-0 bg-black/40 z-50, click fuera → cerrar)
Panel blanco centrado (max-w-lg, overflow-y-auto, max-h-[90vh])
  ├── Botón ✕ cerrar (top-right)
  ├── [Si foto_url] imagen header
  ├── Badge (tipo para cursos, generación para diplomados)
  ├── Nombre (h2 text-2xl text-tierra)
  ├── Descripción
  ├── [Si temario] sección "Temario" — lista con bullet points
  ├── [Si fechas/calendario] sección "Fechas"
  ├── Precio
  └── Sección de acción (según tipo):
```

### Sección de acción

**Diplomado:**
```tsx
<Link href={`/ayurveda/inscripcion?diplomado_id=${data.id}`} className="btn-primary w-full text-center">
  Inscribirme
</Link>
```

**Curso con `tipo_acceso: 'pago'`:**

Flujo con pago directo vía MercadoPago (igual que retiros).

```tsx
<Link
  href={`/ayurveda/inscripcion?curso_id=${data.id}&nombre=${encodeURIComponent(data.nombre)}&precio=${data.precio}`}
  className="btn-primary w-full text-center"
>
  Inscribirme
</Link>
```

**Curso con `tipo_acceso: 'whatsapp'`:**
```tsx
// Requiere env var NEXT_PUBLIC_WHATSAPP_MARIFER (sin +52, solo 10 dígitos) en frontend-marifer/.env.local y en Vercel
<a
  href={`https://wa.me/52${process.env.NEXT_PUBLIC_WHATSAPP_MARIFER}?text=${encodeURIComponent(`Hola, me interesa el curso: ${data.nombre}`)}`}
  target="_blank" rel="noopener noreferrer"
  className="btn-primary w-full text-center block"
>
  Contactar por WhatsApp
</a>
```

**Curso con `tipo_acceso: 'gratis'`:**

Modo de recopilación de datos — el admin lo activa temporalmente. El botón dice "Inscribirme" igual que en modo pago, pero el formulario no menciona pago ni coordinación de transferencia.

```tsx
<Link href={`/ayurveda/inscripcion?curso_id=${data.id}&nombre=${encodeURIComponent(data.nombre)}&modo=leads`}
  className="btn-primary w-full text-center">
  Inscribirme
</Link>
```

---

## 7. Página `/ayurveda/inscripcion` — Actualizar

`frontend-marifer/app/ayurveda/inscripcion/page.tsx`

Actualmente solo acepta `?diplomado_id=`. Actualizar para también aceptar `?curso_id=`.

**Cambios:**
- Leer `curso_id`, `nombre`, `precio`, `modo` de `searchParams`
- Si `diplomado_id`: flujo existente sin cambios
- Si `curso_id`:
  - Mostrar nombre del curso desde el query param (sin fetch adicional)
  - Formulario: **solo** `nombre_completo`, `whatsapp`, `email_gmail` — sin campo `razon`
  - Si **`modo` no presente** (`tipo_acceso: 'pago'`):
    - `handleSubmit`: `POST /api/ayurveda/cursos-inscripciones` con `{ curso_id, nombre_completo, whatsapp, email }`, luego llamar `iniciarPago({ concepto: 'curso_ayurveda', concepto_id: curso_id, monto: precio, titulo: nombre })` para redirigir a MercadoPago
  - Si **`modo=leads`** (`tipo_acceso: 'gratis'`):
    - `handleSubmit`: solo `POST /api/ayurveda/cursos-inscripciones` (sin pago), redirigir a pantalla de éxito
    - Pie: "Nos pondremos en contacto por WhatsApp para confirmar tu lugar."
  - Botón "Regresar" → `/ayurveda`

---

## 8. DiplomadoCard — Modificar

`frontend-marifer/components/ayurveda/DiplomadoCard.tsx`

Añadir prop opcional `onClick?: () => void`. Cuando `onClick` está presente:
- Reemplazar el `<Link>` del botón por un `<button onClick={onClick}>Ver más</button>`
- El div exterior también llama `onClick` al clic (hacer el card completo clickeable)

---

## 9. Archivos a Crear / Modificar

| Archivo | Acción |
|---|---|
| `database/migrations/010_cursos_ayurveda_update.sql` | Crear |
| `backend/src/routes/ayurveda/cursos.ts` | Modificar — tipo pranayamas + tipo_acceso |
| `backend/src/routes/ayurveda/cursos-inscripciones.ts` | Crear — POST inscripcion |
| `backend/src/routes/ayurveda/index.ts` | Modificar — mount cursos-inscripciones |
| `frontend-marifer/app/admin/ayurveda/page.tsx` | Modificar — pranayamas + tipo_acceso |
| `frontend-marifer/app/ayurveda/page.tsx` | Reescribir — tabs + modal |
| `frontend-marifer/components/ayurveda/CursoCard.tsx` | Crear |
| `frontend-marifer/components/ayurveda/ModalDetalleCurso.tsx` | Crear |
| `frontend-marifer/components/ayurveda/DiplomadoCard.tsx` | Modificar — onClick prop |
| `frontend-marifer/app/ayurveda/inscripcion/page.tsx` | Modificar — acepta curso_id |

---

## 10. Orden de Implementación

1. Migración SQL `010` + ejecutar en Supabase
2. Backend: actualizar cursos.ts + crear cursos-inscripciones.ts + actualizar index.ts
3. Admin: renombrar mudras→pranayamas + campo tipo_acceso
4. DiplomadoCard: añadir prop onClick
5. CursoCard: crear nuevo componente
6. ModalDetalleCurso: crear modal con lógica de tipo_acceso
7. /ayurveda page: reescribir con tabs + carga paralela + modal
8. /ayurveda/inscripcion: actualizar para curso_id
