'use client';

import Link from 'next/link';

interface Diplomado {
  id: string;
  nombre: string;
  descripcion?: string;
  temario?: string[];
  calendario?: string[];
  precio: number;
  generacion: string;
}

interface Curso {
  id: string;
  nombre: string;
  descripcion?: string;
  temario?: string[];
  fechas?: string[];
  precio: number;
  foto_url?: string;
  tipo_acceso: 'pago' | 'whatsapp' | 'gratis';
}

type ModalItem =
  | { kind: 'diplomado'; data: Diplomado }
  | { kind: 'curso'; data: Curso };

interface Props {
  item: ModalItem;
  onClose: () => void;
}

export default function ModalDetalleCurso({ item, onClose }: Props) {
  const { kind, data } = item;

  return (
    <div
      className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-wellness max-w-lg w-full max-h-[90vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        {/* Imagen header para cursos con foto */}
        {kind === 'curso' && data.foto_url && (
          <img
            src={data.foto_url}
            alt={data.nombre}
            className="w-full h-48 object-cover rounded-t-wellness"
          />
        )}

        <div className="p-8">
          {/* Badge + título + botón cerrar */}
          <div className="flex items-start justify-between mb-6">
            <div>
              <p className="label-wellness mb-1">
                {kind === 'diplomado' ? data.generacion : (
                  kind === 'curso' ? (
                    data.tipo_acceso === 'gratis' ? 'Registro abierto' : 'Curso'
                  ) : ''
                )}
              </p>
              <h2 className="text-2xl text-tierra">{data.nombre}</h2>
            </div>
            <button
              onClick={onClose}
              className="text-tierra-light hover:text-tierra transition-colors ml-4 text-lg"
              aria-label="Cerrar"
            >
              ✕
            </button>
          </div>

          {/* Descripción */}
          {data.descripcion && (
            <p className="text-tierra-mid text-sm leading-relaxed mb-6">{data.descripcion}</p>
          )}

          {/* Temario */}
          {data.temario && data.temario.length > 0 && (
            <div className="mb-6">
              <div className="w-6 h-px bg-sand mb-3" />
              <p className="label-wellness mb-2">Temario</p>
              <ul className="space-y-1">
                {data.temario.map((item, i) => (
                  <li key={i} className="text-tierra-light text-sm flex gap-2">
                    <span className="text-sand mt-0.5">·</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Calendario (diplomado) */}
          {kind === 'diplomado' && data.calendario && data.calendario.length > 0 && (
            <div className="mb-6">
              <div className="w-6 h-px bg-sand mb-3" />
              <p className="label-wellness mb-2">Calendario</p>
              <ul className="space-y-1">
                {data.calendario.map((f, i) => (
                  <li key={i} className="text-tierra-light text-sm flex gap-2">
                    <span className="text-sand mt-0.5">·</span>
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Fechas (curso) */}
          {kind === 'curso' && data.fechas && data.fechas.length > 0 && (
            <div className="mb-6">
              <div className="w-6 h-px bg-sand mb-3" />
              <p className="label-wellness mb-2">Fechas</p>
              <ul className="space-y-1">
                {data.fechas.map((f, i) => (
                  <li key={i} className="text-tierra-light text-sm flex gap-2">
                    <span className="text-sand mt-0.5">·</span>
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Precio */}
          {data.precio > 0 && (
            <p className="text-3xl font-light text-tierra mb-8">
              ${data.precio.toLocaleString('es-MX')}
              <span className="text-sm text-tierra-light ml-1">MXN</span>
            </p>
          )}

          {/* Acción — Diplomado */}
          {kind === 'diplomado' && (
            <Link
              href={`/ayurveda/inscripcion?diplomado_id=${data.id}`}
              className="btn-primary w-full text-center block"
            >
              Inscribirme
            </Link>
          )}

          {/* Acción — Curso pago */}
          {kind === 'curso' && data.tipo_acceso === 'pago' && (
            <Link
              href={`/ayurveda/inscripcion?curso_id=${data.id}&nombre=${encodeURIComponent(data.nombre)}&precio=${data.precio}`}
              className="btn-primary w-full text-center block"
            >
              Inscribirme
            </Link>
          )}

          {/* Acción — Curso whatsapp */}
          {kind === 'curso' && data.tipo_acceso === 'whatsapp' && (
            <a
              href={`https://wa.me/52${process.env.NEXT_PUBLIC_WHATSAPP_MARIFER ?? ''}?text=${encodeURIComponent(`Hola, me interesa el curso: ${data.nombre}`)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-primary w-full text-center block"
            >
              Contactar por WhatsApp
            </a>
          )}

          {/* Acción — Curso gratis (recopilación de datos) */}
          {kind === 'curso' && data.tipo_acceso === 'gratis' && (
            <Link
              href={`/ayurveda/inscripcion?curso_id=${data.id}&nombre=${encodeURIComponent(data.nombre)}&modo=leads`}
              className="btn-primary w-full text-center block"
            >
              Inscribirme
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
