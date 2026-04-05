import { Router, Response } from 'express';
import { requireAuth } from '../../middleware/auth';
import { requireRole } from '../../middleware/requireRole';
import { getMaestros, createMaestro } from '../../services/maestros.service';
import type { AuthenticatedRequest } from '../../middleware/auth';

const router = Router();

router.get('/', async (_req, res: Response): Promise<void> => {
  try {
    const maestros = await getMaestros();
    res.json(maestros);
  } catch (err: unknown) {
    res.status(500).json({ error: err instanceof Error ? err.message : 'Error' });
  }
});

router.post('/', requireAuth, requireRole('admin'), async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { user_id, bio, foto_url } = req.body;
    if (!user_id) {
      res.status(400).json({ error: 'user_id es requerido' });
      return;
    }
    const maestro = await createMaestro(user_id, bio, foto_url);
    res.status(201).json(maestro);
  } catch (err: unknown) {
    res.status(400).json({ error: err instanceof Error ? err.message : 'Error' });
  }
});

export default router;
