-- database/migrations/003_ayurveda_schema.sql
-- Run this in Supabase SQL Editor after 002_shala_schema.sql

-- diplomados
CREATE TABLE IF NOT EXISTS diplomados (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre      text NOT NULL,
  descripcion text,
  temario     jsonb,           -- array de strings: módulos o temas
  calendario  jsonb,           -- array de strings: fechas de sesiones
  precio      numeric(10,2) NOT NULL CHECK (precio >= 0),
  generacion  text NOT NULL,   -- ej: "Generación 2026-A"
  activo      boolean DEFAULT true,
  created_at  timestamptz DEFAULT now()
);

-- inscripciones_diplomado
CREATE TABLE IF NOT EXISTS inscripciones_diplomado (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          uuid REFERENCES users(id) ON DELETE SET NULL,  -- nullable: no requiere cuenta
  diplomado_id     uuid REFERENCES diplomados(id) ON DELETE CASCADE,
  nombre_completo  text NOT NULL,
  fecha_nacimiento date,
  whatsapp         text NOT NULL,
  email_gmail      text NOT NULL,
  razon            text,
  pago_id          uuid REFERENCES pagos(id) ON DELETE SET NULL,
  estado_pago      text NOT NULL DEFAULT 'pendiente' CHECK (estado_pago IN ('pendiente', 'completado', 'fallido')),
  created_at       timestamptz DEFAULT now()
);

-- RLS
ALTER TABLE diplomados ENABLE ROW LEVEL SECURITY;
ALTER TABLE inscripciones_diplomado ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service_role_all_diplomados" ON diplomados
  FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "service_role_all_inscripciones_diplomado" ON inscripciones_diplomado
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_diplomados_activo ON diplomados(activo);
CREATE INDEX IF NOT EXISTS idx_diplomados_generacion ON diplomados(generacion);
CREATE INDEX IF NOT EXISTS idx_inscripciones_diplomado_id ON inscripciones_diplomado(diplomado_id);
CREATE INDEX IF NOT EXISTS idx_inscripciones_generacion ON inscripciones_diplomado(diplomado_id, created_at);
