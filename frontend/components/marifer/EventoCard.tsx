import Link from 'next/link';

interface Evento {
  id: string;
  nombre: string;
  descripcion?: string;
  lugar?: string;
  precio?: number | null;
  fecha?: string;
  tipo_acceso: 'pago' | 'whatsapp' | 'gratis';
  whatsapp_contacto?: string;
}

export default function EventoCard({ evento }: { evento: Evento }) {
  const fecha = evento.fecha
    ? new Date(evento.fecha).toLocaleDateString('es-MX', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })
    : null;

  const etiquetaPrecio =
    evento.tipo_acceso === 'gratis'
      ? 'Gratis'
      : evento.tipo_acceso === 'whatsapp'
      ? 'Por contacto'
      : evento.precio != null
      ? `$${evento.precio.toLocaleString('es-MX')} MXN`
      : null;

  return (
    <div className="card-wellness flex flex-col">
      <div className="flex-1">
        {fecha && <p className="label-wellness mb-3">{fecha}</p>}
        <h3 className="text-xl text-tierra mb-2">{evento.nombre}</h3>
        {evento.lugar && <p className="text-tierra-light text-xs mb-2">{evento.lugar}</p>}
        {evento.descripcion && (
          <p className="text-tierra-light text-sm leading-relaxed line-clamp-3">{evento.descripcion}</p>
        )}
      </div>
      <div className="mt-6 pt-6 border-t border-beige-lino flex items-center justify-between">
        {etiquetaPrecio && (
          <p className="text-xl font-light text-tierra">{etiquetaPrecio}</p>
        )}
        <Link href={`/eventos/${evento.id}`} className="btn-primary text-xs ml-auto">
          Ver más
        </Link>
      </div>
    </div>
  );
}
