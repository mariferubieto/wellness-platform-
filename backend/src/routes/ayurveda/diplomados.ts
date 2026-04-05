import { Router, Request, Response } from 'express';
import { requireAuth } from '../../middleware/auth';
import { requireRole } from '../../middleware/requireRole';
import type { AuthenticatedRequest } from '../../middleware/auth';
import {
  getDiplomados,
  getDiplomadoById,
  createDiplomado,
  updateDiplomado,
} from '../../services/diplomados.service';

const router = Router();

// Public: catalog
router.get('/', async (_req: Request, res: Response): Promise<void> => {
  try {
    const diplomados = await getDiplomados();
    res.json(diplomados);
  } catch (err: unknown) {
    res.status(500).json({ error: err instanceof Error ? err.message : 'Error' });
  }
});

// Public: detail
router.get('/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const diplomado = await getDiplomadoById(req.params.id);
    res.json(diplomado);
  } catch (err: unknown) {
    res.status(404).json({ error: err instanceof Error ? err.message : 'No encontrado' });
  }
});

// Admin: create
router.post('/', requireAuth, requireRole('admin'), async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { nombre, descripcion, temario, calendario, precio, generacion } = req.body;
    if (!nombre || precio === undefined || !generacion) {
      res.status(400).json({ error: 'nombre, precio y generacion son requeridos' });
      return;
    }
    const diplomado = await createDiplomado({ nombre, descripcion, temario, calendario, precio: Number(precio), generacion });
    res.status(201).json(diplomado);
  } catch (err: unknown) {
    res.status(400).json({ error: err instanceof Error ? err.message : 'Error' });
  }
});

// Admin: update
router.patch('/:id', requireAuth, requireRole('admin'), async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const diplomado = await updateDiplomado(req.params.id, req.body);
    res.json(diplomado);
  } catch (err: unknown) {
    res.status(400).json({ error: err instanceof Error ? err.message : 'Error' });
  }
});

export default router;
