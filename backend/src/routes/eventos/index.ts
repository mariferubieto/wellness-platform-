import { Router, Request, Response } from 'express';
import { requireAuth } from '../../middleware/auth';
import { requireRole } from '../../middleware/requireRole';
import type { AuthenticatedRequest } from '../../middleware/auth';
import {
  getEventos,
  getEventoById,
  createEvento,
  updateEvento,
  crearInscripcionEvento,
} from '../../services/eventos.service';

const router = Router();

// Public: catalog
router.get('/', async (_req: Request, res: Response): Promise<void> => {
  try {
    const eventos = await getEventos();
    res.json(eventos);
  } catch (err: unknown) {
    res.status(500).json({ error: err instanceof Error ? err.message : 'Error' });
  }
});

// Public: inscripcion — MUST be before /:id
router.post('/inscripciones', async (req: Request, res: Response): Promise<void> => {
  try {
    const { evento_id, nombre_completo, email, whatsapp, user_id } = req.body;

    if (!evento_id || !nombre_completo || !email || !whatsapp) {
      res.status(400).json({ error: 'evento_id, nombre_completo, email y whatsapp son requeridos' });
      return;
    }

    const inscripcion = await crearInscripcionEvento({ evento_id, nombre_completo, email, whatsapp, user_id });
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
    const evento = await getEventoById(req.params.id);
    res.json(evento);
  } catch (err: unknown) {
    res.status(404).json({ error: err instanceof Error ? err.message : 'No encontrado' });
  }
});

// Admin: create
router.post('/', requireAuth, requireRole('admin'), async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { nombre } = req.body;
    if (!nombre) {
      res.status(400).json({ error: 'nombre es requerido' });
      return;
    }
    const evento = await createEvento(req.body);
    res.status(201).json(evento);
  } catch (err: unknown) {
    res.status(400).json({ error: err instanceof Error ? err.message : 'Error' });
  }
});

// Admin: update
router.patch('/:id', requireAuth, requireRole('admin'), async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const evento = await updateEvento(req.params.id, req.body);
    res.json(evento);
  } catch (err: unknown) {
    res.status(400).json({ error: err instanceof Error ? err.message : 'Error' });
  }
});

export default router;
