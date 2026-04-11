'use client';

interface Clase {
  id: string;
  nombre: string;
  descripcion?: string;
  inicio: string;
  fin: string;
  capacidad: number;
  cupo_actual: number;
  tipo: 'regular' | 'especial';
  precio_especial?: number;
  espacio_tipo?: 'salon' | 'jardin';
  maestros?: { id: string; users: { nombre: string } } | null;
}

interface ClaseCardProps {
  clase: Clase;
  onReservar?: (id: string) => void;
  onCancelar?: (id: string) => void;
  reservando?: boolean;
  cancelando?: boolean;
  yaReservada?: boolean;
  tieneCreditos?: boolean;
  reservaId?: string;
}

const ESPACIO_LABELS: Record<string, string> = {
  salon: 'Salón',
  jardin: 'Jardín',
};

export default function ClaseCard({
  clase, onReservar, onCancelar, reservando, cancelando, yaReservada, tieneCreditos, reservaId
}: ClaseCardProps) {
  const inicio = new Date(clase.inicio);
  const fin = new Date(clase.fin);
  const cuposLibres = clase.capacidad - clase.cupo_actual;
  const llena = cuposLibres === 0;

  const horaInicio = inicio.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' });
  const horaFin = fin.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' });

  return (
    <div className={`card-wellness ${llena && !yaReservada ? 'opacity-60' : ''}`}>
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <h3 className="text-base text-tierra font-medium">{clase.nombre}</h3>
          {clase.maestros?.users?.nombre && (
            <p className="text-tierra-light text-sm mt-0.5">{clase.maestros.users.nombre}</p>
          )}
          <p className="text-tierra-mid text-sm mt-1">{horaInicio} – {horaFin}</p>
          {clase.espacio_tipo && (
            <p className="text-tierra-light text-xs mt-0.5">{ESPACIO_LABELS[clase.espacio_tipo]}</p>
          )}
        </div>
        <div className="text-right ml-4 space-y-1">
          <span className={`block text-xs px-2 py-1 rounded-full ${
            llena ? 'bg-red-50 text-red-400'
            : cuposLibres <= 3 ? 'bg-sand/20 text-tierra-mid'
            : 'bg-sage-muted text-sage'
          }`}>
            {llena ? 'Llena' : `${cuposLibres} lugar${cuposLibres !== 1 ? 'es' : ''}`}
          </span>
        </div>
      </div>

      {clase.descripcion && (
        <p className="text-tierra-light text-xs mt-3 leading-relaxed">{clase.descripcion}</p>
      )}

      {(onReservar || onCancelar) && (
        <div className="mt-4 pt-4 border-t border-beige-lino">
          {yaReservada ? (
            <div className="flex items-center justify-between">
              <span className="text-sage text-xs tracking-widest uppercase">✓ Reservada</span>
              {onCancelar && reservaId && (
                <button
                  onClick={() => onCancelar(reservaId)}
                  disabled={cancelando}
                  className="text-tierra-light text-xs hover:text-red-400 transition-colors disabled:opacity-50"
                >
                  {cancelando ? 'Cancelando...' : 'Cancelar reserva'}
                </button>
              )}
            </div>
          ) : llena ? (
            <span className="text-tierra-light text-xs">Sin cupo</span>
          ) : !tieneCreditos ? (
            <span className="text-tierra-light text-xs">Necesitas un paquete activo</span>
          ) : onReservar ? (
            <button
              onClick={() => onReservar(clase.id)}
              disabled={reservando}
              className="btn-primary text-xs disabled:opacity-50"
            >
              {reservando ? 'Reservando...' : 'Reservar'}
            </button>
          ) : null}
        </div>
      )}
    </div>
  );
}
