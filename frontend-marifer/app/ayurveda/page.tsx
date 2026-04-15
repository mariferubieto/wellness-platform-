'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import DiplomadoCard from '@/components/ayurveda/DiplomadoCard';
import CursoCard from '@/components/ayurveda/CursoCard';
import ModalDetalleCurso from '@/components/ayurveda/ModalDetalleCurso';

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
  tipo: 'cocina' | 'pranayamas' | 'extras';
  nombre: string;
  descripcion?: string;
  temario?: string[];
  fechas?: string[];
  precio: number;
  foto_url?: string;
  cupo_maximo?: number;
  tipo_acceso: 'pago' | 'whatsapp' | 'gratis';
}

type ModalItem =
  | { kind: 'diplomado'; data: Diplomado }
  | { kind: 'curso'; data: Curso };

type TabId = 'diplomados' | 'cocina' | 'pranayamas' | 'extras';

const TABS: { id: TabId; label: string }[] = [
  { id: 'diplomados', label: 'Diplomados' },
  { id: 'cocina', label: 'Cocina' },
  { id: 'pranayamas', label: 'Pranayamas' },
  { id: 'extras', label: 'Cursos Especiales' },
];

export default function AyurvedaPage() {
  const [activeTab, setActiveTab] = useState<TabId>('diplomados');
  const [diplomados, setDiplomados] = useState<Diplomado[]>([]);
  const [cursosCocina, setCursosCocina] = useState<Curso[]>([]);
  const [cursosPranayamas, setCursosPranayamas] = useState<Curso[]>([]);
  const [cursosExtras, setCursosExtras] = useState<Curso[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<ModalItem | null>(null);

  useEffect(() => {
    Promise.all([
      api.get<Diplomado[]>('/api/ayurveda/diplomados').catch(() => [] as Diplomado[]),
      api.get<Curso[]>('/api/ayurveda/cursos/cocina').catch(() => [] as Curso[]),
      api.get<Curso[]>('/api/ayurveda/cursos/pranayamas').catch(() => [] as Curso[]),
      api.get<Curso[]>('/api/ayurveda/cursos/extras').catch(() => [] as Curso[]),
    ]).then(([d, cocina, pranayamas, extras]) => {
      setDiplomados(d);
      setCursosCocina(cocina);
      setCursosPranayamas(pranayamas);
      setCursosExtras(extras);
    }).finally(() => setLoading(false));
  }, []);

  const cursosByTab: Record<TabId, Curso[]> = {
    diplomados: [],
    cocina: cursosCocina,
    pranayamas: cursosPranayamas,
    extras: cursosExtras,
  };

  return (
    <div className="min-h-screen">
      {/* Encabezado */}
      <section className="px-4 pt-20 pb-12 text-center">
        <div className="max-w-2xl mx-auto">
          <div className="w-16 h-px bg-sand mx-auto mb-8" />
          <h1
            className="text-5xl text-tierra mb-4"
            style={{ fontFamily: 'var(--font-josefin)', fontWeight: 300, letterSpacing: '0.12em' }}
          >
            MANALI AYURVEDA
          </h1>
          <p className="text-tierra-light max-w-lg mx-auto leading-relaxed">
            Formación y experiencias en la ciencia de la vida.
          </p>
        </div>
      </section>

      {/* Tabs */}
      <div className="max-w-5xl mx-auto px-4">
        <div className="flex gap-0 border-b border-beige-lino mb-10 overflow-x-auto">
          {TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-6 py-3 text-xs tracking-widest uppercase whitespace-nowrap transition-colors -mb-px border-b-2 ${
                activeTab === tab.id
                  ? 'border-tierra text-tierra font-medium'
                  : 'border-transparent text-tierra-light hover:text-tierra'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Grid */}
      <div className="max-w-5xl mx-auto px-4 pb-24">
        {loading ? (
          <p className="text-center text-tierra-light text-sm tracking-widest uppercase py-20">
            Cargando...
          </p>
        ) : activeTab === 'diplomados' ? (
          diplomados.length === 0 ? (
            <p className="text-center text-tierra-light text-sm py-20">
              Próximamente nuevas generaciones.
            </p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {diplomados.map(d => (
                <DiplomadoCard
                  key={d.id}
                  diplomado={d}
                  onClick={() => setSelected({ kind: 'diplomado', data: d })}
                />
              ))}
            </div>
          )
        ) : (
          cursosByTab[activeTab].length === 0 ? (
            <p className="text-center text-tierra-light text-sm py-20">
              Próximamente nuevos cursos.
            </p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {cursosByTab[activeTab].map(c => (
                <CursoCard
                  key={c.id}
                  curso={c}
                  onClick={() => setSelected({ kind: 'curso', data: c })}
                />
              ))}
            </div>
          )
        )}
      </div>

      {/* Modal */}
      {selected && (
        <ModalDetalleCurso
          item={selected}
          onClose={() => setSelected(null)}
        />
      )}
    </div>
  );
}
