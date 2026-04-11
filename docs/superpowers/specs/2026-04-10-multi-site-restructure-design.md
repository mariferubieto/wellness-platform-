# Multi-Site Restructure — Sub-proyecto 1: Separación del Repositorio

## Goal

Dividir el frontend monolítico actual en dos aplicaciones Next.js independientes desplegadas en dominios separados: `shalayoga.com` (app de yoga) y `marifer.com` (marca personal). El backend en Render y la base de datos en Supabase permanecen compartidos y sin cambios funcionales.

## Architecture

**Antes:**
```
wellness-platform/
├── frontend/     ← una sola app Next.js con todo
├── backend/
└── database/
```

**Después:**
```
wellness-platform/
├── frontend-shala/     ← shalayoga.com
├── frontend-marifer/   ← marifer.com
├── backend/            (sin cambios)
└── database/
```

Ambos frontends en el mismo repo GitHub. Vercel detecta el directorio raíz de cada proyecto y los despliega de forma independiente. Un push a `main` redespliega los dos.

## Tech Stack

- Next.js 14 (App Router) — ambos frontends
- Supabase Auth — clientes en Shala, solo admin en Marifer
- Express (Render) — backend compartido
- Vercel — dos proyectos separados, mismo repo
- Tailwind CSS + tokens de diseño compartidos por copia

---

## frontend-shala/ — shalayoga.com

### Rutas

| Ruta | Descripción |
|---|---|
| `/` | Landing: paquetes disponibles, próximas clases |
| `/(auth)/login` | Login de clientes |
| `/(auth)/registro` | Registro de nuevos clientes |
| `/calendario` | Calendario de clases con sistema de reserva |
| `/mis-paquetes` | Paquetes activos del usuario |
| `/perfil` | Perfil del cliente |
| `/pagos/[concepto]` | Flujos de pago (Stripe / MercadoPago) |
| `/admin` | Panel admin de Shala |
| `/admin/shala` | Gestión de clases, paquetes, maestros, estilos |
| `/admin/codigos` | Códigos de descuento |

### Archivos que vienen del frontend/ actual

Todo el contenido de `frontend/` se mueve a `frontend-shala/` como base. Las rutas de Marifer (`/ayurveda`, `/retiros`, `/contenido`, `/eventos`, y sus admin correspondientes) se eliminan de este proyecto.

### Navbar de Shala

Links internos: Calendario, Mis Paquetes, Mi Perfil. Sin enlace a marifer.com.

---

## frontend-marifer/ — marifer.com

### Rutas

| Ruta | Descripción |
|---|---|
| `/` | Landing de marca personal (quién es Marifer) |
| `/retiros` | Página de retiros + formulario de inscripción |
| `/ayurveda` | Diplomados, clases de cocina, mudras, cursos extras |
| `/contenido` | Biblioteca (blog, videos) |
| `/eventos` | Eventos y clases especiales + formulario |
| `/(auth)/login` | Login exclusivo para admin |
| `/(auth)/primer-acceso` | Primer acceso admin |
| `/admin` | Panel admin completo |
| `/admin/ayurveda` | Gestión de diplomados y cursos |
| `/admin/marifer` | Contenido del sitio, retiros, eventos |
| `/admin/crm` | Base de datos de leads y clientes |
| `/admin/codigos` | Códigos de descuento compartidos |

### Navbar de Marifer

Links: Retiros, Ayurveda, Biblioteca, Eventos — más un botón **"Shala →"** que abre `https://shalayoga.com` en una nueva pestaña.

### Nuevo: Componente LeadPopup

- Aparece después de 5 segundos en la primera visita
- Cookie `marifer_lead_shown` previene que vuelva a aparecer
- Campos: email (requerido), teléfono (opcional)
- Guarda en tabla `comunidad_leads` de Supabase vía backend
- No requiere login

### Nuevo: Geolocalización de visitantes

- Al cargar el sitio, llamada a la API pública `https://ipapi.co/json/`
- Guarda ciudad + país en `comunidad_leads` y en el evento de comportamiento
- Permite segmentar leads por ciudad para futuros retiros y talleres

---

## Sistema de diseño compartido

Los tokens visuales se **copian** (no se comparten por paquete) a cada proyecto. YAGNI: un paquete compartido añade complejidad sin beneficio real a esta escala.

**Archivos copiados a los dos proyectos:**
- `tailwind.config.ts` — paleta de colores, tipografía, border-radius
- `app/globals.css` — variables CSS, clases de utilidad (`.btn-wellness`, `.card-wellness`, etc.)
- `components/ui/` — Button, Input, FotoUpload y otros componentes base

**Paleta:**

| Token | Color | Uso |
|---|---|---|
| `beige` | `#F5F0E8` | Fondo principal |
| `tierra` | `#6B4A3A` | Texto principal |
| `sand` | `#C4A882` | Acentos, bordes |
| `sage` | `#7A9E7E` | Confirmaciones, estados activos |

**Tipografía de marca (Marifer):**
- SHALA: Playfair Display 900
- AYURVEDA: Josefin Sans 300, letter-spacing amplio
- RETIROS: Fredoka 400
- Biblioteca: EB Garamond 400

---

## Backend — Cambios mínimos

### CORS

Actualizar `ALLOWED_ORIGINS` en Render para incluir ambos dominios:

```
ALLOWED_ORIGINS=https://marifer.com,https://www.marifer.com,https://shalayoga.com,https://www.shalayoga.com,http://localhost:3000,http://localhost:3001
```

No hay cambios en rutas, servicios ni base de datos.

### Nueva ruta: POST /api/leads

Registra un lead del popup de Marifer:

```
POST /api/leads
Body: { email, telefono?, ciudad?, pais? }
Response: 201 { id, email }
```

### Nueva tabla: comunidad_leads

```sql
CREATE TABLE comunidad_leads (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email      text NOT NULL,
  telefono   text,
  ciudad     text,
  pais       text,
  fuente     text DEFAULT 'popup_marifer',
  created_at timestamptz DEFAULT now()
);
```

---

## Variables de entorno

### frontend-shala/ (.env.local)
```
NEXT_PUBLIC_API_URL=https://[render-service-url]
NEXT_PUBLIC_SUPABASE_URL=https://rsahtjffquqveshjalky.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=[anon key]
```

### frontend-marifer/ (.env.local)
```
NEXT_PUBLIC_API_URL=https://[render-service-url]
NEXT_PUBLIC_SUPABASE_URL=https://rsahtjffquqveshjalky.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=[anon key]
NEXT_PUBLIC_SHALA_URL=https://shalayoga.com
```

---

## Vercel — Configuración de dos proyectos

| Proyecto | Root Directory | Branch | Dominio |
|---|---|---|---|
| `shala` | `frontend-shala` | `main` | shalayoga.com |
| `marifer` | `frontend-marifer` | `main` | marifer.com |

Pasos tras el código:
1. En Vercel, crear proyecto nuevo → importar mismo repo → Root Directory: `frontend-marifer`
2. El proyecto `shala` existente actualiza su Root Directory de `frontend` a `frontend-shala`
3. Conectar dominios en cada proyecto una vez que apunten al DNS de Vercel

---

## npm workspaces — package.json raíz

```json
{
  "workspaces": [
    "frontend-shala",
    "frontend-marifer",
    "backend"
  ]
}
```

---

## Orden de implementación

1. Copiar `frontend/` → `frontend-shala/` y limpiar rutas de Marifer
2. Crear `frontend-marifer/` con Next.js, copiar design system, migrar rutas de Marifer
3. Actualizar `package.json` raíz (workspaces)
4. Actualizar CORS en backend + agregar ruta `/api/leads` y migración DB
5. Actualizar Navbar de Marifer (añadir enlace Shala)
6. Agregar `LeadPopup` a frontend-marifer
7. Verificar builds de los dos proyectos
8. Actualizar configuración de Vercel (root directories)
