-- database/migrations/002_shala_schema.sql
-- Run this in Supabase SQL Editor after 001_core_schema.sql

-- Enums
CREATE TYPE clase_tipo AS ENUM ('regular', 'especial');
CREATE TYPE reserva_estado AS ENUM ('activa', 'cancelada', 'asistio');
CREATE TYPE pago_estado AS ENUM ('pendiente', 'aprobado', 'rechazado', 'reembolsado');

-- maestros
CREATE TABLE IF NOT EXISTS maestros (
  id       uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id  uuid REFERENCES users(id) ON DELETE CASCADE,
  bio      text,
  foto_url text,
  activo   boolean DEFAULT true
);

-- paquetes_catalogo
CREATE TABLE IF NOT EXISTS paquetes_catalogo (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre        text NOT NULL,
  num_clases    integer NOT NULL CHECK (num_clases > 0),
  precio        numeric(10,2) NOT NULL CHECK (precio >= 0),
  vigencia_dias integer DEFAULT 30 CHECK (vigencia_dias > 0),
  activo        boolean DEFAULT true,
  created_at    timestamptz DEFAULT now()
);

-- pagos (needed before paquetes_usuario)
CREATE TABLE IF NOT EXISTS pagos (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id            uuid REFERENCES users(id) ON DELETE SET NULL,
  monto              numeric(10,2) NOT NULL,
  moneda             text DEFAULT 'MXN',
  proveedor          text DEFAULT 'mercadopago',
  referencia_externa text,
  estado             pago_estado DEFAULT 'pendiente',
  concepto           text,
  concepto_id        uuid,
  metadata           jsonb,
  created_at         timestamptz DEFAULT now()
);

-- paquetes_usuario
CREATE TABLE IF NOT EXISTS paquetes_usuario (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          uuid REFERENCES users(id) ON DELETE CASCADE,
  paquete_id       uuid REFERENCES paquetes_catalogo(id),
  clases_restantes integer NOT NULL CHECK (clases_restantes >= 0),
  expira_en        timestamptz NOT NULL,
  pago_id          uuid REFERENCES pagos(id) ON DELETE SET NULL,
  activo           boolean DEFAULT true,
  created_at       timestamptz DEFAULT now()
);

-- clases
CREATE TABLE IF NOT EXISTS clases (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  maestro_id      uuid REFERENCES maestros(id) ON DELETE SET NULL,
  nombre          text NOT NULL,
  descripcion     text,
  inicio          timestamptz NOT NULL,
  fin             timestamptz NOT NULL,
  capacidad       integer NOT NULL CHECK (capacidad > 0),
  cupo_actual     integer DEFAULT 0 CHECK (cupo_actual >= 0),
  tipo            clase_tipo DEFAULT 'regular',
  precio_especial numeric(10,2),
  activo          boolean DEFAULT true
);

-- reservas
CREATE TABLE IF NOT EXISTS reservas (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id            uuid REFERENCES users(id) ON DELETE CASCADE,
  clase_id           uuid REFERENCES clases(id) ON DELETE CASCADE,
  paquete_usuario_id uuid REFERENCES paquetes_usuario(id) ON DELETE SET NULL,
  estado             reserva_estado DEFAULT 'activa',
  credito_devuelto   boolean DEFAULT false,
  created_at         timestamptz DEFAULT now(),
  UNIQUE (user_id, clase_id)
);

-- RLS
ALTER TABLE maestros ENABLE ROW LEVEL SECURITY;
ALTER TABLE paquetes_catalogo ENABLE ROW LEVEL SECURITY;
ALTER TABLE pagos ENABLE ROW LEVEL SECURITY;
ALTER TABLE paquetes_usuario ENABLE ROW LEVEL SECURITY;
ALTER TABLE clases ENABLE ROW LEVEL SECURITY;
ALTER TABLE reservas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service_role_all_maestros" ON maestros FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_all_paquetes_catalogo" ON paquetes_catalogo FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_all_pagos" ON pagos FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_all_paquetes_usuario" ON paquetes_usuario FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_all_clases" ON clases FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_all_reservas" ON reservas FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_paquetes_usuario_user ON paquetes_usuario(user_id);
CREATE INDEX IF NOT EXISTS idx_paquetes_usuario_activo ON paquetes_usuario(user_id, activo, expira_en);
CREATE INDEX IF NOT EXISTS idx_clases_inicio ON clases(inicio);
CREATE INDEX IF NOT EXISTS idx_clases_tipo ON clases(tipo);
CREATE INDEX IF NOT EXISTS idx_reservas_user ON reservas(user_id);
CREATE INDEX IF NOT EXISTS idx_reservas_clase ON reservas(clase_id);
CREATE INDEX IF NOT EXISTS idx_pagos_user ON pagos(user_id);
