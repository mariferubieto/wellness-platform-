interface Contact {
  id: string;
  nombre?: string;
  email?: string;
  telefono?: string;
  fuente?: string;
  tags?: string[];
  intereses?: string[];
  estado?: string;
  created_at: string;
  tipo: 'usuario' | 'lead';
}

interface CRMTableProps {
  contacts: Contact[];
}

export default function CRMTable({ contacts }: CRMTableProps) {
  if (contacts.length === 0) {
    return (
      <div className="card-wellness text-center py-12">
        <p className="text-tierra-light text-sm">No hay contactos que mostrar</p>
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
            <th className="label-wellness text-left px-4 py-3">Fuente</th>
            <th className="label-wellness text-left px-4 py-3">Tipo</th>
            <th className="label-wellness text-left px-4 py-3">Fecha</th>
          </tr>
        </thead>
        <tbody>
          {contacts.map((c, i) => (
            <tr
              key={c.id}
              className={`border-b border-beige-lino last:border-0 hover:bg-beige transition-colors ${
                i % 2 === 0 ? 'bg-white' : 'bg-beige/30'
              }`}
            >
              <td className="px-4 py-3 text-tierra">{c.nombre ?? '—'}</td>
              <td className="px-4 py-3 text-tierra-mid">{c.email ?? '—'}</td>
              <td className="px-4 py-3 text-tierra-light">{c.telefono ?? '—'}</td>
              <td className="px-4 py-3">
                <span className="bg-sage-muted text-sage text-xs px-2 py-1 rounded-full">
                  {c.fuente ?? '—'}
                </span>
              </td>
              <td className="px-4 py-3">
                <span className={`text-xs px-2 py-1 rounded-full ${
                  c.tipo === 'usuario'
                    ? 'bg-sand/20 text-tierra-mid'
                    : 'bg-beige-lino text-tierra-light'
                }`}>
                  {c.tipo === 'usuario' ? 'Usuaria' : 'Lead'}
                </span>
              </td>
              <td className="px-4 py-3 text-tierra-light">
                {new Date(c.created_at).toLocaleDateString('es-MX')}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
