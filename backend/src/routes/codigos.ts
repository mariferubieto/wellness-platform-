import { Router, Response, Request } from 'express';
import { requireAuth } from '../middleware/auth';
import { requireRole } from '../middleware/requireRole';
import { getCodigos, createCodigo, toggleCodigo, aplicarCodigo } from '../services/codigos.service';
import type { AuthenticatedRequest } from '../middleware/auth';

const router = Router();

// GET /api/codigos — admin only
router.get('/', requireAuth, requireRole('admin'), async (_req, res: Response): Promise<void> => {
  try {
    const codigos = await getCodigos();
    res.json(codigos);
  } catch (err: unknown) {
    res.status(500).json({ error: err instanceof Error ? err.message : 'Error' });
  }
});

// POST /api/codigos — admin only
router.post('/', requireAuth, requireRole('admin'), async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { codigo, descripcion, descuento_tipo, descuento_valor, aplicable_a, usos_maximos, expira_en } = req.body;
    if (!codigo || !descuento_tipo || !descuento_valor) {
      res.status(400).json({ error: 'codigo, descuento_tipo y descuento_valor son requeridos' });
      return;
    }
    const nuevo = await createCodigo({
      codigo: codigo.toUpperCase(),
      descripcion,
      descuento_tipo,
      descuento_valor: Number(descuento_valor),
      aplicable_a: aplicable_a ?? ['paquete_shala', 'diplomado', 'retiro', 'evento'],
      activo: true,
      usos_maximos: usos_maximos ? Number(usos_maximos) : undefined,
      expira_en: expira_en || undefined,
    });
    res.status(201).json(nuevo);
  } catch (err: unknown) {
    res.status(400).json({ error: err instanceof Error ? err.message : 'Error' });
  }
});

// PATCH /api/codigos/:id — toggle activo
router.patch('/:id', requireAuth, requireRole('admin'), async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { activo } = req.body;
    const codigo = await toggleCodigo(req.params.id, Boolean(activo));
    res.json(codigo);
  } catch (err: unknown) {
    res.status(400).json({ error: err instanceof Error ? err.message : 'Error' });
  }
});

// POST /api/codigos/aplicar — public, validate code
router.post('/aplicar', async (req: Request, res: Response): Promise<void> => {
  try {
    const { codigo, concepto, monto } = req.body;
    if (!codigo || !concepto || !monto) {
      res.status(400).json({ error: 'codigo, concepto y monto son requeridos' });
      return;
    }
    const resultado = await aplicarCodigo(codigo, concepto, Number(monto));
    res.json(resultado);
  } catch (err: unknown) {
    res.status(400).json({ error: err instanceof Error ? err.message : 'Error' });
  }
});

export default router;
