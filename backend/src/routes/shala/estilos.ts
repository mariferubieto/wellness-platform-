import { Router, Response } from 'express';
import { requireAuth } from '../../middleware/auth';
import { requireRole } from '../../middleware/requireRole';
import { supabaseAdmin } from '../../config/supabase';
import type { AuthenticatedRequest } from '../../middleware/auth';

const router = Router();

router.get('/', async (_req, res: Response): Promise<void> => {
  const { data, error } = await supabaseAdmin
    .from('estilos_clase')
    .select('id, nombre, descripcion, activo')
    .eq('activo', true)
    .order('nombre');
  if (error) { res.status(500).json({ error: error.message }); return; }
  res.json(data ?? []);
});

router.post('/', requireAuth, requireRole('admin'), async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const { nombre, descripcion } = req.body;
  if (!nombre) { res.status(400).json({ error: 'nombre es requerido' }); return; }
  const { data, error } = await supabaseAdmin
    .from('estilos_clase')
    .insert({ nombre, descripcion: descripcion ?? null })
    .select()
    .single();
  if (error) { res.status(400).json({ error: error.message }); return; }
  res.status(201).json(data);
});

router.delete('/:id', requireAuth, requireRole('admin'), async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const { error } = await supabaseAdmin
    .from('estilos_clase')
    .update({ activo: false })
    .eq('id', req.params.id);
  if (error) { res.status(400).json({ error: error.message }); return; }
  res.status(204).send();
});

export default router;
