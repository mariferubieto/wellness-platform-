'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import PostCard from '@/components/contenido/PostCard';
import VideoCard from '@/components/contenido/VideoCard';
import NewsletterForm from '@/components/ui/NewsletterForm';

interface Post {
  id: string;
  titulo: string;
  slug: string;
  imagen_url?: string;
  tags?: string[];
  created_at: string;
}

interface Video {
  id: string;
  titulo: string;
  descripcion?: string;
  url_video: string;
  tipo: 'vlog' | 'mini_clase';
  gratis: boolean;
  thumbnail_url?: string;
}

export default function ContenidoPage() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [videos, setVideos] = useState<Video[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get<Post[]>('/api/contenido/posts').catch(() => [] as Post[]),
      api.get<Video[]>('/api/contenido/videos').catch(() => [] as Video[]),
    ]).then(([p, v]) => {
      setPosts(p.slice(0, 3));
      setVideos(v.slice(0, 3));
    }).finally(() => setLoading(false));
  }, []);

  return (
    <div className="min-h-screen">

      <section className="px-4 py-24 text-center">
        <div className="max-w-2xl mx-auto">
          <div className="w-16 h-px bg-sand mx-auto mb-8" />
          <h1 className="text-6xl text-tierra mb-6">Contenido</h1>
          <p className="text-tierra-light leading-relaxed text-lg">
            Artículos, videos y recursos para nutrir tu práctica de bienestar.
          </p>
        </div>
      </section>

      <section className="px-4 py-16 bg-white">
        <div className="max-w-5xl mx-auto">
          <div className="flex items-end justify-between mb-10">
            <div>
              <div className="w-8 h-px bg-sand mb-4" />
              <h2 className="text-3xl text-tierra">Blog</h2>
            </div>
            <Link href="/contenido/blog" className="btn-secondary text-xs">
              Ver todos
            </Link>
          </div>
          {loading ? (
            <p className="text-tierra-light text-sm tracking-widest uppercase">Cargando...</p>
          ) : posts.length === 0 ? (
            <p className="text-tierra-light text-sm">Próximamente nuevos artículos.</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {posts.map(p => <PostCard key={p.id} post={p} />)}
            </div>
          )}
        </div>
      </section>

      <section className="px-4 py-16">
        <div className="max-w-5xl mx-auto">
          <div className="flex items-end justify-between mb-10">
            <div>
              <div className="w-8 h-px bg-sand mb-4" />
              <h2 className="text-3xl text-tierra">Videos</h2>
              <p className="text-tierra-light text-sm mt-1">Vlog · Mini clases gratuitas</p>
            </div>
            <Link href="/contenido/videos" className="btn-secondary text-xs">
              Ver todos
            </Link>
          </div>
          {loading ? (
            <p className="text-tierra-light text-sm tracking-widest uppercase">Cargando...</p>
          ) : videos.length === 0 ? (
            <p className="text-tierra-light text-sm">Próximamente nuevos videos.</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {videos.map(v => <VideoCard key={v.id} video={v} />)}
            </div>
          )}
        </div>
      </section>

      <section className="px-4 py-20 bg-white">
        <div className="max-w-md mx-auto text-center">
          <div className="w-16 h-px bg-sand mx-auto mb-8" />
          <h2 className="text-3xl text-tierra mb-3">Newsletter</h2>
          <p className="text-tierra-light text-sm leading-relaxed mb-10">
            Recibe artículos, anuncios de retiros y contenido exclusivo directamente en tu inbox.
          </p>
          <NewsletterForm fuente="contenido" />
        </div>
      </section>

    </div>
  );
}
