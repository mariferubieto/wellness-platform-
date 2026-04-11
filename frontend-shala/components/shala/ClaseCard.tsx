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
  maestros?: { id: string; users: { nombre: string } } | null;
}

interface ClaseCardProps {
  clase: Clase;
  onReservar?: (id: string) => void;
  reservando?: boolean;
  yaReservada?: boolean;
  tieneCreditos?: boolean;
}

export default function ClaseCard({ clase, onReservar, reservando, yaReservada, tieneCreditos }: ClaseCardProps) {
  const inicio = new Date(clase.inicio);
  const fin = new Date(clase.fin);
  const cuposLibres = clase.capacidad - clase.cupo_actual;
  const llena = cuposLibres === 0;

  const horaInicio = inicio.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' });
  const horaFin = fin.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' });
  const fechaStr = inicio.toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long' });

  return (
    <div className={`card-wellness ${llena ? 'opacity-60' : ''}`}>
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="label-wellness mb-1">{fechaStr}</p>
          <h3 className="text-lg text-tierra">{clase.nombre}</h3>
          {clase.maestros?.users?.nombre && (
            <p className="text-tierra-light text-sm mt-1">{clase.maestros.users.nombre}</p>
          )}
          <p className="text-tierra-mid text-sm mt-2">
            {horaInicio} – {horaFin}
          </p>
        </div>
        <div className="text-right ml-4">
          <span className={`text-xs px-2 py-1 rounded-full ${
            llena
              ? 'bg-red-50 text-red-400'
              : cuposLibres <= 3
              ? 'bg-sand/20 text-tierra-mid'
              : 'bg-sage-muted text-sage'
          }`}>
            {llena ? 'Llena' : `${cuposLibres} lugar${cuposLibres !== 1 ? 'es' : ''}`}
          </span>
        </div>
      </div>

      {clase.descripcion && (
        <p className="text-tierra-light text-xs mt-3 leading-relaxed">{clase.descripcion}</p>
      )}

      {onReservar && (
        <div className="mt-4 pt-4 border-t border-beige-lino">
          {yaReservada ? (
            <span className="text-sage text-xs tracking-widest uppercase">✓ Reservada</span>
          ) : llena ? (
            <span className="text-tierra-light text-xs">Sin cupo</span>
          ) : !tieneCreditos ? (
            <span className="text-tierra-light text-xs">Necesitas un paquete activo</span>
          ) : (
            <button
              onClick={() => onReservar(clase.id)}
              disabled={reservando}
              className="btn-primary text-xs disabled:opacity-50"
            >
              {reservando ? 'Reservando...' : 'Reservar'}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
