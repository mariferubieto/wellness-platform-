'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import VideoCard from '@/components/contenido/VideoCard';

interface Video {
  id: string;
  titulo: string;
  descripcion?: string;
  url_video: string;
  tipo: 'vlog' | 'mini_clase';
  gratis: boolean;
  thumbnail_url?: string;
}

type Tab = 'todos' | 'vlog' | 'mini_clase';

export default function VideosPage() {
  const [videos, setVideos] = useState<Video[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>('todos');

  useEffect(() => {
    api.get<Video[]>('/api/contenido/videos')
      .then(setVideos)
      .catch(() => setVideos([]))
      .finally(() => setLoading(false));
  }, []);

  const filtrados = tab === 'todos' ? videos : videos.filter(v => v.tipo === tab);

  const tabs: { key: Tab; label: string }[] = [
    { key: 'todos', label: 'Todos' },
    { key: 'vlog', label: 'Vlog' },
    { key: 'mini_clase', label: 'Mini clases' },
  ];

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
          <h1 className="text-5xl text-tierra mb-4">Videos</h1>
          <p className="text-tierra-light max-w-lg mx-auto leading-relaxed">
            Vlogs, mini clases y contenido gratuito para tu práctica diaria.
          </p>
        </div>

        <div className="flex justify-center gap-6 mb-12">
          {tabs.map(t => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`text-xs tracking-widest uppercase pb-2 border-b transition-colors duration-200 ${
                tab === t.key
                  ? 'text-tierra border-sand'
                  : 'text-tierra-light border-transparent hover:text-tierra'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {loading ? (
          <p className="text-center text-tierra-light text-sm tracking-widest uppercase">Cargando...</p>
        ) : filtrados.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-tierra-light text-sm">No hay videos disponibles por el momento.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filtrados.map(v => (
              <VideoCard key={v.id} video={v} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
