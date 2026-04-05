import { Router, Response } from 'express';
import { requireAuth } from '../../middleware/auth';
import { requireRole } from '../../middleware/requireRole';
import { getPaquetesCatalogo, getMisPaquetes, otorgarPaquete } from '../../services/paquetes.service';
import type { AuthenticatedRequest } from '../../middleware/auth';

const router = Router();

router.get('/', async (_req, res: Response): Promise<void> => {
  try {
    const paquetes = await getPaquetesCatalogo();
    res.json(paquetes);
  } catch (err: unknown) {
    res.status(500).json({ error: err instanceof Error ? err.message : 'Error' });
  }
});

router.get('/mis-paquetes', requireAuth, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const paquetes = await getMisPaquetes(req.userId!);
    res.json(paquetes);
  } catch (err: unknown) {
    res.status(500).json({ error: err instanceof Error ? err.message : 'Error' });
  }
});

router.post('/otorgar', requireAuth, requireRole('admin'), async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { user_id, paquete_id, monto } = req.body;
    if (!user_id || !paquete_id || monto === undefined) {
      res.status(400).json({ error: 'user_id, paquete_id y monto son requeridos' });
      return;
    }
    const paqueteUsuario = await otorgarPaquete(user_id, paquete_id, Number(monto));
    res.status(201).json(paqueteUsuario);
  } catch (err: unknown) {
    res.status(400).json({ error: err instanceof Error ? err.message : 'Error' });
  }
});

export default router;
