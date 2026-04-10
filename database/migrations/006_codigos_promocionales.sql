-- Migration 006: Add nombre to maestros, add codigos_promocionales

-- Add nombre column to maestros so teachers don't need a user account
ALTER TABLE maestros ADD COLUMN IF NOT EXISTS nombre text;

-- codigos_promocionales
CREATE TABLE IF NOT EXISTS codigos_promocionales (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo           text UNIQUE NOT NULL,
  descripcion      text,
  descuento_tipo   text NOT NULL CHECK (descuento_tipo IN ('porcentaje', 'monto_fijo')),
  descuento_valor  numeric(10,2) NOT NULL CHECK (descuento_valor > 0),
  aplicable_a      text[] DEFAULT ARRAY['paquete_shala','diplomado','retiro','evento'],
  activo           boolean DEFAULT true,
  usos_maximos     integer,
  usos_actuales    integer DEFAULT 0,
  expira_en        timestamptz,
  created_at       timestamptz DEFAULT now()
);
