// backend/src/routes/pagos/index.ts
import { Router, Request, Response } from 'express';
import { requireAuth } from '../../middleware/auth';
import type { AuthenticatedRequest } from '../../middleware/auth';
import {
  crearPreferenciaMercadoPago,
  procesarWebhook,
  getEstadoPago,
} from '../../services/pagos.service';

const router = Router();

// POST /api/pagos/mercadopago/crear — requires auth
router.post('/mercadopago/crear', requireAuth, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { concepto, concepto_id, monto, titulo } = req.body;

    if (!concepto || !concepto_id || !monto || !titulo) {
      res.status(400).json({ error: 'concepto, concepto_id, monto y titulo son requeridos' });
      return;
    }

    const validConceptos = ['paquete_shala', 'diplomado', 'retiro', 'evento'];
    if (!validConceptos.includes(concepto)) {
      res.status(400).json({ error: `concepto debe ser uno de: ${validConceptos.join(', ')}` });
      return;
    }

    const backUrlBase = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

    const result = await crearPreferenciaMercadoPago({
      user_id: req.userId,
      concepto,
      concepto_id,
      monto: Number(monto),
      titulo,
      back_url_base: backUrlBase,
    });

    res.json(result);
  } catch (err: unknown) {
    res.status(500).json({ error: err instanceof Error ? err.message : 'Error al crear pago' });
  }
});

// POST /api/pagos/mercadopago/webhook — public, no auth (called by MP servers)
router.post('/mercadopago/webhook', async (req: Request, res: Response): Promise<void> => {
  try {
    await procesarWebhook(req.body);
    res.status(200).json({ received: true });
  } catch (err: unknown) {
    console.error('Webhook error:', err instanceof Error ? err.message : err);
    res.status(200).json({ received: true });
  }
});

// GET /api/pagos/:id — check payment status (requires auth)
router.get('/:id', requireAuth, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const pago = await getEstadoPago(req.params.id);
    res.json(pago);
  } catch (err: unknown) {
    res.status(404).json({ error: err instanceof Error ? err.message : 'No encontrado' });
  }
});

export default router;
