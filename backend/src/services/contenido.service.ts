// backend/src/services/contenido.service.ts
import { supabaseAdmin } from '../config/supabase';

// ── POSTS ──────────────────────────────────────────────────

export async function getPosts(soloPublicados = true) {
  let q = supabaseAdmin
    .from('posts')
    .select('id, titulo, slug, imagen_url, tags, publicado, created_at')
    .order('created_at', { ascending: false });
  if (soloPublicados) q = q.eq('publicado', true);
  const { data, error } = await q;
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function getPostBySlug(slug: string) {
  const { data, error } = await supabaseAdmin
    .from('posts')
    .select('id, titulo, slug, contenido, imagen_url, tags, publicado, created_at')
    .eq('slug', slug)
    .eq('publicado', true)
    .single();
  if (error) throw new Error(error.message);
  if (!data) throw new Error('Post no encontrado');
  return data;
}

export async function createPost(body: {
  titulo: string;
  slug: string;
  contenido: string;
  imagen_url?: string;
  tags?: string[];
  autor_id?: string;
}) {
  const { data, error } = await supabaseAdmin
    .from('posts')
    .insert({
      titulo: body.titulo,
      slug: body.slug,
      contenido: body.contenido,
      imagen_url: body.imagen_url ?? null,
      tags: body.tags ?? [],
      autor_id: body.autor_id ?? null,
    })
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data;
}

export async function updatePost(
  id: string,
  body: Partial<{
    titulo: string;
    slug: string;
    contenido: string;
    imagen_url: string;
    tags: string[];
    publicado: boolean;
  }>
) {
  const { data, error } = await supabaseAdmin
    .from('posts')
    .update(body)
    .eq('id', id)
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data;
}

// ── VIDEOS ─────────────────────────────────────────────────

export async function getVideos(
  tipo?: 'vlog' | 'mini_clase',
  soloPublicados = true
) {
  let q = supabaseAdmin
    .from('videos')
    .select('id, titulo, descripcion, url_video, tipo, gratis, thumbnail_url, publicado, created_at')
    .order('created_at', { ascending: false });
  if (soloPublicados) q = q.eq('publicado', true);
  if (tipo) q = q.eq('tipo', tipo);
  const { data, error } = await q;
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function createVideo(body: {
  titulo: string;
  descripcion?: string;
  url_video: string;
  tipo: 'vlog' | 'mini_clase';
  gratis?: boolean;
  thumbnail_url?: string;
}) {
  const { data, error } = await supabaseAdmin
    .from('videos')
    .insert({
      titulo: body.titulo,
      descripcion: body.descripcion ?? null,
      url_video: body.url_video,
      tipo: body.tipo,
      gratis: body.gratis ?? true,
      thumbnail_url: body.thumbnail_url ?? null,
    })
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data;
}

export async function updateVideo(
  id: string,
  body: Partial<{
    titulo: string;
    descripcion: string;
    url_video: string;
    tipo: 'vlog' | 'mini_clase';
    gratis: boolean;
    thumbnail_url: string;
    publicado: boolean;
  }>
) {
  const { data, error } = await supabaseAdmin
    .from('videos')
    .update(body)
    .eq('id', id)
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data;
}
