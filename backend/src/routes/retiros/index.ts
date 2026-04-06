import { Router, Request, Response } from 'express';
import { requireAuth } from '../../middleware/auth';
import { requireRole } from '../../middleware/requireRole';
import type { AuthenticatedRequest } from '../../middleware/auth';
import {
  getRetiros,
  getRetiroById,
  createRetiro,
  updateRetiro,
  crearInscripcionRetiro,
} from '../../services/retiros.service';

const router = Router();

// Public: catalog
router.get('/', async (_req: Request, res: Response): Promise<void> => {
  try {
    const retiros = await getRetiros();
    res.json(retiros);
  } catch (err: unknown) {
    res.status(500).json({ error: err instanceof Error ? err.message : 'Error' });
  }
});

// Public: inscripcion — MUST be before /:id to avoid param capture
router.post('/inscripciones', async (req: Request, res: Response): Promise<void> => {
  try {
    const { retiro_id, nombre_completo, fecha_nacimiento, whatsapp, email, instagram, ciudad, razon, restricciones_alimenticias, user_id } = req.body;

    if (!retiro_id || !nombre_completo || !whatsapp || !email) {
      res.status(400).json({ error: 'retiro_id, nombre_completo, whatsapp y email son requeridos' });
      return;
    }

    const inscripcion = await crearInscripcionRetiro({
      retiro_id, nombre_completo, fecha_nacimiento, whatsapp, email,
      instagram, ciudad, razon, restricciones_alimenticias, user_id,
    });

    res.status(201).json(inscripcion);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Error';
    if (message.includes('no encontrado') || message.includes('no disponible')) {
      res.status(404).json({ error: message });
      return;
    }
    res.status(400).json({ error: message });
  }
});

// Public: detail
router.get('/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const retiro = await getRetiroById(req.params.id);
    res.json(retiro);
  } catch (err: unknown) {
    res.status(404).json({ error: err instanceof Error ? err.message : 'No encontrado' });
  }
});

// Admin: create
router.post('/', requireAuth, requireRole('admin'), async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { nombre, precio } = req.body;
    if (!nombre || precio === undefined) {
      res.status(400).json({ error: 'nombre y precio son requeridos' });
      return;
    }
    const retiro = await createRetiro({ ...req.body, precio: Number(req.body.precio) });
    res.status(201).json(retiro);
  } catch (err: unknown) {
    res.status(400).json({ error: err instanceof Error ? err.message : 'Error' });
  }
});

// Admin: update
router.patch('/:id', requireAuth, requireRole('admin'), async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const retiro = await updateRetiro(req.params.id, req.body);
    res.json(retiro);
  } catch (err: unknown) {
    res.status(400).json({ error: err instanceof Error ? err.message : 'Error' });
  }
});

export default router;
