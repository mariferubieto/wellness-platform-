// backend/src/services/behavior.service.ts
import { supabaseAdmin } from '../config/supabase';

const PAGE_TAG_MAP: Record<string, string> = {
  '/shala': 'yoga',
  '/ayurveda': 'ayurveda',
  '/retiros': 'retiros',
  '/eventos': 'eventos',
  '/contenido': 'contenido',
  '/contenido/blog': 'contenido',
  '/contenido/videos': 'contenido',
};

export async function logEvent(params: {
  tipo: string;
  pagina?: string;
  accion?: string;
  metadata?: Record<string, unknown>;
  user_id?: string;
  lead_id?: string;
}): Promise<void> {
  await supabaseAdmin.from('behavior_events').insert({
    tipo: params.tipo,
    pagina: params.pagina ?? null,
    accion: params.accion ?? null,
    metadata: params.metadata ?? {},
    user_id: params.user_id ?? null,
    lead_id: params.lead_id ?? null,
  });

  if (params.pagina) {
    const tag = getTagForPage(params.pagina);
    if (tag) {
      if (params.user_id) await addTagToUser(params.user_id, tag);
      if (params.lead_id) await addTagToLead(params.lead_id, tag);
    }
  }
}

function getTagForPage(pagina: string): string | null {
  if (PAGE_TAG_MAP[pagina]) return PAGE_TAG_MAP[pagina];
  const prefix = Object.keys(PAGE_TAG_MAP).find(k => pagina.startsWith(k + '/'));
  return prefix ? PAGE_TAG_MAP[prefix] : null;
}

async function addTagToUser(userId: string, tag: string): Promise<void> {
  const { data: user } = await supabaseAdmin
    .from('users')
    .select('tags')
    .eq('id', userId)
    .single();

  if (!user) return;
  const currentTags: string[] = user.tags ?? [];
  if (currentTags.includes(tag)) return;

  await supabaseAdmin
    .from('users')
    .update({ tags: [...currentTags, tag] })
    .eq('id', userId);
}

async function addTagToLead(leadId: string, tag: string): Promise<void> {
  const { data: lead } = await supabaseAdmin
    .from('leads')
    .select('intereses')
    .eq('id', leadId)
    .single();

  if (!lead) return;
  const current: string[] = lead.intereses ?? [];
  if (current.includes(tag)) return;

  await supabaseAdmin
    .from('leads')
    .update({ intereses: [...current, tag] })
    .eq('id', leadId);
}
