// frontend/components/ui/BehaviorTracker.tsx
'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';

export default function BehaviorTracker() {
  const pathname = usePathname();

  useEffect(() => {
    const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

    async function track() {
      try {
        let userId: string | undefined;
        const { createSupabaseClient } = await import('@/lib/supabase');
        const supabase = createSupabaseClient();
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          userId = session.user.id;
        }

        await fetch(`${API_URL}/api/behavior/track`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            tipo: 'page_view',
            pagina: pathname,
            user_id: userId,
          }),
        });
      } catch {
        // Never block the user over tracking errors
      }
    }

    track();
  }, [pathname]);

  return null;
}
