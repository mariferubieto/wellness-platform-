# Plataforma de Bienestar — Diseño Completo
**Fecha:** 2026-04-04  
**Estado:** Aprobado por usuario

---

## Resumen ejecutivo

Plataforma web completa de bienestar con tres marcas bajo un mismo sistema: **SHALA** (yoga presencial), **MANALI AYURVEDA** (diplomados online) y **MARIFER** (retiros y eventos). Incluye módulo de contenido, CRM con captura de leads, panel administrador y sistema de pagos con Mercado Pago.

El proyecto no tiene código base existente. Los datos de usuarios actuales viven en **Nessty** y se migrarán solo los perfiles (nombre, email, teléfono). El sistema arranca desde cero con arquitectura modular y preparada para app móvil futura.

---

## Stack tecnológico

| Capa | Tecnología | Plataforma de deploy |
|---|---|---|
| Frontend | Next.js 14 (App Router) | Vercel |
| Backend | Node.js + Express.js | Railway |
| Base de datos | PostgreSQL | Supabase |
| Autenticación | Supabase Auth + JWT | Supabase |
| Storage (imágenes/flyers) | Supabase Storage | Supabase |
| Pagos | Mercado Pago únicamente | — |
| Idioma | Español | — |

**Costo estimado de operación inicial:** ~$20–40 USD/mes (Vercel Free + Railway Starter + Supabase Free/Pro).

---

## Diseño visual

- **Estilo:** Minimalista wellness, mobile-first
- **Paleta:** Beige cálido (`#F9F5EF`), verde salvia (`#7A9A78`), arena dorada (`#C4A882`), tierra oscura (`#2C2418`), verde menta suave (`#EAF0E7`), beige lino (`#E8DDD0`)
- **Tipografía:** Georgia (serif) para títulos + Helvetica Neue (sans-serif) para cuerpo
- **Logo:** SHALA YOGA STUDIO — serif con línea horizontal decorativa (archivo: `by manali-5.png`)
- **Tono:** Cálido, natural, botánico, elegante sin ser recargado

---

## Fases de construcción

El proyecto se construye en 6 fases secuenciales. Cada fase entrega código funcional y deployable antes de iniciar la siguiente.

| Fase | Módulo | Contenido |
|---|---|---|
| 1 | **Core** | Auth, perfiles, CRM, admin base, migración Nessty |
| 2 | **SHALA** | Paquetes, calendario, reservas, maestros |
| 3 | **MANALI AYURVEDA** | Diplomados, checkout, generaciones, exportación |
| 4 | **MARIFER** | Retiros, eventos, formularios post-pago, exportación |
| 5 | **Contenido** | Blog, vlog, mini clases, newsletter |
| 6 | **Pagos + CRM avanzado** | Mercado Pago completo, analytics, tracking de comportamiento |

---

## Arquitectura del sistema

```
┌─────────────────────────────────────────────────────┐
│                    VERCEL (Frontend)                  │
│  Next.js 14 (App Router)                             │
│  ├── /shala        → módulo yoga                     │
│  ├── /ayurveda     → módulo diplomados               │
│  ├── /retiros      → módulo retiros & eventos        │
│  ├── /contenido    → blog, vlog, newsletter          │
│  └── /admin        → panel administrador             │
└──────────────────┬──────────────────────────────────┘
                   │ HTTPS / REST
┌──────────────────▼──────────────────────────────────┐
│                  RAILWAY (Backend)                    │
│  Node.js + Express.js                                │
│  ├── /api/auth          → registro, login, JWT       │
│  ├── /api/users         → perfiles, CRM, leads       │
│  ├── /api/shala         → clases, paquetes, reservas │
│  ├── /api/ayurveda      → diplomados, generaciones   │
│  ├── /api/retiros       → retiros, eventos           │
│  ├── /api/contenido     → blog, vlog, newsletter     │
│  ├── /api/pagos         → Mercado Pago webhooks      │
│  └── /api/admin         → dashboard, exportaciones  │
└──────────────────┬──────────────────────────────────┘
                   │
┌──────────────────▼──────────────────────────────────┐
│                 SUPABASE (Datos)                      │
│  PostgreSQL + Supabase Auth + Storage                │
│  ├── Auth → maneja sesiones y tokens JWT             │
│  ├── DB   → todas las tablas del negocio             │
│  └── Storage → imágenes, flyers, logos               │
└─────────────────────────────────────────────────────┘
```

---

## Base de datos — esquema completo

### CORE

**`users`**
```
id               uuid PRIMARY KEY
nombre           text NOT NULL
email            text UNIQUE NOT NULL
telefono         text
fecha_nacimiento date
password_hash    text
rol              enum('user', 'admin', 'maestro') DEFAULT 'user'
fuente           enum('shala', 'ayurveda', 'retiro', 'evento', 'contenido', 'directo')
tags             text[]
created_at       timestamptz DEFAULT now()
```

**`leads`**
```
id               uuid PRIMARY KEY
nombre           text
email            text
telefono         text
fecha_nacimiento date
fuente           enum('shala', 'ayurveda', 'retiro', 'evento', 'newsletter', 'checkout_abandonado')
intereses        text[]
estado           enum('nuevo', 'contactado', 'convertido', 'inactivo') DEFAULT 'nuevo'
ultimo_contacto  timestamptz
user_id          uuid REFERENCES users(id) NULL  -- si se convierte en usuario
created_at       timestamptz DEFAULT now()
```

**`behavior_events`**
```
id               uuid PRIMARY KEY
user_id          uuid REFERENCES users(id) NULL
lead_id          uuid REFERENCES leads(id) NULL
tipo             text  -- 'page_view', 'click', 'checkout_iniciado', 'video_visto', etc.
pagina           text
accion           text
metadata         jsonb
created_at       timestamptz DEFAULT now()
```

---

### SHALA — YOGA

**`maestros`**
```
id               uuid PRIMARY KEY
user_id          uuid REFERENCES users(id)
bio              text
foto_url         text
activo           boolean DEFAULT true
```

**`paquetes_catalogo`**
```
id               uuid PRIMARY KEY
nombre           text NOT NULL  -- ej: "Paquete 10 clases"
num_clases       integer NOT NULL
precio           numeric(10,2) NOT NULL
vigencia_dias    integer DEFAULT 30
activo           boolean DEFAULT true
created_at       timestamptz DEFAULT now()
```

**`paquetes_usuario`**
```
id               uuid PRIMARY KEY
user_id          uuid REFERENCES users(id)
paquete_id       uuid REFERENCES paquetes_catalogo(id)
clases_restantes integer NOT NULL
expira_en        timestamptz NOT NULL
pago_id          uuid REFERENCES pagos(id)
activo           boolean DEFAULT true
created_at       timestamptz DEFAULT now()
```
*Regla: si hay múltiples paquetes activos, se consume el que expira primero.*

**`clases`**
```
id               uuid PRIMARY KEY
maestro_id       uuid REFERENCES maestros(id)
nombre           text NOT NULL
descripcion      text
inicio           timestamptz NOT NULL
fin              timestamptz NOT NULL
capacidad        integer NOT NULL
cupo_actual      integer DEFAULT 0
tipo             enum('regular', 'especial') DEFAULT 'regular'
precio_especial  numeric(10,2) NULL  -- solo si tipo='especial'
activo           boolean DEFAULT true
```

**`reservas`**
```
id               uuid PRIMARY KEY
user_id          uuid REFERENCES users(id)
clase_id         uuid REFERENCES clases(id)
paquete_usuario_id uuid REFERENCES paquetes_usuario(id)
estado           enum('activa', 'cancelada', 'asistio') DEFAULT 'activa'
credito_devuelto boolean DEFAULT false
created_at       timestamptz DEFAULT now()
```

---

### MANALI AYURVEDA

**`diplomados`**
```
id               uuid PRIMARY KEY
nombre           text NOT NULL
descripcion      text
temario          jsonb  -- array de módulos/temas
calendario       jsonb  -- fechas de sesiones
precio           numeric(10,2) NOT NULL
generacion       text NOT NULL  -- ej: "Generación 2026-A"
activo           boolean DEFAULT true
created_at       timestamptz DEFAULT now()
```

**`inscripciones_diplomado`**
```
id               uuid PRIMARY KEY
user_id          uuid REFERENCES users(id) NULL  -- nullable: no requiere cuenta
diplomado_id     uuid REFERENCES diplomados(id)
nombre_completo  text NOT NULL
fecha_nacimiento date
whatsapp         text NOT NULL
email_gmail      text NOT NULL
razon            text
pago_id          uuid REFERENCES pagos(id)
estado_pago      enum('pendiente', 'completado', 'fallido') DEFAULT 'pendiente'
created_at       timestamptz DEFAULT now()
```

---

### MARIFER — RETIROS & EVENTOS

**`retiros`**
```
id               uuid PRIMARY KEY
nombre           text NOT NULL
descripcion      text
lugar            text
incluye          text
precio           numeric(10,2) NOT NULL
fecha_inicio     date
fecha_fin        date
imagen_url       text
whatsapp_contacto text  -- número para botón de WhatsApp
activo           boolean DEFAULT true
created_at       timestamptz DEFAULT now()
```

**`inscripciones_retiro`**
```
id               uuid PRIMARY KEY
user_id          uuid REFERENCES users(id) NULL
retiro_id        uuid REFERENCES retiros(id)
nombre_completo  text NOT NULL
fecha_nacimiento date
whatsapp         text NOT NULL
email            text NOT NULL
instagram        text
ciudad           text
razon            text
restricciones_alimenticias text
pago_id          uuid REFERENCES pagos(id)
estado_pago      enum('pendiente', 'completado', 'fallido') DEFAULT 'pendiente'
created_at       timestamptz DEFAULT now()
```

**`eventos`**
```
id               uuid PRIMARY KEY
nombre           text NOT NULL
descripcion      text
lugar            text
flyer_url        text
precio           numeric(10,2) NULL  -- NULL si es gratuito o solo por contacto
fecha            timestamptz
tipo_acceso      enum('pago', 'whatsapp', 'gratis') DEFAULT 'pago'
whatsapp_contacto text
activo           boolean DEFAULT true
created_at       timestamptz DEFAULT now()
```

**`inscripciones_evento`**
```
id               uuid PRIMARY KEY
user_id          uuid REFERENCES users(id) NULL
evento_id        uuid REFERENCES eventos(id)
nombre_completo  text NOT NULL
email            text NOT NULL
whatsapp         text NOT NULL
pago_id          uuid REFERENCES pagos(id) NULL
created_at       timestamptz DEFAULT now()
```

---

### CONTENIDO

**`posts`**
```
id               uuid PRIMARY KEY
titulo           text NOT NULL
slug             text UNIQUE NOT NULL
contenido        text NOT NULL
imagen_url       text
autor_id         uuid REFERENCES users(id)
tags             text[]
publicado        boolean DEFAULT false
created_at       timestamptz DEFAULT now()
```

**`videos`**
```
id               uuid PRIMARY KEY
titulo           text NOT NULL
descripcion      text
url_video        text NOT NULL  -- YouTube/Vimeo embed URL
tipo             enum('vlog', 'mini_clase')
gratis           boolean DEFAULT true
thumbnail_url    text
publicado        boolean DEFAULT false
created_at       timestamptz DEFAULT now()
```

**`newsletter_suscriptores`**
```
id               uuid PRIMARY KEY
email            text UNIQUE NOT NULL
nombre           text
activo           boolean DEFAULT true
fuente           text  -- página desde donde se suscribió
created_at       timestamptz DEFAULT now()
```

---

### PAGOS

**`pagos`**
```
id               uuid PRIMARY KEY
user_id          uuid REFERENCES users(id) NULL
monto            numeric(10,2) NOT NULL
moneda           text DEFAULT 'MXN'
proveedor        text DEFAULT 'mercadopago'
referencia_externa text  -- ID de Mercado Pago
estado           enum('pendiente', 'aprobado', 'rechazado', 'reembolsado') DEFAULT 'pendiente'
concepto         text  -- 'paquete_shala', 'diplomado', 'retiro', 'evento'
concepto_id      uuid  -- ID del item comprado
metadata         jsonb
created_at       timestamptz DEFAULT now()
```

---

## Lógica de negocio — SHALA

### Paquetes y créditos
- Al comprar → crear `paquetes_usuario` con `clases_restantes = num_clases` y `expira_en = now() + vigencia_dias`
- Si el usuario tiene múltiples paquetes activos → consumir el que expira primero (`ORDER BY expira_en ASC`)
- Un paquete vencido no puede usarse aunque tenga créditos restantes
- Al reservar → decrementar `clases_restantes` en 1 + incrementar `cupo_actual` de la clase en 1

### Reservas y cancelaciones
- Solo se puede reservar si `cupo_actual < capacidad` y el usuario tiene paquete activo con créditos
- **Cancelación válida (≥ 2 horas antes del inicio):** `estado = 'cancelada'`, `credito_devuelto = true`, incrementar `clases_restantes` + decrementar `cupo_actual`
- **Cancelación tardía (< 2 horas antes):** `estado = 'cancelada'`, `credito_devuelto = false`, solo decrementar `cupo_actual`
- No se puede cancelar una clase que ya ocurrió

### Vista del usuario
- **Calendario** — todas las clases activas futuras (regulares + especiales)
- **Mis paquetes** — paquetes activos con créditos restantes y fecha de expiración
- **Clases especiales** — listado separado con precio y botón de compra directa (pago individual vía Mercado Pago, **no** se pueden reservar con créditos de paquete)

---

## Roles y permisos

| Rol | Acceso |
|---|---|
| `user` | Perfil, historial de compras, reservas, calendario, paquetes activos, clases especiales |
| `maestro` | Sus clases programadas, lista de alumnos por clase |
| `admin` | Panel completo: usuarios, ventas, clases, diplomados, retiros, eventos, CRM, exportaciones |

---

## Flujos de usuario

### SHALA
```
Registro/Login
  → Ver paquetes → Pagar con Mercado Pago
  → Paquete activo visible en "Mis paquetes"
  → Abrir calendario → Seleccionar clase → Reservar (−1 crédito)
  → Confirmación
  → Cancelar con +2h → recupera crédito
  → Cancelar con <2h → pierde crédito
```

### MANALI AYURVEDA
```
Página pública del diplomado (sin login requerido)
  → Ver descripción + temario + calendario
  → "Inscribirme" → Checkout Mercado Pago (pago único o MSI)
  → Pago exitoso → Formulario: nombre, fecha de nacimiento, WhatsApp, Gmail, razón
  → Datos guardados en generación
  → Admin exporta Excel por generación
```

### MARIFER — Retiro
```
Página pública del retiro
  → "Pagar" → Checkout Mercado Pago
  → Pago exitoso → Formulario: nombre, fecha de nacimiento, WhatsApp, email, Instagram, ciudad, razón, restricciones alimenticias
  → "Contactar por WhatsApp" → abre wa.me con mensaje predefinido
  → Admin ve lista completa de respuestas + exporta Excel
```

### MARIFER — Evento
```
Página pública del evento (con flyer)
  → Si tiene costo: Checkout Mercado Pago → Formulario: nombre, email, WhatsApp
  → Si es por contacto: botón WhatsApp directo
  → Admin ve lista de inscritos + exporta Excel
```

---

## Panel Administrador

| Sección | Funcionalidades |
|---|---|
| **Dashboard** | Total usuarios, ventas del mes, clases activas, próximos eventos |
| **SHALA** | Gestionar clases, horarios, maestros, capacidad; ver asistencia; lista de alumnos; lista de leads SHALA; exportar ambas |
| **MANALI** | Diplomados activos; alumnos por generación; exportar Excel por generación |
| **MARIFER** | Crear/editar retiros y eventos; lista completa de respuestas por formulario; exportar Excel |
| **Contenido** | Posts (crear/editar/publicar); videos; suscriptores newsletter |
| **CRM** | Todos los contactos (clientes + leads); filtros por fuente, intereses, nivel de interacción; exportar todo a Excel |
| **Cumpleaños** | Usuarios con cumpleaños en el mes actual |

---

## API REST — endpoints completos

### Auth
```
POST   /api/auth/register          → crear usuario
POST   /api/auth/login             → obtener JWT
POST   /api/auth/logout
GET    /api/auth/me                → perfil del usuario autenticado
```

### Usuarios
```
GET    /api/users/:id              → perfil
PATCH  /api/users/:id              → editar perfil
GET    /api/users/:id/paquetes     → paquetes activos
GET    /api/users/:id/reservas     → historial de reservas
GET    /api/users/:id/compras      → historial de compras
```

### SHALA
```
GET    /api/shala/clases           → calendario de clases (con filtros)
POST   /api/shala/clases           → crear clase (admin)
PATCH  /api/shala/clases/:id       → editar clase (admin)
DELETE /api/shala/clases/:id       → eliminar clase (admin)

GET    /api/shala/paquetes         → catálogo de paquetes
POST   /api/shala/paquetes/comprar → iniciar compra de paquete

POST   /api/shala/reservas                  → crear reserva (usa crédito de paquete, solo clases regulares)
DELETE /api/shala/reservas/:id             → cancelar reserva
POST   /api/shala/clases-especiales/comprar → compra individual de clase especial (Mercado Pago)

GET    /api/shala/maestros         → lista de maestros
POST   /api/shala/maestros         → crear maestro (admin)

GET    /api/admin/shala/alumnos    → todos los alumnos (admin)
GET    /api/admin/shala/leads      → leads SHALA (admin)
GET    /api/admin/exportar/shala-alumnos
GET    /api/admin/exportar/shala-leads
```

### MANALI AYURVEDA
```
GET    /api/ayurveda/diplomados        → diplomados activos (público)
GET    /api/ayurveda/diplomados/:id    → detalle de diplomado (público)
POST   /api/ayurveda/diplomados        → crear diplomado (admin)
PATCH  /api/ayurveda/diplomados/:id    → editar (admin)

POST   /api/ayurveda/inscripciones     → inscripción post-pago
GET    /api/admin/ayurveda/alumnos     → alumnos por generación (admin)
GET    /api/admin/exportar/ayurveda/:generacion
```

### MARIFER
```
GET    /api/retiros                    → retiros activos (público)
GET    /api/retiros/:id                → detalle (público)
POST   /api/retiros                    → crear (admin)
PATCH  /api/retiros/:id                → editar (admin)
POST   /api/retiros/inscripciones      → inscripción post-pago
GET    /api/admin/retiros/:id/inscritos
GET    /api/admin/exportar/retiro/:id

GET    /api/eventos                    → eventos activos (público)
GET    /api/eventos/:id                → detalle (público)
POST   /api/eventos                    → crear (admin)
PATCH  /api/eventos/:id                → editar (admin)
POST   /api/eventos/inscripciones      → inscripción
GET    /api/admin/eventos/:id/inscritos
GET    /api/admin/exportar/evento/:id
```

### Contenido
```
GET    /api/contenido/posts            → posts publicados (público)
GET    /api/contenido/posts/:slug      → post individual (público)
POST   /api/contenido/posts            → crear post (admin)
PATCH  /api/contenido/posts/:id        → editar (admin)

GET    /api/contenido/videos           → videos publicados (público)
POST   /api/contenido/videos           → crear video (admin)

POST   /api/newsletter/suscribir       → suscribirse (público)
DELETE /api/newsletter/cancelar        → darse de baja
GET    /api/admin/newsletter/suscriptores
```

### Pagos
```
POST   /api/pagos/mercadopago/crear    → crear preferencia de pago
POST   /api/pagos/mercadopago/webhook  → recibir notificaciones (público, sin auth)
GET    /api/pagos/:id                  → estado de pago
```

### Admin general
```
GET    /api/admin/dashboard            → métricas generales
GET    /api/admin/crm                  → todos los contactos + leads
GET    /api/admin/crm/exportar
GET    /api/admin/cumpleanos           → usuarios con cumpleaños este mes
GET    /api/admin/exportar/:modulo     → exportación genérica a Excel
```

Todos los endpoints `/api/admin/*` requieren JWT con `rol = 'admin'`.  
Los endpoints `/api/shala/maestros` (GET propio) requieren `rol = 'maestro'` o `'admin'`.  
Los endpoints públicos (diplomados, retiros, eventos, newsletter/suscribir, webhook) no requieren autenticación.

---

## CRM y captura de leads

- **Usuarios registrados** → guardados en `users`
- **Formularios sin pago completo** → guardados en `leads`
- **Checkout abandonado** → capturado como lead con `fuente = 'checkout_abandonado'` al iniciar el proceso de pago
- **Newsletter** → guardado en `newsletter_suscriptores` y también como `lead` si no es usuario
- **Conversión** → al registrarse un lead existente, se vincula `leads.user_id`

### Tags dinámicos de interés
Asignados automáticamente según comportamiento:
- Visitó `/shala` → tag `yoga`
- Visitó `/ayurveda` → tag `ayurveda`
- Visitó `/retiros` → tag `retiros`
- Compró paquete → tag `alumna_shala`
- Se inscribió a diplomado → tag `alumna_ayurveda`

---

## Migración de datos (Nessty)

- **Qué se migra:** nombre completo, email, teléfono de usuarios existentes
- **Qué NO se migra:** historial de clases, paquetes anteriores, asistencia
- **Mecanismo:** script de importación desde Excel/CSV exportado de Nessty
- **Al primer login:** el usuario crea su contraseña (flujo "primer acceso")
- Los usuarios migrados tienen `fuente = 'migracion_nessty'` en su perfil

---

## Instrucciones de deploy (resumen)

1. **Comprar dominio** (ej: `shala.mx` o `manalibienestar.com`) en Namecheap o GoDaddy (~$12 USD/año)
2. **Crear cuenta Supabase** en supabase.com → nuevo proyecto → copiar URL y claves
3. **Crear cuenta Railway** en railway.app → nuevo proyecto → conectar repositorio GitHub
4. **Crear cuenta Vercel** en vercel.com → importar repositorio → conectar dominio
5. **Cuenta Mercado Pago** → obtener credenciales de API (Access Token)
6. **Variables de entorno** → configurar en Railway (backend) y Vercel (frontend) con las claves de Supabase y Mercado Pago
7. **Ejecutar migraciones** de base de datos en Supabase
8. **Correr script de migración** de usuarios desde Nessty

El repositorio incluirá un archivo `.env.example` con todas las variables requeridas y un `README.md` con instrucciones paso a paso.
