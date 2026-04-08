// frontend/app/pagos/pendiente/page.tsx
'use client';

import Link from 'next/link';
import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';

function PendienteContent() {
  const params = useSearchParams();
  const pagoId = params.get('pago_id');

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="max-w-md w-full text-center">
        <div className="w-16 h-px bg-sand mx-auto mb-8" />
        <h1 className="text-4xl text-tierra mb-4">Pago en proceso</h1>
        <p className="text-tierra-light leading-relaxed mb-2">
          Tu pago está siendo procesado por Mercado Pago.
        </p>
        {pagoId && (
          <p className="text-tierra-light text-xs mb-8">Referencia: {pagoId}</p>
        )}
        <p className="text-tierra-light text-sm mb-10">
          Te notificaremos cuando se confirme. Esto puede tardar unos minutos.
        </p>
        <Link href="/" className="btn-secondary block text-center">
          Regresar al inicio
        </Link>
      </div>
    </div>
  );
}

export default function PagoPendientePage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><p className="text-tierra-light text-sm tracking-widest uppercase">Cargando...</p></div>}>
      <PendienteContent />
    </Suspense>
  );
}
