import { Router, Response } from 'express';
import { requireAuth } from '../../middleware/auth';
import { crearReserva, cancelarReserva, getMisReservas } from '../../services/reservas.service';
import type { AuthenticatedRequest } from '../../middleware/auth';

const router = Router();

router.post('/', requireAuth, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { clase_id } = req.body;
    if (!clase_id) {
      res.status(400).json({ error: 'clase_id es requerido' });
      return;
    }
    const reserva = await crearReserva(req.userId!, clase_id);
    res.status(201).json(reserva);
  } catch (err: unknown) {
    res.status(400).json({ error: err instanceof Error ? err.message : 'Error' });
  }
});

router.get('/mis-reservas', requireAuth, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const reservas = await getMisReservas(req.userId!);
    res.json(reservas);
  } catch (err: unknown) {
    res.status(500).json({ error: err instanceof Error ? err.message : 'Error' });
  }
});

router.delete('/:id', requireAuth, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const result = await cancelarReserva(req.params.id, req.userId!);
    res.json(result);
  } catch (err: unknown) {
    res.status(400).json({ error: err instanceof Error ? err.message : 'Error' });
  }
});

export default router;
