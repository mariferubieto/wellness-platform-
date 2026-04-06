-- database/migrations/004_marifer_schema.sql
-- Run this in Supabase SQL Editor after 003_ayurveda_schema.sql

-- retiros
CREATE TABLE IF NOT EXISTS retiros (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre            text NOT NULL,
  descripcion       text,
  lugar             text,
  incluye           text,
  precio            numeric(10,2) NOT NULL CHECK (precio >= 0),
  fecha_inicio      date,
  fecha_fin         date,
  imagen_url        text,
  whatsapp_contacto text,
  activo            boolean DEFAULT true,
  created_at        timestamptz DEFAULT now()
);

-- inscripciones_retiro
CREATE TABLE IF NOT EXISTS inscripciones_retiro (
  id                          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                     uuid REFERENCES users(id) ON DELETE SET NULL,
  retiro_id                   uuid REFERENCES retiros(id) ON DELETE CASCADE,
  nombre_completo             text NOT NULL,
  fecha_nacimiento            date,
  whatsapp                    text NOT NULL,
  email                       text NOT NULL,
  instagram                   text,
  ciudad                      text,
  razon                       text,
  restricciones_alimenticias  text,
  pago_id                     uuid REFERENCES pagos(id) ON DELETE SET NULL,
  estado_pago                 text NOT NULL DEFAULT 'pendiente' CHECK (estado_pago IN ('pendiente', 'completado', 'fallido')),
  created_at                  timestamptz DEFAULT now()
);

-- eventos
CREATE TABLE IF NOT EXISTS eventos (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre            text NOT NULL,
  descripcion       text,
  lugar             text,
  flyer_url         text,
  precio            numeric(10,2),
  fecha             timestamptz,
  tipo_acceso       text NOT NULL DEFAULT 'pago' CHECK (tipo_acceso IN ('pago', 'whatsapp', 'gratis')),
  whatsapp_contacto text,
  activo            boolean DEFAULT true,
  created_at        timestamptz DEFAULT now()
);

-- inscripciones_evento
CREATE TABLE IF NOT EXISTS inscripciones_evento (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          uuid REFERENCES users(id) ON DELETE SET NULL,
  evento_id        uuid REFERENCES eventos(id) ON DELETE CASCADE,
  nombre_completo  text NOT NULL,
  email            text NOT NULL,
  whatsapp         text NOT NULL,
  pago_id          uuid REFERENCES pagos(id) ON DELETE SET NULL,
  estado_pago      text NOT NULL DEFAULT 'pendiente' CHECK (estado_pago IN ('pendiente', 'completado', 'fallido')),
  created_at       timestamptz DEFAULT now()
);

-- RLS
ALTER TABLE retiros ENABLE ROW LEVEL SECURITY;
ALTER TABLE inscripciones_retiro ENABLE ROW LEVEL SECURITY;
ALTER TABLE eventos ENABLE ROW LEVEL SECURITY;
ALTER TABLE inscripciones_evento ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service_role_all_retiros" ON retiros FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_all_inscripciones_retiro" ON inscripciones_retiro FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_all_eventos" ON eventos FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_all_inscripciones_evento" ON inscripciones_evento FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_retiros_activo ON retiros(activo);
CREATE INDEX IF NOT EXISTS idx_retiros_fecha ON retiros(fecha_inicio);
CREATE INDEX IF NOT EXISTS idx_inscripciones_retiro_id ON inscripciones_retiro(retiro_id);
CREATE INDEX IF NOT EXISTS idx_eventos_activo ON eventos(activo);
CREATE INDEX IF NOT EXISTS idx_eventos_fecha ON eventos(fecha);
CREATE INDEX IF NOT EXISTS idx_inscripciones_evento_id ON inscripciones_evento(evento_id);
