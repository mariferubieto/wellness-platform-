'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import PostCard from '@/components/contenido/PostCard';

interface Post {
  id: string;
  titulo: string;
  slug: string;
  imagen_url?: string;
  tags?: string[];
  created_at: string;
}

export default function BlogPage() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get<Post[]>('/api/contenido/posts')
      .then(setPosts)
      .catch(() => setPosts([]))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="min-h-screen px-4 py-16">
      <div className="max-w-5xl mx-auto">

        <div className="mb-6">
          <Link href="/contenido" className="text-tierra-light text-xs tracking-widest uppercase hover:text-tierra transition-colors">
            ← Contenido
          </Link>
        </div>

        <div className="text-center mb-16">
          <div className="w-16 h-px bg-sand mx-auto mb-8" />
          <h1 className="text-5xl text-tierra mb-4">Blog</h1>
          <p className="text-tierra-light max-w-lg mx-auto leading-relaxed">
            Reflexiones, guías y enseñanzas sobre yoga, ayurveda y bienestar.
          </p>
        </div>

        {loading ? (
          <p className="text-center text-tierra-light text-sm tracking-widest uppercase">Cargando...</p>
        ) : posts.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-tierra-light text-sm">Próximamente nuevos artículos.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {posts.map(p => (
              <PostCard key={p.id} post={p} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
