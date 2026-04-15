-- database/migrations/011_retiros_tipo_acceso.sql

ALTER TABLE retiros
  ADD COLUMN IF NOT EXISTS tipo_acceso text
    CHECK (tipo_acceso IN ('pago', 'whatsapp'))
    DEFAULT 'pago';
