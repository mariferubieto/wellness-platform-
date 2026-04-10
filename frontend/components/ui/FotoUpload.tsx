'use client';

import { useState, useRef } from 'react';
import { createSupabaseClient } from '@/lib/supabase';

interface FotoUploadProps {
  value?: string;
  onChange: (url: string) => void;
  bucket?: string;
  folder?: string;
}

export default function FotoUpload({ value, onChange, bucket = 'fotos', folder = 'maestros' }: FotoUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setError('Solo se permiten imágenes');
      return;
    }

    setUploading(true);
    setError('');

    try {
      const supabase = createSupabaseClient();
      const ext = file.name.split('.').pop();
      const path = `${folder}/${Date.now()}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from(bucket)
        .upload(path, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data } = supabase.storage.from(bucket).getPublicUrl(path);
      onChange(data.publicUrl);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error al subir foto');
    } finally {
      setUploading(false);
    }
  }

  return (
    <div>
      <label className="label-wellness">Foto</label>
      <div className="mt-1 flex items-center gap-3">
        {value && (
          <img src={value} alt="Foto" className="w-14 h-14 rounded-full object-cover border border-beige-lino" />
        )}
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className="btn-secondary text-xs"
        >
          {uploading ? 'Subiendo...' : value ? 'Cambiar foto' : 'Subir foto'}
        </button>
        <input ref={inputRef} type="file" accept="image/*" onChange={handleFile} className="hidden" />
      </div>
      {error && <p className="text-red-400 text-xs mt-1">{error}</p>}
    </div>
  );
}
