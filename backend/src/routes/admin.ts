import { Router, Response } from 'express';
import { requireAuth, AuthenticatedRequest } from '../middleware/auth';
import { requireRole } from '../middleware/requireRole';
import {
  getDashboardMetrics,
  getCRMContacts,
  getCumpleanosMes,
  exportCRMToExcel,
} from '../services/crm.service';
import {
  getShalaAlumnos,
  getShalaLeads,
  exportShalaAlumnosToExcel,
  exportShalaLeadsToExcel,
} from '../services/shala-admin.service';
import {
  getAyurvedaAlumnos,
  exportAyurvedaAlumnosToExcel,
} from '../services/ayurveda-admin.service';
import {
  getRetiroInscritos,
  exportRetiroToExcel,
  getEventoInscritos,
  exportEventoToExcel,
} from '../services/marifer-admin.service';

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

router.get('/shala/alumnos', async (_req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const alumnos = await getShalaAlumnos();
    res.json(alumnos);
  } catch (err: unknown) {
    res.status(500).json({ error: err instanceof Error ? err.message : 'Error' });
  }
});

router.get('/shala/leads', async (_req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const leads = await getShalaLeads();
    res.json(leads);
  } catch (err: unknown) {
    res.status(500).json({ error: err instanceof Error ? err.message : 'Error' });
  }
});

router.get('/shala/exportar/alumnos', async (_req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const buffer = await exportShalaAlumnosToExcel();
    const fecha = new Date().toISOString().split('T')[0];
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="shala-alumnos-${fecha}.xlsx"`);
    res.send(buffer);
  } catch (err: unknown) {
    res.status(500).json({ error: err instanceof Error ? err.message : 'Error' });
  }
});

router.get('/shala/exportar/leads', async (_req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const buffer = await exportShalaLeadsToExcel();
    const fecha = new Date().toISOString().split('T')[0];
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="shala-leads-${fecha}.xlsx"`);
    res.send(buffer);
  } catch (err: unknown) {
    res.status(500).json({ error: err instanceof Error ? err.message : 'Error' });
  }
});

router.get('/ayurveda/alumnos', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { generacion } = req.query as Record<string, string>;
    const alumnos = await getAyurvedaAlumnos(generacion);
    res.json(alumnos);
  } catch (err: unknown) {
    res.status(500).json({ error: err instanceof Error ? err.message : 'Error' });
  }
});

router.get('/ayurveda/exportar/:generacion', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const generacion = decodeURIComponent(req.params.generacion);
    const buffer = await exportAyurvedaAlumnosToExcel(generacion);
    const fecha = new Date().toISOString().split('T')[0];
    const nombreArch = `ayurveda-${generacion.replace(/\s+/g, '-')}-${fecha}.xlsx`;
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${nombreArch}"`);
    res.send(buffer);
  } catch (err: unknown) {
    res.status(500).json({ error: err instanceof Error ? err.message : 'Error' });
  }
});

router.get('/retiros/:id/inscritos', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const inscritos = await getRetiroInscritos(req.params.id);
    res.json(inscritos);
  } catch (err: unknown) {
    res.status(500).json({ error: err instanceof Error ? err.message : 'Error' });
  }
});

router.get('/exportar/retiro/:id', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const buffer = await exportRetiroToExcel(req.params.id);
    const fecha = new Date().toISOString().split('T')[0];
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="retiro-inscritos-${fecha}.xlsx"`);
    res.send(buffer);
  } catch (err: unknown) {
    res.status(500).json({ error: err instanceof Error ? err.message : 'Error' });
  }
});

router.get('/eventos/:id/inscritos', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const inscritos = await getEventoInscritos(req.params.id);
    res.json(inscritos);
  } catch (err: unknown) {
    res.status(500).json({ error: err instanceof Error ? err.message : 'Error' });
  }
});

router.get('/exportar/evento/:id', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const buffer = await exportEventoToExcel(req.params.id);
    const fecha = new Date().toISOString().split('T')[0];
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="evento-inscritos-${fecha}.xlsx"`);
    res.send(buffer);
  } catch (err: unknown) {
    res.status(500).json({ error: err instanceof Error ? err.message : 'Error' });
  }
});

export default router;
