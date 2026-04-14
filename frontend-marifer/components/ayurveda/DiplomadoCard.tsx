import Link from 'next/link';

interface Diplomado {
  id: string;
  nombre: string;
  descripcion?: string;
  precio: number;
  generacion: string;
}

interface Props {
  diplomado: Diplomado;
  onClick?: () => void;
}

export default function DiplomadoCard({ diplomado, onClick }: Props) {
  const inner = (
    <>
      <div className="flex-1">
        <p className="label-wellness mb-3">{diplomado.generacion}</p>
        <h3 className="text-xl text-tierra mb-2">{diplomado.nombre}</h3>
        {diplomado.descripcion && (
          <p className="text-tierra-light text-sm leading-relaxed line-clamp-3">{diplomado.descripcion}</p>
        )}
      </div>
      <div className="mt-6 pt-6 border-t border-beige-lino flex items-center justify-between">
        <p className="text-2xl font-light text-tierra">
          ${diplomado.precio.toLocaleString('es-MX')} <span className="text-sm text-tierra-light">MXN</span>
        </p>
        <span className="btn-primary text-xs">Ver más</span>
      </div>
    </>
  );

  if (onClick) {
    return (
      <div
        className="card-wellness flex flex-col cursor-pointer hover:shadow-md transition-shadow"
        onClick={onClick}
        role="button"
        tabIndex={0}
        onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') onClick(); }}
      >
        {inner}
      </div>
    );
  }

  return (
    <Link href={`/ayurveda/${diplomado.id}`} className="card-wellness flex flex-col">
      {inner}
    </Link>
  );
}
