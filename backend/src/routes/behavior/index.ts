// backend/src/routes/behavior/index.ts
import { Router, Request, Response } from 'express';
import { logEvent } from '../../services/behavior.service';

const router = Router();

// POST /api/behavior/track — public, no auth required
router.post('/track', async (req: Request, res: Response): Promise<void> => {
  try {
    const { tipo, pagina, accion, metadata, user_id, lead_id } = req.body;

    if (!tipo) {
      res.status(400).json({ error: 'tipo es requerido' });
      return;
    }

    // Fire and forget — don't block the response
    logEvent({ tipo, pagina, accion, metadata, user_id, lead_id }).catch(err =>
      console.error('behavior.logEvent error:', err)
    );

    res.status(202).json({ tracked: true });
  } catch (err: unknown) {
    res.status(202).json({ tracked: false });
  }
});

export default router;
