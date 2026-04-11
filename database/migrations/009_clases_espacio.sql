-- 009: add espacio_tipo to clases
ALTER TABLE clases
  ADD COLUMN IF NOT EXISTS espacio_tipo text
    CHECK (espacio_tipo IN ('salon', 'jardin'))
    DEFAULT 'salon';
