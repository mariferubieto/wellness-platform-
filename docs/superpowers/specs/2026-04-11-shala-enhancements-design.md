# Shala App Enhancements — Sub-proyecto 2

## Goal

Mejorar la app de Shala con tres mejoras conectadas: (1) tipos de espacio por clase (Salón / Jardín), (2) planificador mensual con plantilla semanal + copy-paste para el admin, y (3) UX completa de reservas para el cliente con vista semanal por día e historial.

## Architecture

Sin cambios de infraestructura. Todo dentro de `frontend-shala/` y `backend/`. Una migración SQL agrega `espacio_tipo` a la tabla `clases`. El backend expone un nuevo endpoint de creación por lotes. El frontend añade dos páginas nuevas (planificador admin, historial usuario) y mejora el calendario existente.

## Tech Stack

- Next.js 14 App Router — frontend-shala
- Express + Supabase — backend compartido
- Tailwind CSS wellness tokens — mismo sistema de diseño

---

## 1. Base de Datos

### Migración: `009_clases_espacio.sql`

```sql
ALTER TABLE clases
  ADD COLUMN IF NOT EXISTS espacio_tipo text
    CHECK (espacio_tipo IN ('salon', 'jardin'))
    DEFAULT 'salon';
```

Capacidades de referencia por espacio (informativas, no restrictivas — admin puede sobrescribir `capacidad` por clase):
- `salon` → 10 personas
- `jardin` → 70 personas

No se requieren cambios en la tabla `reservas`.

---

## 2. Backend

### Modificaciones a `/api/shala/clases`

**`GET /api/shala/clases`** — ya existente. Agregar `espacio_tipo` al select y al filtro por rango de fechas. Sin cambios de firma.

**`POST /api/shala/clases`** — ya existente. Aceptar campo `espacio_tipo` opcional (default: `'salon'`).

**`PATCH /api/shala/clases/:id`** — ya existente. Aceptar campo `espacio_tipo` en el body de updates.

**`POST /api/shala/clases/batch`** — **nuevo endpoint**

```
POST /api/shala/clases/batch
Auth: requireAuth + requireRole('admin')
Body: { clases: ClaseInput[] }
ClaseInput: {
  nombre: string
  descripcion?: string
  inicio: string          // ISO datetime
  fin: string             // ISO datetime
  capacidad: number
  espacio_tipo: 'salon' | 'jardin'
  maestro_id?: string
  estilo_id?: string
  tipo?: 'regular' | 'especial'
  precio_especial?: number
}
Response: 201 { created: number, clases: Clase[] }
```

Hace un insert bulk con `supabaseAdmin.from('clases').insert(clases)`.

---

## 3. Admin — Planificador Mensual

### Ruta: `/admin/shala/calendario`

Nueva página que reemplaza o complementa la gestión de clases existente.

### Flujo de uso

```
1. Admin selecciona mes/año
2. Define "Semana Tipo" en panel lateral (días Lun–Dom, una o varias clases por día)
3. Presiona "Aplicar al mes" → el sistema genera instancias para cada día del mes según la semana tipo
4. El calendario se puebla con las clases generadas (estado: borrador local, no guardadas aún)
5. Admin puede:
   - Hacer clic en una clase → modal de edición (todos los campos)
   - Hacer clic en "+" en cualquier día → añadir clase única
   - Hacer clic en icono de copiar en una clase → marcarla, luego clic en otro día para pegarla
   - La clase pegada se puede editar antes de guardar
   - Eliminar cualquier clase del borrador
6. Botón "Guardar mes" → POST /api/shala/clases/batch con todas las clases del borrador
7. Confirmación: "X clases guardadas"
```

### Componentes

**`PlanificadorMensual`** (página principal)
- Estado local: `{ borradores: ClaseInput[], semanaInfo: { mes, año } }`
- Renderiza `PanelSemanaTipo` + `CalendarioMensual`
- Maneja lógica de aplicar plantilla, copiar/pegar, guardar

**`PanelSemanaTipo`**
- Lista de días (Lun–Dom)
- Para cada día: lista de entradas (hora inicio, hora fin, espacio, estilo, maestro)
- Botones: "+" añadir clase al día, "×" eliminar
- Botón "Aplicar al mes" al pie

**`CalendarioMensual`**
- Cuadrícula 7 columnas × N semanas
- Cada día: encabezado de fecha + lista de clases como pastillas de color
  - Verde claro (`sage`) = Jardín
  - Arena (`sand`) = Salón
- Cada pastilla: hora + nombre/estilo + icono copiar + icono eliminar
- Click en pastilla → abre `ModalEditarClase`
- Click en "+" del día → abre `ModalEditarClase` vacío

**`ModalEditarClase`**
- Campos: nombre, descripción, fecha, hora inicio, hora fin, espacio (select: Salón/Jardín), capacidad, estilo (select), maestro (select), tipo (regular/especial), precio especial
- Capacidad se auto-completa según espacio seleccionado (10 o 70), editable
- Botones: Guardar cambios (actualiza borrador local) / Cancelar

### Lógica de copy-paste

```ts
// Estado en PlanificadorMensual
const [copiando, setCopiando] = useState<ClaseInput | null>(null);

// Al hacer clic en copiar
onCopiar(clase) → setCopiando({ ...clase, id: undefined })

// Al hacer clic en un día con modo copia activo
onPegarEnDia(fecha) → {
  // Ajusta inicio/fin de la clase copiada a la fecha destino
  // Añade al borrador
  // Abre ModalEditarClase para edición inmediata
  // setCopiando(null)
}
```

---

## 4. Usuario — Calendario Mejorado

### Ruta: `/calendario` (existente, reescrita)

**Vista por semana con detalle de día:**

```
[← Sem anterior]  [Lun 14]  [Mar 15]  [Mié 16]  [Jue 17]  [Vie 18]  [Sáb 19]  [Dom 20]  [Sem siguiente →]

Al hacer clic en un día:
┌─────────────────────────────────────────────────────┐
│  Miércoles 16 de abril                              │
│                                                     │
│  07:00 – 08:00  Hatha Yoga · Ana García · Salón    │
│  ◉ 8 lugares disponibles          [Reservar]        │
│                                                     │
│  09:00 – 10:30  Vinyasa Flow · Carlos · Jardín     │
│  ◉ 45 lugares disponibles         [Reservar]        │
│                                                     │
│  18:00 – 19:00  Yin Yoga · Marifer · Salón         │
│  ✓ Ya reservada                   [Cancelar]        │
└─────────────────────────────────────────────────────┘
```

**Estados visuales por clase:**
- Disponible: badge verde + botón "Reservar"
- Llena: badge gris + "Sin lugares" (sin botón)
- Ya reservada por el usuario: badge azul + botón "Cancelar"

**Al reservar:**
- Verifica que el usuario tiene paquete activo con créditos
- POST /api/shala/reservas
- Actualiza el estado de la clase en pantalla sin recargar
- Toast: "Reserva confirmada para el Miércoles 16 a las 7:00am"

---

## 5. Usuario — Historial de Reservas

### Ruta: `/mis-reservas` (nueva)

Dos pestañas:

**Próximas:**
- Lista de reservas futuras ordenadas por fecha ascendente
- Cada fila: fecha, hora, nombre de clase, maestro, espacio
- Botón "Cancelar reserva" visible si faltan más de 2 horas para la clase
- Al cancelar: DELETE /api/shala/reservas/:id + devuelve crédito al paquete

**Historial:**
- Lista de reservas pasadas ordenadas por fecha descendente
- Solo informativo, sin acciones

### Navbar

Añadir "Mis Reservas" al Navbar de Shala junto a "Mis Paquetes".

---

## 6. Archivos a Crear / Modificar

| Archivo | Acción |
|---|---|
| `database/migrations/009_clases_espacio.sql` | Crear — ADD COLUMN espacio_tipo |
| `backend/src/routes/shala/clases.ts` | Modificar — POST /batch, espacio_tipo en create/update |
| `frontend-shala/app/admin/shala/calendario/page.tsx` | Crear — PlanificadorMensual |
| `frontend-shala/components/admin/shala/PanelSemanaTipo.tsx` | Crear |
| `frontend-shala/components/admin/shala/CalendarioMensual.tsx` | Crear |
| `frontend-shala/components/admin/shala/ModalEditarClase.tsx` | Crear |
| `frontend-shala/app/calendario/page.tsx` | Modificar — vista semanal con detalle por día |
| `frontend-shala/app/mis-reservas/page.tsx` | Crear — historial de reservas |
| `frontend-shala/components/ui/Navbar.tsx` | Modificar — añadir "Mis Reservas" |

---

## 7. Orden de Implementación

1. Migración SQL `009_clases_espacio.sql` + ejecutar en Supabase
2. Backend: `espacio_tipo` en create/update de clases + endpoint `/batch`
3. Admin: planificador mensual (PanelSemanaTipo + CalendarioMensual + ModalEditarClase)
4. Usuario: calendario mejorado con vista semanal y detalle por día
5. Usuario: página `/mis-reservas` con próximas e historial
6. Navbar: añadir "Mis Reservas"
7. Verificar build completo de frontend-shala
