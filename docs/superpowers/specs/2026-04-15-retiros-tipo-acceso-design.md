# Retiros — tipo_acceso + imagen

## Goal

Añadir `tipo_acceso: 'pago' | 'whatsapp'` a los retiros y mostrar `imagen_url` en los cards públicos. El CTA de la página de detalle se adapta al tipo: inscripción con MercadoPago (pago) o enlace directo a WhatsApp (whatsapp).

## Architecture

Sin nuevas rutas ni tablas. Una migración SQL añade `tipo_acceso` a `retiros`. El backend expone el campo en GET/POST/PATCH. El admin muestra y permite cambiar `tipo_acceso` inline. La página pública de detalle `/retiros/[id]` muestra un solo botón según el tipo.

## Tech Stack

Next.js 14 App Router · Express + Supabase · Tailwind CSS wellness tokens · TypeScript

---

## 1. Base de Datos — Migration `011_retiros_tipo_acceso.sql`

```sql
ALTER TABLE retiros
  ADD COLUMN IF NOT EXISTS tipo_acceso text
    CHECK (tipo_acceso IN ('pago', 'whatsapp'))
    DEFAULT 'pago';
```

---

## 2. Backend — `backend/src/services/retiros.service.ts` y `backend/src/routes/retiros/index.ts`

- `getRetiros()`: añadir `tipo_acceso` al `select`
- `getRetiroById()`: añadir `tipo_acceso` al `select`
- `createRetiro()`: aceptar `tipo_acceso` en el body y en el insert (default `'pago'`)
- `updateRetiro()`: aceptar `tipo_acceso` en el body
- `retiros/index.ts` POST: validar `tipo_acceso` si viene en el body (`'pago' | 'whatsapp'`)
- `retiros/index.ts` PATCH: validar `tipo_acceso` si viene en el body

---

## 3. Admin — `frontend-marifer/app/admin/marifer/page.tsx`

- Añadir `tipo_acceso: 'pago' | 'whatsapp'` a la interfaz `Retiro`
- En la lista de retiros, mostrar badge del tipo junto al precio
- Añadir `<select>` inline en cada item de la lista para cambiar `tipo_acceso` vía PATCH (sin formulario completo de edición)

---

## 4. RetiroCard — `frontend-marifer/components/marifer/RetiroCard.tsx`

- Añadir `imagen_url?: string` a la interfaz
- Si `imagen_url` existe: mostrar header con `<Image fill>` de Next.js en wrapper `relative h-40`
- El card mantiene su estructura actual (Link → `/retiros/[id]`)

---

## 5. Página de detalle — `frontend-marifer/app/retiros/[id]/page.tsx`

- Añadir `tipo_acceso: 'pago' | 'whatsapp'` a la interfaz `Retiro`
- `tipo_acceso === 'pago'`: mostrar solo botón "Inscribirme" → `/retiros/inscripcion?retiro_id=...&precio=...&nombre=...`
- `tipo_acceso === 'whatsapp'`: mostrar solo enlace "Contactar por WhatsApp" → `https://wa.me/52${NEXT_PUBLIC_WHATSAPP_MARIFER}?text=Hola, me interesa el retiro "${nombre}"`
- Eliminar la lógica dual actual (dos botones condicionados por `whatsapp_contacto`)

---

## 6. Archivos a Crear / Modificar

| Archivo | Acción |
|---|---|
| `database/migrations/011_retiros_tipo_acceso.sql` | Crear |
| `backend/src/services/retiros.service.ts` | Modificar — tipo_acceso en selects/insert/update |
| `backend/src/routes/retiros/index.ts` | Modificar — validación tipo_acceso en POST/PATCH |
| `frontend-marifer/app/admin/marifer/page.tsx` | Modificar — badge + select inline tipo_acceso |
| `frontend-marifer/components/marifer/RetiroCard.tsx` | Modificar — imagen_url |
| `frontend-marifer/app/retiros/[id]/page.tsx` | Modificar — CTA adaptado por tipo_acceso |

---

## 7. Orden de Implementación

1. Migración SQL `011`
2. Backend: service + routes
3. Admin: badge + inline select
4. RetiroCard: imagen_url
5. Detalle `/retiros/[id]`: CTA adaptado
