import Image from 'next/image';

interface Curso {
  id: string;
  nombre: string;
  descripcion?: string;
  fechas?: string[];
  precio: number;
  foto_url?: string;
  tipo_acceso: 'pago' | 'whatsapp' | 'gratis';
}

export default function CursoCard({ curso, onClick }: { curso: Curso; onClick: () => void }) {
  return (
    <div
      className="card-wellness flex flex-col cursor-pointer hover:shadow-md transition-shadow"
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') onClick(); }}
    >
      {curso.foto_url && (
        <div className="relative w-full h-40 mb-4">
          <Image
            src={curso.foto_url}
            alt={curso.nombre}
            fill
            className="object-cover rounded-t-wellness"
          />
        </div>
      )}
      <div className="flex-1">
        <div className="flex items-start justify-between gap-2 mb-2">
          <h3 className="text-xl text-tierra">{curso.nombre}</h3>
          {curso.tipo_acceso === 'gratis' && (
            <span className="text-xs px-2 py-0.5 bg-sage-muted text-sage rounded-full whitespace-nowrap">
              Registro abierto
            </span>
          )}
        </div>
        {curso.descripcion && (
          <p className="text-tierra-light text-sm leading-relaxed line-clamp-3">{curso.descripcion}</p>
        )}
        {curso.fechas && curso.fechas.length > 0 && (
          <p className="text-tierra-light text-xs mt-2">{curso.fechas[0]}</p>
        )}
      </div>
      <div className="mt-6 pt-6 border-t border-beige-lino flex items-center justify-between">
        {curso.precio > 0 ? (
          <p className="text-2xl font-light text-tierra">
            ${curso.precio.toLocaleString('es-MX')} <span className="text-sm text-tierra-light">MXN</span>
          </p>
        ) : (
          <p className="text-tierra-light text-sm">Consultar precio</p>
        )}
        <span className="btn-secondary text-xs pointer-events-none">Ver más</span>
      </div>
    </div>
  );
}
