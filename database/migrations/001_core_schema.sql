-- database/migrations/001_core_schema.sql

-- Habilitar extensión para UUIDs
create extension if not exists "uuid-ossp";

-- ============================================================
-- TABLA: users
-- ============================================================
create type user_rol as enum ('user', 'admin', 'maestro');
create type user_fuente as enum (
  'shala', 'ayurveda', 'retiro', 'evento',
  'contenido', 'directo', 'migracion_nessty'
);

create table if not exists public.users (
  id               uuid primary key default uuid_generate_v4(),
  auth_id          uuid unique,  -- Supabase auth.users.id
  nombre           text not null,
  email            text unique not null,
  telefono         text,
  fecha_nacimiento date,
  rol              user_rol not null default 'user',
  fuente           user_fuente default 'directo',
  tags             text[] default '{}',
  created_at       timestamptz not null default now()
);

-- Índices
create index if not exists users_email_idx on public.users(email);
create index if not exists users_rol_idx on public.users(rol);
create index if not exists users_fecha_nacimiento_idx on public.users(fecha_nacimiento);

-- RLS: solo el backend (service_role) puede leer/escribir
alter table public.users enable row level security;
create policy "service_role_all" on public.users
  using (true) with check (true);

-- ============================================================
-- TABLA: leads
-- ============================================================
create type lead_fuente as enum (
  'shala', 'ayurveda', 'retiro', 'evento',
  'newsletter', 'checkout_abandonado'
);
create type lead_estado as enum ('nuevo', 'contactado', 'convertido', 'inactivo');

create table if not exists public.leads (
  id               uuid primary key default uuid_generate_v4(),
  nombre           text,
  email            text,
  telefono         text,
  fecha_nacimiento date,
  fuente           lead_fuente,
  intereses        text[] default '{}',
  estado           lead_estado not null default 'nuevo',
  ultimo_contacto  timestamptz,
  user_id          uuid references public.users(id) on delete set null,
  created_at       timestamptz not null default now()
);

create index if not exists leads_email_idx on public.leads(email);
create index if not exists leads_estado_idx on public.leads(estado);
create index if not exists leads_fuente_idx on public.leads(fuente);

alter table public.leads enable row level security;
create policy "service_role_all" on public.leads
  using (true) with check (true);

-- ============================================================
-- TABLA: behavior_events
-- ============================================================
create table if not exists public.behavior_events (
  id               uuid primary key default uuid_generate_v4(),
  user_id          uuid references public.users(id) on delete cascade,
  lead_id          uuid references public.leads(id) on delete cascade,
  tipo             text not null,
  pagina           text,
  accion           text,
  metadata         jsonb default '{}',
  created_at       timestamptz not null default now()
);

create index if not exists behavior_events_user_idx on public.behavior_events(user_id);
create index if not exists behavior_events_lead_idx on public.behavior_events(lead_id);
create index if not exists behavior_events_tipo_idx on public.behavior_events(tipo);

alter table public.behavior_events enable row level security;
create policy "service_role_all" on public.behavior_events
  using (true) with check (true);
