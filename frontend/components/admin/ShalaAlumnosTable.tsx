interface Alumno {
  id: string;
  nombre: string;
  email: string;
  telefono?: string;
  created_at: string;
  paquetes_usuario: Array<{
    id: string;
    clases_restantes: number;
    expira_en: string;
    activo: boolean;
  }>;
}

export default function ShalaAlumnosTable({ alumnos }: { alumnos: Alumno[] }) {
  if (alumnos.length === 0) {
    return (
      <div className="card-wellness text-center py-12">
        <p className="text-tierra-light text-sm">No hay alumnos registrados</p>
      </div>
    );
  }

  return (
    <div className="bg-white border border-beige-lino rounded-wellness overflow-hidden">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-beige-lino">
            <th className="label-wellness text-left px-4 py-3">Nombre</th>
            <th className="label-wellness text-left px-4 py-3">Email</th>
            <th className="label-wellness text-left px-4 py-3">Teléfono</th>
            <th className="label-wellness text-left px-4 py-3">Créditos</th>
            <th className="label-wellness text-left px-4 py-3">Expira</th>
            <th className="label-wellness text-left px-4 py-3">Registrada</th>
          </tr>
        </thead>
        <tbody>
          {alumnos.map((a, i) => {
            const paqueteActivo = a.paquetes_usuario?.find(
              p => p.activo && p.clases_restantes > 0 && new Date(p.expira_en) > new Date()
            );
            return (
              <tr
                key={a.id}
                className={`border-b border-beige-lino last:border-0 hover:bg-beige transition-colors ${
                  i % 2 === 0 ? 'bg-white' : 'bg-beige/30'
                }`}
              >
                <td className="px-4 py-3 text-tierra">{a.nombre}</td>
                <td className="px-4 py-3 text-tierra-mid">{a.email}</td>
                <td className="px-4 py-3 text-tierra-light">{a.telefono ?? '—'}</td>
                <td className="px-4 py-3">
                  {paqueteActivo ? (
                    <span className="bg-sage-muted text-sage text-xs px-2 py-1 rounded-full">
                      {paqueteActivo.clases_restantes} clases
                    </span>
                  ) : (
                    <span className="text-tierra-light text-xs">Sin paquete</span>
                  )}
                </td>
                <td className="px-4 py-3 text-tierra-light text-xs">
                  {paqueteActivo
                    ? new Date(paqueteActivo.expira_en).toLocaleDateString('es-MX')
                    : '—'}
                </td>
                <td className="px-4 py-3 text-tierra-light text-xs">
                  {new Date(a.created_at).toLocaleDateString('es-MX')}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
