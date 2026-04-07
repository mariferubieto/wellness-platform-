'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import Button from '@/components/ui/Button';

interface Post {
  id: string;
  titulo: string;
  slug: string;
  contenido: string;
  imagen_url?: string;
  tags?: string[];
  publicado: boolean;
  autor_id?: string;
  created_at: string;
}

interface Video {
  id: string;
  titulo: string;
  url_video: string;
  tipo: 'vlog' | 'mini_clase';
  descripcion?: string;
  thumbnail_url?: string;
  gratis: boolean;
  publicado: boolean;
  created_at: string;
}

interface Suscriptor {
  id: string;
  email: string;
  nombre?: string;
  fuente?: string;
  activo: boolean;
  created_at: string;
}

type Tab = 'posts' | 'videos' | 'newsletter';

export default function AdminContenidoPage() {
  const [tab, setTab] = useState<Tab>('posts');
  const [posts, setPosts] = useState<Post[]>([]);
  const [videos, setVideos] = useState<Video[]>([]);
  const [suscriptores, setSuscriptores] = useState<Suscriptor[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Create post form
  const [newPost, setNewPost] = useState({ titulo: '', slug: '', contenido: '', imagen_url: '', tags: '' });
  const [savingPost, setSavingPost] = useState(false);

  // Create video form
  const [newVideo, setNewVideo] = useState({
    titulo: '',
    url_video: '',
    tipo: 'vlog' as 'vlog' | 'mini_clase',
    descripcion: '',
    thumbnail_url: '',
    gratis: false,
  });
  const [savingVideo, setSavingVideo] = useState(false);

  // Newsletter export
  const [exportando, setExportando] = useState(false);
  const [exportError, setExportError] = useState('');

  useEffect(() => {
    Promise.all([
      api.get<Post[]>('/api/contenido/posts/admin').catch(() => [] as Post[]),
      api.get<Video[]>('/api/contenido/videos/admin').catch(() => [] as Video[]),
      api.get<Suscriptor[]>('/api/newsletter/suscriptores').catch(() => [] as Suscriptor[]),
    ])
      .then(([postsData, videosData, suscriptoresData]) => {
        setPosts(postsData);
        setVideos(videosData);
        setSuscriptores(suscriptoresData);
      })
      .catch((err: unknown) => setError(err instanceof Error ? err.message : 'Error'))
      .finally(() => setLoading(false));
  }, []);

  async function handleCreatePost(e: React.FormEvent) {
    e.preventDefault();
    setSavingPost(true);
    try {
      const { titulo, slug, contenido, imagen_url, tags } = newPost;
      const created = await api.post<Post>('/api/contenido/posts', {
        titulo,
        slug,
        contenido,
        imagen_url: imagen_url || undefined,
        tags: tags ? tags.split(',').map(t => t.trim()) : undefined,
      });
      setPosts(prev => [created, ...prev]);
      setNewPost({ titulo: '', slug: '', contenido: '', imagen_url: '', tags: '' });
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error al crear post');
    } finally {
      setSavingPost(false);
    }
  }

  async function handleTogglePost(post: Post) {
    try {
      const updated = await api.patch<Post>(`/api/contenido/posts/${post.id}`, { publicado: !post.publicado });
      setPosts(prev => prev.map(p => p.id === post.id ? updated : p));
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error al actualizar post');
    }
  }

  async function handleCreateVideo(e: React.FormEvent) {
    e.preventDefault();
    setSavingVideo(true);
    try {
      const { titulo, url_video, tipo, descripcion, thumbnail_url, gratis } = newVideo;
      const created = await api.post<Video>('/api/contenido/videos', {
        titulo,
        url_video,
        tipo,
        descripcion: descripcion || undefined,
        thumbnail_url: thumbnail_url || undefined,
        gratis,
      });
      setVideos(prev => [created, ...prev]);
      setNewVideo({ titulo: '', url_video: '', tipo: 'vlog', descripcion: '', thumbnail_url: '', gratis: false });
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error al crear video');
    } finally {
      setSavingVideo(false);
    }
  }

  async function handleToggleVideo(video: Video) {
    try {
      const updated = await api.patch<Video>(`/api/contenido/videos/${video.id}`, { publicado: !video.publicado });
      setVideos(prev => prev.map(v => v.id === video.id ? updated : v));
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error al actualizar video');
    }
  }

  async function handleExportarNewsletter() {
    setExportando(true);
    setExportError('');
    try {
      const { createSupabaseClient } = await import('@/lib/supabase');
      const supabase = createSupabaseClient();
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) throw new Error('Sin sesión');

      const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
      const res = await fetch(`${API_URL}/api/newsletter/suscriptores/exportar`, {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({ error: `Error ${res.status}` }));
        throw new Error(errData.error || `Error ${res.status}`);
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `newsletter-${new Date().toISOString().split('T')[0]}.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err: unknown) {
      setExportError(err instanceof Error ? err.message : 'Error al exportar');
    } finally {
      setExportando(false);
    }
  }

  const tabs: { key: Tab; label: string }[] = [
    { key: 'posts', label: 'Posts' },
    { key: 'videos', label: 'Videos' },
    { key: 'newsletter', label: 'Newsletter' },
  ];

  return (
    <div>
      {/* Header */}
      <div className="mb-8">
        <div className="w-8 h-px bg-sand mb-4" />
        <h1 className="text-3xl text-tierra">CONTENIDO</h1>
        <p className="text-tierra-light text-sm mt-1">Gestión de posts, videos y newsletter</p>
      </div>

      {error && <p className="text-red-500 text-sm mb-4">{error}</p>}

      {/* Tab bar */}
      <div className="flex gap-2 mb-8 border-b border-beige-lino pb-4">
        {tabs.map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-5 py-2 text-xs tracking-widest uppercase rounded-wellness transition-colors ${
              tab === t.key
                ? 'bg-sage-muted text-sage'
                : 'text-tierra-light hover:text-tierra'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {loading ? (
        <p className="text-tierra-light text-sm tracking-widest uppercase">Cargando...</p>
      ) : (
        <>
          {/* POSTS TAB */}
          {tab === 'posts' && (
            <div>
              {/* Create post form */}
              <div className="card-wellness mb-8">
                <h2 className="text-lg text-tierra mb-5">Nuevo Post</h2>
                <form onSubmit={handleCreatePost}>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <div>
                      <label className="label-wellness block mb-2">Título</label>
                      <input
                        type="text"
                        required
                        value={newPost.titulo}
                        onChange={e => setNewPost(p => ({ ...p, titulo: e.target.value }))}
                        className="input-wellness w-full"
                        placeholder="Título del post"
                      />
                    </div>
                    <div>
                      <label className="label-wellness block mb-2">Slug</label>
                      <input
                        type="text"
                        required
                        value={newPost.slug}
                        onChange={e => setNewPost(p => ({ ...p, slug: e.target.value }))}
                        className="input-wellness w-full"
                        placeholder="mi-post-url"
                      />
                    </div>
                    <div>
                      <label className="label-wellness block mb-2">Imagen URL</label>
                      <input
                        type="text"
                        value={newPost.imagen_url}
                        onChange={e => setNewPost(p => ({ ...p, imagen_url: e.target.value }))}
                        className="input-wellness w-full"
                        placeholder="https://..."
                      />
                    </div>
                    <div>
                      <label className="label-wellness block mb-2">Tags (separadas por coma)</label>
                      <input
                        type="text"
                        value={newPost.tags}
                        onChange={e => setNewPost(p => ({ ...p, tags: e.target.value }))}
                        className="input-wellness w-full"
                        placeholder="bienestar, ayurveda, yoga"
                      />
                    </div>
                  </div>
                  <div className="mb-4">
                    <label className="label-wellness block mb-2">Contenido</label>
                    <textarea
                      required
                      value={newPost.contenido}
                      onChange={e => setNewPost(p => ({ ...p, contenido: e.target.value }))}
                      className="input-wellness w-full"
                      rows={5}
                      placeholder="Escribe el contenido del post..."
                    />
                  </div>
                  <Button type="submit" variant="primary" loading={savingPost}>
                    Crear Post
                  </Button>
                </form>
              </div>

              {/* Posts list */}
              {posts.length === 0 ? (
                <div className="card-wellness text-center py-12">
                  <p className="text-tierra-light text-sm">No hay posts aún</p>
                </div>
              ) : (
                <div className="bg-white border border-beige-lino rounded-wellness overflow-hidden">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-beige-lino">
                        <th className="label-wellness text-left px-4 py-3">Título</th>
                        <th className="label-wellness text-left px-4 py-3">Slug</th>
                        <th className="label-wellness text-left px-4 py-3">Publicado</th>
                        <th className="label-wellness text-left px-4 py-3">Fecha</th>
                        <th className="label-wellness text-left px-4 py-3">Acción</th>
                      </tr>
                    </thead>
                    <tbody>
                      {posts.map((post, i) => (
                        <tr
                          key={post.id}
                          className={`border-b border-beige-lino last:border-0 ${i % 2 === 0 ? 'bg-white' : 'bg-beige/30'}`}
                        >
                          <td className="px-4 py-3 text-tierra">{post.titulo}</td>
                          <td className="px-4 py-3 text-tierra-light text-xs">{post.slug}</td>
                          <td className="px-4 py-3">
                            <span className={`text-xs px-2 py-1 rounded-full ${
                              post.publicado ? 'bg-sage-muted text-sage' : 'bg-beige text-tierra-light'
                            }`}>
                              {post.publicado ? 'Publicado' : 'Borrador'}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-tierra-light text-xs">
                            {new Date(post.created_at).toLocaleDateString('es-MX', {
                              day: 'numeric', month: 'short', year: 'numeric',
                            })}
                          </td>
                          <td className="px-4 py-3">
                            <button
                              onClick={() => handleTogglePost(post)}
                              className="text-xs text-tierra-light hover:text-tierra underline underline-offset-2 transition-colors"
                            >
                              {post.publicado ? 'Despublicar' : 'Publicar'}
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* VIDEOS TAB */}
          {tab === 'videos' && (
            <div>
              {/* Create video form */}
              <div className="card-wellness mb-8">
                <h2 className="text-lg text-tierra mb-5">Nuevo Video</h2>
                <form onSubmit={handleCreateVideo}>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <div>
                      <label className="label-wellness block mb-2">Título</label>
                      <input
                        type="text"
                        required
                        value={newVideo.titulo}
                        onChange={e => setNewVideo(v => ({ ...v, titulo: e.target.value }))}
                        className="input-wellness w-full"
                        placeholder="Título del video"
                      />
                    </div>
                    <div>
                      <label className="label-wellness block mb-2">URL del Video</label>
                      <input
                        type="text"
                        required
                        value={newVideo.url_video}
                        onChange={e => setNewVideo(v => ({ ...v, url_video: e.target.value }))}
                        className="input-wellness w-full"
                        placeholder="https://youtube.com/..."
                      />
                    </div>
                    <div>
                      <label className="label-wellness block mb-2">Tipo</label>
                      <select
                        value={newVideo.tipo}
                        onChange={e => setNewVideo(v => ({ ...v, tipo: e.target.value as 'vlog' | 'mini_clase' }))}
                        className="px-4 py-2 bg-white border border-beige-lino rounded-wellness text-sm text-tierra focus:outline-none focus:border-sage w-full"
                      >
                        <option value="vlog">Vlog</option>
                        <option value="mini_clase">Mini Clase</option>
                      </select>
                    </div>
                    <div>
                      <label className="label-wellness block mb-2">Thumbnail URL</label>
                      <input
                        type="text"
                        value={newVideo.thumbnail_url}
                        onChange={e => setNewVideo(v => ({ ...v, thumbnail_url: e.target.value }))}
                        className="input-wellness w-full"
                        placeholder="https://..."
                      />
                    </div>
                  </div>
                  <div className="mb-4">
                    <label className="label-wellness block mb-2">Descripción</label>
                    <textarea
                      value={newVideo.descripcion}
                      onChange={e => setNewVideo(v => ({ ...v, descripcion: e.target.value }))}
                      className="input-wellness w-full"
                      rows={3}
                      placeholder="Descripción del video..."
                    />
                  </div>
                  <div className="mb-5 flex items-center gap-3">
                    <input
                      type="checkbox"
                      id="gratis"
                      checked={newVideo.gratis}
                      onChange={e => setNewVideo(v => ({ ...v, gratis: e.target.checked }))}
                      className="rounded"
                    />
                    <label htmlFor="gratis" className="label-wellness cursor-pointer">Video gratuito</label>
                  </div>
                  <Button type="submit" variant="primary" loading={savingVideo}>
                    Crear Video
                  </Button>
                </form>
              </div>

              {/* Videos list */}
              {videos.length === 0 ? (
                <div className="card-wellness text-center py-12">
                  <p className="text-tierra-light text-sm">No hay videos aún</p>
                </div>
              ) : (
                <div className="bg-white border border-beige-lino rounded-wellness overflow-hidden">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-beige-lino">
                        <th className="label-wellness text-left px-4 py-3">Título</th>
                        <th className="label-wellness text-left px-4 py-3">Tipo</th>
                        <th className="label-wellness text-left px-4 py-3">Gratis</th>
                        <th className="label-wellness text-left px-4 py-3">Publicado</th>
                        <th className="label-wellness text-left px-4 py-3">Fecha</th>
                        <th className="label-wellness text-left px-4 py-3">Acción</th>
                      </tr>
                    </thead>
                    <tbody>
                      {videos.map((video, i) => (
                        <tr
                          key={video.id}
                          className={`border-b border-beige-lino last:border-0 ${i % 2 === 0 ? 'bg-white' : 'bg-beige/30'}`}
                        >
                          <td className="px-4 py-3 text-tierra">{video.titulo}</td>
                          <td className="px-4 py-3 text-tierra-mid text-xs capitalize">
                            {video.tipo === 'mini_clase' ? 'Mini Clase' : 'Vlog'}
                          </td>
                          <td className="px-4 py-3">
                            <span className={`text-xs px-2 py-1 rounded-full ${
                              video.gratis ? 'bg-tierra-light/20 text-tierra-light' : 'bg-beige text-tierra-light'
                            }`}>
                              {video.gratis ? 'Gratis' : 'Premium'}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <span className={`text-xs px-2 py-1 rounded-full ${
                              video.publicado ? 'bg-sage-muted text-sage' : 'bg-beige text-tierra-light'
                            }`}>
                              {video.publicado ? 'Publicado' : 'Borrador'}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-tierra-light text-xs">
                            {new Date(video.created_at).toLocaleDateString('es-MX', {
                              day: 'numeric', month: 'short', year: 'numeric',
                            })}
                          </td>
                          <td className="px-4 py-3">
                            <button
                              onClick={() => handleToggleVideo(video)}
                              className="text-xs text-tierra-light hover:text-tierra underline underline-offset-2 transition-colors"
                            >
                              {video.publicado ? 'Despublicar' : 'Publicar'}
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* NEWSLETTER TAB */}
          {tab === 'newsletter' && (
            <div>
              <div className="mb-6 flex items-center gap-4">
                <Button variant="primary" onClick={handleExportarNewsletter} loading={exportando}>
                  Exportar Excel
                </Button>
                <p className="text-tierra-light text-xs">{suscriptores.length} suscriptores activos</p>
              </div>

              {exportError && <p className="text-red-400 text-xs mb-4">{exportError}</p>}

              {suscriptores.length === 0 ? (
                <div className="card-wellness text-center py-12">
                  <p className="text-tierra-light text-sm">No hay suscriptores aún</p>
                </div>
              ) : (
                <div className="bg-white border border-beige-lino rounded-wellness overflow-hidden">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-beige-lino">
                        <th className="label-wellness text-left px-4 py-3">Email</th>
                        <th className="label-wellness text-left px-4 py-3">Nombre</th>
                        <th className="label-wellness text-left px-4 py-3">Fuente</th>
                        <th className="label-wellness text-left px-4 py-3">Fecha registro</th>
                      </tr>
                    </thead>
                    <tbody>
                      {suscriptores.map((s, i) => (
                        <tr
                          key={s.id}
                          className={`border-b border-beige-lino last:border-0 ${i % 2 === 0 ? 'bg-white' : 'bg-beige/30'}`}
                        >
                          <td className="px-4 py-3 text-tierra">{s.email}</td>
                          <td className="px-4 py-3 text-tierra-mid">{s.nombre ?? '—'}</td>
                          <td className="px-4 py-3 text-tierra-light text-xs">{s.fuente ?? '—'}</td>
                          <td className="px-4 py-3 text-tierra-light text-xs">
                            {new Date(s.created_at).toLocaleDateString('es-MX', {
                              day: 'numeric', month: 'short', year: 'numeric',
                            })}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
