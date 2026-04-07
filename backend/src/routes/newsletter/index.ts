// backend/src/routes/newsletter/index.ts
import { Router, Request, Response } from 'express';
import { requireAuth } from '../../middleware/auth';
import { requireRole } from '../../middleware/requireRole';
import type { AuthenticatedRequest } from '../../middleware/auth';
import {
  suscribir,
  cancelarSuscripcion,
  getSuscriptores,
  exportSuscriptoresToExcel,
} from '../../services/newsletter.service';

const router = Router();

// IMPORTANT: /suscriptores/exportar MUST be before /suscriptores to avoid param capture
router.get('/suscriptores/exportar', requireAuth, requireRole('admin'), async (_req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const buffer = await exportSuscriptoresToExcel();
    const fecha = new Date().toISOString().split('T')[0];
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="newsletter-${fecha}.xlsx"`);
    res.send(buffer);
  } catch (err: unknown) {
    res.status(500).json({ error: err instanceof Error ? err.message : 'Error' });
  }
});

router.get('/suscriptores', requireAuth, requireRole('admin'), async (_req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const suscriptores = await getSuscriptores();
    res.json(suscriptores);
  } catch (err: unknown) {
    res.status(500).json({ error: err instanceof Error ? err.message : 'Error' });
  }
});

router.post('/suscribir', async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, nombre, fuente } = req.body;
    if (!email) {
      res.status(400).json({ error: 'El email es requerido' });
      return;
    }
    const suscriptor = await suscribir(email, nombre, fuente);
    res.status(201).json(suscriptor);
  } catch (err: unknown) {
    res.status(400).json({ error: err instanceof Error ? err.message : 'Error' });
  }
});

router.delete('/cancelar', async (req: Request, res: Response): Promise<void> => {
  try {
    const { email } = req.body;
    if (!email) {
      res.status(400).json({ error: 'El email es requerido' });
      return;
    }
    const result = await cancelarSuscripcion(email);
    res.json(result);
  } catch (err: unknown) {
    res.status(400).json({ error: err instanceof Error ? err.message : 'Error' });
  }
});

export default router;
