import Link from 'next/link';

interface Post {
  id: string;
  titulo: string;
  slug: string;
  imagen_url?: string;
  tags?: string[];
  created_at: string;
}

export default function PostCard({ post }: { post: Post }) {
  const fecha = new Date(post.created_at).toLocaleDateString('es-MX', {
    year: 'numeric', month: 'long', day: 'numeric',
  });

  return (
    <Link href={`/contenido/blog/${post.slug}`} className="block group">
      <div className="card-wellness flex flex-col overflow-hidden">
        <div className="aspect-video bg-sage-muted mb-4 overflow-hidden -mx-6 -mt-6">
          {post.imagen_url ? (
            <img
              src={post.imagen_url}
              alt={post.titulo}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <div className="w-8 h-px bg-sand" />
            </div>
          )}
        </div>
        <div className="flex-1">
          <p className="label-wellness mb-2">{fecha}</p>
          <h3 className="text-xl text-tierra leading-snug mb-3 group-hover:text-sage transition-colors">
            {post.titulo}
          </h3>
          {post.tags && post.tags.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {post.tags.map(tag => (
                <span key={tag} className="text-xs text-tierra-light bg-beige px-2 py-0.5 rounded-wellness">
                  {tag}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
    </Link>
  );
}
