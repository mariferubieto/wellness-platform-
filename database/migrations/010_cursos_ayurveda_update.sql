-- 010: add tipo_acceso to cursos_ayurveda, rename mudras→pranayamas, create inscripciones_cursos

-- 1. Agregar tipo_acceso a cursos_ayurveda
ALTER TABLE cursos_ayurveda
  ADD COLUMN IF NOT EXISTS tipo_acceso text
    CHECK (tipo_acceso IN ('pago', 'whatsapp', 'gratis'))
    DEFAULT 'pago';

-- 2. Renombrar mudras → pranayamas (UPDATE debe ir antes de cambiar la constraint)
UPDATE cursos_ayurveda SET tipo = 'pranayamas' WHERE tipo = 'mudras';

-- 3. Actualizar CHECK constraint del tipo
ALTER TABLE cursos_ayurveda DROP CONSTRAINT IF EXISTS cursos_ayurveda_tipo_check;
ALTER TABLE cursos_ayurveda
  ADD CONSTRAINT cursos_ayurveda_tipo_check
    CHECK (tipo IN ('cocina', 'pranayamas', 'extras'));

-- 4. Tabla de inscripciones para cursos
CREATE TABLE IF NOT EXISTS inscripciones_cursos (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  curso_id uuid REFERENCES cursos_ayurveda(id) ON DELETE CASCADE NOT NULL,
  nombre_completo text NOT NULL,
  whatsapp text NOT NULL,
  email text NOT NULL,
  created_at timestamptz DEFAULT now()
);
