-- database/migrations/005_content_schema.sql
-- Run this in Supabase SQL Editor after 004_marifer_schema.sql

-- ============================================================
-- TABLA: posts (blog)
-- ============================================================
CREATE TABLE IF NOT EXISTS posts (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  titulo      text NOT NULL,
  slug        text UNIQUE NOT NULL,
  contenido   text NOT NULL,
  imagen_url  text,
  autor_id    uuid REFERENCES users(id) ON DELETE SET NULL,
  tags        text[] DEFAULT '{}',
  publicado   boolean DEFAULT false,
  created_at  timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS posts_slug_idx ON posts(slug);
CREATE INDEX IF NOT EXISTS posts_publicado_idx ON posts(publicado);
CREATE INDEX IF NOT EXISTS posts_created_at_idx ON posts(created_at DESC);

ALTER TABLE posts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "service_role_all" ON posts USING (true) WITH CHECK (true);

-- ============================================================
-- TABLA: videos (vlog + mini clases)
-- ============================================================
CREATE TYPE video_tipo AS ENUM ('vlog', 'mini_clase');

CREATE TABLE IF NOT EXISTS videos (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  titulo        text NOT NULL,
  descripcion   text,
  url_video     text NOT NULL,
  tipo          video_tipo NOT NULL,
  gratis        boolean DEFAULT true,
  thumbnail_url text,
  publicado     boolean DEFAULT false,
  created_at    timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS videos_tipo_idx ON videos(tipo);
CREATE INDEX IF NOT EXISTS videos_publicado_idx ON videos(publicado);
CREATE INDEX IF NOT EXISTS videos_created_at_idx ON videos(created_at DESC);

ALTER TABLE videos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "service_role_all" ON videos USING (true) WITH CHECK (true);

-- ============================================================
-- TABLA: newsletter_suscriptores
-- ============================================================
CREATE TABLE IF NOT EXISTS newsletter_suscriptores (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email      text UNIQUE NOT NULL,
  nombre     text,
  activo     boolean DEFAULT true,
  fuente     text DEFAULT 'web',
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS newsletter_email_idx ON newsletter_suscriptores(email);
CREATE INDEX IF NOT EXISTS newsletter_activo_idx ON newsletter_suscriptores(activo);

ALTER TABLE newsletter_suscriptores ENABLE ROW LEVEL SECURITY;
CREATE POLICY "service_role_all" ON newsletter_suscriptores USING (true) WITH CHECK (true);
