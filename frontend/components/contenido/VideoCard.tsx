interface Video {
  id: string;
  titulo: string;
  descripcion?: string;
  url_video: string;
  tipo: 'vlog' | 'mini_clase';
  gratis: boolean;
  thumbnail_url?: string;
}

export default function VideoCard({ video }: { video: Video }) {
  return (
    <div className="card-wellness flex flex-col">
      <div className="aspect-video bg-sage-muted mb-4 overflow-hidden -mx-6 -mt-6 relative">
        {video.thumbnail_url ? (
          <img
            src={video.thumbnail_url}
            alt={video.titulo}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-beige-lino">
            <span className="text-tierra-light text-4xl">▷</span>
          </div>
        )}
        {video.gratis && (
          <span className="absolute top-3 right-3 bg-sage text-white text-xs px-2 py-1 rounded-wellness tracking-widest uppercase">
            Gratis
          </span>
        )}
      </div>
      <div className="flex-1">
        <p className="label-wellness mb-2">{video.tipo === 'vlog' ? 'Vlog' : 'Mini clase'}</p>
        <h3 className="text-lg text-tierra leading-snug mb-2">{video.titulo}</h3>
        {video.descripcion && (
          <p className="text-tierra-light text-sm leading-relaxed line-clamp-2">{video.descripcion}</p>
        )}
      </div>
      <div className="mt-4 pt-4 border-t border-beige-lino">
        <a
          href={video.url_video}
          target="_blank"
          rel="noopener noreferrer"
          className="btn-primary text-xs block text-center"
        >
          Ver video
        </a>
      </div>
    </div>
  );
}
