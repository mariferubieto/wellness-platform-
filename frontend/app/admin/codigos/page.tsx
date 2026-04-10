'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';

interface Codigo {
  id: string;
  codigo: string;
  descripcion?: string;
  descuento_tipo: 'porcentaje' | 'monto_fijo';
  descuento_valor: number;
  aplicable_a: string[];
  activo: boolean;
  usos_maximos?: number;
  usos_actuales: number;
  expira_en?: string;
}

const CONCEPTOS = [
  { value: 'paquete_shala', label: 'Paquetes Shala' },
  { value: 'diplomado', label: 'Diplomados Ayurveda' },
  { value: 'retiro', label: 'Retiros' },
  { value: 'evento', label: 'Eventos' },
];

export default function AdminCodigosPage() {
  const [codigos, setCodigos] = useState<Codigo[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');
  const [form, setForm] = useState({
    codigo: '',
    descripcion: '',
    descuento_tipo: 'porcentaje',
    descuento_valor: '',
    aplicable_a: ['paquete_shala', 'diplomado', 'retiro', 'evento'],
    usos_maximos: '',
    expira_en: '',
  });

  useEffect(() => {
    api.get<Codigo[]>('/api/codigos')
      .then(setCodigos)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  function showMsg(m: string) {
    setMsg(m);
    setTimeout(() => setMsg(''), 3000);
  }

  function toggleConcepto(val: string) {
    setForm(prev => ({
      ...prev,
      aplicable_a: prev.aplicable_a.includes(val)
        ? prev.aplicable_a.filter(x => x !== val)
        : [...prev.aplicable_a, val],
    }));
  }

  async function crearCodigo(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const nuevo = await api.post<Codigo>('/api/codigos', {
        codigo: form.codigo.toUpperCase(),
        descripcion: form.descripcion || undefined,
        descuento_tipo: form.descuento_tipo,
        descuento_valor: Number(form.descuento_valor),
        aplicable_a: form.aplicable_a,
        usos_maximos: form.usos_maximos ? Number(form.usos_maximos) : undefined,
        expira_en: form.expira_en || undefined,
      });
      setCodigos(prev => [nuevo, ...prev]);
      setForm({ codigo: '', descripcion: '', descuento_tipo: 'porcentaje', descuento_valor: '', aplicable_a: ['paquete_shala', 'diplomado', 'retiro', 'evento'], usos_maximos: '', expira_en: '' });
      showMsg('Código creado');
    } catch (err: unknown) {
      showMsg(err instanceof Error ? err.message : 'Error');
    } finally { setSaving(false); }
  }

  async function toggleActivo(id: string, activo: boolean) {
    try {
      const updated = await api.patch<Codigo>(`/api/codigos/${id}`, { activo: !activo });
      setCodigos(prev => prev.map(c => c.id === id ? updated : c));
    } catch { showMsg('Error al actualizar'); }
  }

  return (
    <div>
      <div className="mb-8">
        <div className="w-8 h-px bg-sand mb-4" />
        <h1 className="text-3xl text-tierra">Códigos Promocionales</h1>
      </div>

      {msg && <div className="mb-4 p-3 bg-sage-muted border border-sage text-sage text-sm rounded-wellness">{msg}</div>}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div>
          <h2 className="text-lg text-tierra mb-4">Nuevo código</h2>
          <form onSubmit={crearCodigo} className="card-wellness space-y-4">
            <Input label="Código (se guarda en mayúsculas)" value={form.codigo}
              onChange={e => setForm(p => ({ ...p, codigo: e.target.value.toUpperCase() }))}
              required placeholder="BIENVENIDA20" />
            <Input label="Descripción (opcional)" value={form.descripcion}
              onChange={e => setForm(p => ({ ...p, descripcion: e.target.value }))}
              placeholder="Descuento de bienvenida" />
            <div>
              <label className="label-wellness">Tipo de descuento</label>
              <select value={form.descuento_tipo} onChange={e => setForm(p => ({ ...p, descuento_tipo: e.target.value }))}
                className="input-wellness w-full mt-1">
                <option value="porcentaje">Porcentaje (%)</option>
                <option value="monto_fijo">Monto fijo (MXN)</option>
              </select>
            </div>
            <Input label={form.descuento_tipo === 'porcentaje' ? 'Descuento (%)' : 'Descuento (MXN)'}
              type="number" value={form.descuento_valor}
              onChange={e => setForm(p => ({ ...p, descuento_valor: e.target.value }))} required />
            <div>
              <label className="label-wellness mb-2 block">Aplica para</label>
              <div className="flex flex-wrap gap-2">
                {CONCEPTOS.map(c => (
                  <button key={c.value} type="button" onClick={() => toggleConcepto(c.value)}
                    className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
                      form.aplicable_a.includes(c.value)
                        ? 'bg-sage text-white border-sage'
                        : 'bg-white text-tierra-light border-beige-lino'
                    }`}>
                    {c.label}
                  </button>
                ))}
              </div>
            </div>
            <Input label="Usos máximos (opcional)" type="number" value={form.usos_maximos}
              onChange={e => setForm(p => ({ ...p, usos_maximos: e.target.value }))}
              placeholder="Dejar vacío = ilimitado" />
            <Input label="Fecha de expiración (opcional)" type="date" value={form.expira_en}
              onChange={e => setForm(p => ({ ...p, expira_en: e.target.value }))} />
            <Button type="submit" loading={saving}>Crear código</Button>
          </form>
        </div>

        <div>
          <h2 className="text-lg text-tierra mb-4">Códigos ({codigos.length})</h2>
          {loading ? (
            <p className="text-tierra-light text-sm tracking-widest uppercase">Cargando...</p>
          ) : codigos.length === 0 ? (
            <div className="card-wellness text-center py-8"><p className="text-tierra-light text-sm">No hay códigos</p></div>
          ) : (
            <div className="space-y-3">
              {codigos.map(c => (
                <div key={c.id} className={`card-wellness py-3 ${!c.activo ? 'opacity-50' : ''}`}>
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-tierra font-mono font-bold tracking-wider">{c.codigo}</p>
                      {c.descripcion && <p className="text-tierra-light text-xs mt-0.5">{c.descripcion}</p>}
                      <p className="text-sage text-xs mt-1">
                        {c.descuento_tipo === 'porcentaje' ? `${c.descuento_valor}% descuento` : `$${c.descuento_valor} MXN`}
                      </p>
                      <p className="text-tierra-light text-xs">
                        Usos: {c.usos_actuales}{c.usos_maximos ? `/${c.usos_maximos}` : ''}
                        {c.expira_en && ` · Expira: ${new Date(c.expira_en).toLocaleDateString('es-MX')}`}
                      </p>
                    </div>
                    <button onClick={() => toggleActivo(c.id, c.activo)}
                      className={`text-xs px-2 py-1 rounded-full border shrink-0 transition-colors ${
                        c.activo ? 'bg-sage-muted text-sage border-sage' : 'bg-beige-lino text-tierra-light border-beige-lino'
                      }`}>
                      {c.activo ? 'Activo' : 'Inactivo'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
