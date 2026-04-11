import { Router, Response, Request } from 'express';
import { requireAuth } from '../../middleware/auth';
import { requireRole } from '../../middleware/requireRole';
import { getClases, createClase, createClasesBatch, updateClase, deleteClase } from '../../services/clases.service';
import type { AuthenticatedRequest } from '../../middleware/auth';

const router = Router();

router.get('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const tipo = req.query.tipo as string | undefined;
    const desde = req.query.desde as string | undefined;
    const hasta = req.query.hasta as string | undefined;
    const clases = await getClases(tipo, desde, hasta);
    res.json(clases);
  } catch (err: unknown) {
    res.status(500).json({ error: err instanceof Error ? err.message : 'Error' });
  }
});

router.post('/batch', requireAuth, requireRole('admin'), async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { clases } = req.body;
    if (!Array.isArray(clases) || clases.length === 0) {
      res.status(400).json({ error: 'clases debe ser un array no vacío' });
      return;
    }
    const created = await createClasesBatch(clases);
    res.status(201).json({ created: created.length, clases: created });
  } catch (err: unknown) {
    res.status(400).json({ error: err instanceof Error ? err.message : 'Error' });
  }
});

router.post('/', requireAuth, requireRole('admin'), async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { nombre, inicio, fin, capacidad } = req.body;
    if (!nombre || !inicio || !fin || !capacidad) {
      res.status(400).json({ error: 'nombre, inicio, fin y capacidad son requeridos' });
      return;
    }
    const clase = await createClase(req.body);
    res.status(201).json(clase);
  } catch (err: unknown) {
    res.status(400).json({ error: err instanceof Error ? err.message : 'Error' });
  }
});

router.patch('/:id', requireAuth, requireRole('admin'), async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const clase = await updateClase(req.params.id, req.body);
    res.json(clase);
  } catch (err: unknown) {
    res.status(400).json({ error: err instanceof Error ? err.message : 'Error' });
  }
});

router.delete('/:id', requireAuth, requireRole('admin'), async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    await deleteClase(req.params.id);
    res.status(204).send();
  } catch (err: unknown) {
    res.status(400).json({ error: err instanceof Error ? err.message : 'Error' });
  }
});

export default router;
