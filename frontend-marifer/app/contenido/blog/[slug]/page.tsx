'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import NewsletterForm from '@/components/ui/NewsletterForm';

interface Post {
  id: string;
  titulo: string;
  slug: string;
  contenido: string;
  imagen_url?: string;
  tags?: string[];
  created_at: string;
}

export default function PostDetallePage() {
  const { slug } = useParams<{ slug: string }>();
  const router = useRouter();
  const [post, setPost] = useState<Post | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get<Post>(`/api/contenido/posts/${slug}`)
      .then(setPost)
      .catch(() => setError('Artículo no encontrado'))
      .finally(() => setLoading(false));
  }, [slug]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-tierra-light text-sm tracking-widest uppercase">Cargando...</p>
      </div>
    );
  }

  if (error || !post) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-tierra-light text-sm mb-4">{error || 'Artículo no encontrado'}</p>
          <button onClick={() => router.push('/contenido/blog')} className="btn-secondary text-xs">
            Ver todos los artículos
          </button>
        </div>
      </div>
    );
  }

  const fecha = new Date(post.created_at).toLocaleDateString('es-MX', {
    year: 'numeric', month: 'long', day: 'numeric',
  });

  return (
    <div className="min-h-screen px-4 py-16">
      <div className="max-w-2xl mx-auto">

        <button
          onClick={() => router.push('/contenido/blog')}
          className="text-tierra-light text-xs tracking-widest uppercase mb-10 hover:text-tierra transition-colors"
        >
          ← Blog
        </button>

        <div className="w-8 h-px bg-sand mb-6" />
        <p className="label-wellness mb-3">{fecha}</p>
        <h1 className="text-4xl text-tierra mb-6 leading-tight">{post.titulo}</h1>

        {post.imagen_url && (
          <div className="aspect-video bg-beige-lino mb-10 overflow-hidden">
            <img src={post.imagen_url} alt={post.titulo} className="w-full h-full object-cover" />
          </div>
        )}

        <div className="text-tierra-light leading-relaxed whitespace-pre-wrap text-base">
          {post.contenido}
        </div>

        {post.tags && post.tags.length > 0 && (
          <div className="mt-10 pt-6 border-t border-beige-lino flex flex-wrap gap-2">
            {post.tags.map(tag => (
              <span key={tag} className="text-xs text-tierra-light bg-beige px-3 py-1 rounded-wellness">
                {tag}
              </span>
            ))}
          </div>
        )}

        <div className="mt-16 bg-white border border-beige-lino rounded-wellness p-8">
          <div className="w-6 h-px bg-sand mb-4" />
          <h3 className="text-xl text-tierra mb-2">¿Te gustó este artículo?</h3>
          <p className="text-tierra-light text-sm mb-6 leading-relaxed">
            Suscríbete para recibir nuevos artículos, guías y contenido exclusivo.
          </p>
          <NewsletterForm fuente="blog" />
        </div>

      </div>
    </div>
  );
}
