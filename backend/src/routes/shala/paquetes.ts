import { Router, Response } from 'express';
import { requireAuth } from '../../middleware/auth';
import { requireRole } from '../../middleware/requireRole';
import { getPaquetesCatalogo, getMisPaquetes, otorgarPaquete, createPaqueteCatalogo } from '../../services/paquetes.service';
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

router.post('/', requireAuth, requireRole('admin'), async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { nombre, num_clases, precio, vigencia_dias } = req.body;
    if (!nombre || !num_clases || precio === undefined) {
      res.status(400).json({ error: 'nombre, num_clases y precio son requeridos' });
      return;
    }
    const paquete = await createPaqueteCatalogo({ nombre, num_clases: Number(num_clases), precio: Number(precio), vigencia_dias: Number(vigencia_dias ?? 30) });
    res.status(201).json(paquete);
  } catch (err: unknown) {
    res.status(400).json({ error: err instanceof Error ? err.message : 'Error' });
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
