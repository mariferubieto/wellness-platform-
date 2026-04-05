import { Router, Response } from 'express';
import { requireAuth, AuthenticatedRequest } from '../middleware/auth';
import { requireRole } from '../middleware/requireRole';
import {
  getDashboardMetrics,
  getCRMContacts,
  getCumpleanosMes,
  exportCRMToExcel,
} from '../services/crm.service';

const router = Router();

router.use(requireAuth, requireRole('admin'));

router.get('/dashboard', async (_req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const metrics = await getDashboardMetrics();
    res.json(metrics);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Error';
    res.status(500).json({ error: message });
  }
});

router.get('/crm', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { fuente, estado, page, limit } = req.query as Record<string, string>;
    const contacts = await getCRMContacts({
      fuente,
      estado,
      page: page ? parseInt(page) : 1,
      limit: limit ? parseInt(limit) : 50,
    });
    res.json(contacts);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Error';
    res.status(500).json({ error: message });
  }
});

router.get('/crm/exportar', async (_req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const buffer = await exportCRMToExcel();
    const fecha = new Date().toISOString().split('T')[0];
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="crm-${fecha}.xlsx"`);
    res.send(buffer);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Error';
    res.status(500).json({ error: message });
  }
});

router.get('/cumpleanos', async (_req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const cumpleaneros = await getCumpleanosMes();
    res.json(cumpleaneros);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Error';
    res.status(500).json({ error: message });
  }
});

export default router;
