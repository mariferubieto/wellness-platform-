import Link from 'next/link';
import Image from 'next/image';

interface Retiro {
  id: string;
  nombre: string;
  descripcion?: string;
  lugar?: string;
  precio: number;
  fecha_inicio?: string;
  fecha_fin?: string;
  imagen_url?: string;
}

export default function RetiroCard({ retiro }: { retiro: Retiro }) {
  const fechas = retiro.fecha_inicio && retiro.fecha_fin
    ? `${new Date(retiro.fecha_inicio).toLocaleDateString('es-MX', { day: 'numeric', month: 'short' })} – ${new Date(retiro.fecha_fin).toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' })}`
    : null;

  return (
    <div className="card-wellness flex flex-col">
      {retiro.imagen_url && (
        <div className="relative w-full h-40 mb-4">
          <Image
            src={retiro.imagen_url}
            alt={retiro.nombre}
            fill
            className="object-cover rounded-wellness"
          />
        </div>
      )}
      <div className="flex-1">
        {fechas && <p className="label-wellness mb-3">{fechas}</p>}
        <h3 className="text-xl text-tierra mb-2">{retiro.nombre}</h3>
        {retiro.lugar && <p className="text-tierra-light text-xs mb-2">{retiro.lugar}</p>}
        {retiro.descripcion && (
          <p className="text-tierra-light text-sm leading-relaxed line-clamp-3">{retiro.descripcion}</p>
        )}
      </div>
      <div className="mt-6 pt-6 border-t border-beige-lino flex items-center justify-between">
        <p className="text-2xl font-light text-tierra">
          ${retiro.precio.toLocaleString('es-MX')} <span className="text-sm text-tierra-light">MXN</span>
        </p>
        <Link href={`/retiros/${retiro.id}`} className="btn-primary text-xs">
          Ver más
        </Link>
      </div>
    </div>
  );
}
