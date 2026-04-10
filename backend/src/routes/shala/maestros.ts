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
    const { nombre, bio, foto_url, user_id } = req.body;
    if (!nombre) {
      res.status(400).json({ error: 'nombre es requerido' });
      return;
    }
    const maestro = await createMaestro(nombre, bio, foto_url, user_id);
    res.status(201).json(maestro);
  } catch (err: unknown) {
    res.status(400).json({ error: err instanceof Error ? err.message : 'Error' });
  }
});

export default router;
