import { Router, Request, Response } from 'express';
import { requireAuth } from '../middleware/auth';
import { requireRole } from '../middleware/requireRole';
import type { AuthenticatedRequest } from '../middleware/auth';
import { supabaseAdmin } from '../config/supabase';

const router = Router();

// Public: save a lead from the popup
router.post('/', async (req: Request, res: Response): Promise<void> => {
  const { email, telefono, ciudad, pais } = req.body;
  if (!email || !email.includes('@')) {
    res.status(400).json({ error: 'email válido es requerido' });
    return;
  }
  const { data, error } = await supabaseAdmin
    .from('comunidad_leads')
    .insert({ email, telefono: telefono ?? null, ciudad: ciudad ?? null, pais: pais ?? null })
    .select('id, email')
    .single();
  if (error) { res.status(400).json({ error: error.message }); return; }
  res.status(201).json(data);
});

// Admin: list all leads
router.get('/', requireAuth, requireRole('admin'), async (_req: AuthenticatedRequest, res: Response): Promise<void> => {
  const { data, error } = await supabaseAdmin
    .from('comunidad_leads')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) { res.status(500).json({ error: error.message }); return; }
  res.json(data ?? []);
});

export default router;
