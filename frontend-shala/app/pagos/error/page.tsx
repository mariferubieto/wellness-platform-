// frontend/app/pagos/error/page.tsx
'use client';

import Link from 'next/link';
import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';

function ErrorContent() {
  const params = useSearchParams();
  const pagoId = params.get('pago_id');

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="max-w-md w-full text-center">
        <div className="w-16 h-px bg-sand mx-auto mb-8" />
        <h1 className="text-4xl text-tierra mb-4">Pago no completado</h1>
        <p className="text-tierra-light leading-relaxed mb-2">
          Hubo un problema al procesar tu pago.
        </p>
        {pagoId && (
          <p className="text-tierra-light text-xs mb-8">Referencia: {pagoId}</p>
        )}
        <p className="text-tierra-light text-sm mb-10">
          No se realizó ningún cargo. Puedes intentarlo de nuevo o contactarnos.
        </p>
        <div className="space-y-3">
          <button onClick={() => window.history.back()} className="btn-primary w-full">
            Intentar de nuevo
          </button>
          <Link href="/" className="btn-secondary block text-center">
            Regresar al inicio
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function PagoErrorPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><p className="text-tierra-light text-sm tracking-widest uppercase">Cargando...</p></div>}>
      <ErrorContent />
    </Suspense>
  );
}
