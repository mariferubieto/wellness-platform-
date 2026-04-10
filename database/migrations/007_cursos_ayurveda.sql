-- database/migrations/007_cursos_ayurveda.sql
-- Run this in Supabase SQL Editor

CREATE TABLE IF NOT EXISTS cursos_ayurveda (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tipo        text NOT NULL CHECK (tipo IN ('cocina', 'mudras', 'extras')),
  nombre      text NOT NULL,
  descripcion text,
  temario     jsonb,           -- array de strings: temas o módulos
  fechas      jsonb,           -- array de strings: fechas/horarios
  precio      numeric(10,2) NOT NULL DEFAULT 0 CHECK (precio >= 0),
  foto_url    text,
  cupo_maximo integer,
  activo      boolean DEFAULT true,
  created_at  timestamptz DEFAULT now()
);

ALTER TABLE cursos_ayurveda ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service_role_all_cursos_ayurveda" ON cursos_ayurveda
  FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_cursos_ayurveda_tipo ON cursos_ayurveda(tipo);
CREATE INDEX IF NOT EXISTS idx_cursos_ayurveda_activo ON cursos_ayurveda(activo);
