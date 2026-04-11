interface Paquete {
  id: string;
  nombre: string;
  num_clases: number;
  precio: number;
  vigencia_dias: number;
}

interface PaqueteCardProps {
  paquete: Paquete;
  onSeleccionar?: (id: string) => void;
}

export default function PaqueteCard({ paquete, onSeleccionar }: PaqueteCardProps) {
  return (
    <div className="card-wellness flex flex-col">
      <div className="flex-1">
        <p className="label-wellness mb-3">{paquete.num_clases} clases</p>
        <h3 className="text-xl text-tierra mb-2">{paquete.nombre}</h3>
        <p className="text-tierra-light text-sm">Vigencia: {paquete.vigencia_dias} días</p>
      </div>
      <div className="mt-6 pt-6 border-t border-beige-lino flex items-center justify-between">
        <p className="text-2xl font-light text-tierra">
          ${paquete.precio.toLocaleString('es-MX')} <span className="text-sm text-tierra-light">MXN</span>
        </p>
        {onSeleccionar && (
          <button
            onClick={() => onSeleccionar(paquete.id)}
            className="btn-primary text-xs"
          >
            Seleccionar
          </button>
        )}
      </div>
    </div>
  );
}
