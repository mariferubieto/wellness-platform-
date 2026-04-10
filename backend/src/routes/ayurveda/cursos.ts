import { Router, Request, Response } from 'express';
import { requireAuth } from '../../middleware/auth';
import { requireRole } from '../../middleware/requireRole';
import type { AuthenticatedRequest } from '../../middleware/auth';
import { supabaseAdmin } from '../../config/supabase';

const router = Router();

type TipoCurso = 'cocina' | 'mudras' | 'extras';

// Public: list by tipo
router.get('/:tipo', async (req: Request, res: Response): Promise<void> => {
  const tipo = req.params.tipo as TipoCurso;
  if (!['cocina', 'mudras', 'extras'].includes(tipo)) {
    res.status(400).json({ error: 'tipo inválido' });
    return;
  }
  const { data, error } = await supabaseAdmin
    .from('cursos_ayurveda')
    .select('*')
    .eq('tipo', tipo)
    .eq('activo', true)
    .order('created_at', { ascending: false });
  if (error) { res.status(500).json({ error: error.message }); return; }
  res.json(data ?? []);
});

// Admin: create
router.post('/', requireAuth, requireRole('admin'), async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const { tipo, nombre, descripcion, temario, fechas, precio, foto_url, cupo_maximo } = req.body;
  if (!tipo || !nombre) {
    res.status(400).json({ error: 'tipo y nombre son requeridos' });
    return;
  }
  if (!['cocina', 'mudras', 'extras'].includes(tipo)) {
    res.status(400).json({ error: 'tipo inválido' });
    return;
  }
  const { data, error } = await supabaseAdmin
    .from('cursos_ayurveda')
    .insert({
      tipo,
      nombre,
      descripcion: descripcion ?? null,
      temario: temario ?? null,
      fechas: fechas ?? null,
      precio: precio ? Number(precio) : 0,
      foto_url: foto_url ?? null,
      cupo_maximo: cupo_maximo ? Number(cupo_maximo) : null,
    })
    .select()
    .single();
  if (error) { res.status(400).json({ error: error.message }); return; }
  res.status(201).json(data);
});

// Admin: update
router.patch('/:id', requireAuth, requireRole('admin'), async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const { nombre, descripcion, temario, fechas, precio, foto_url, cupo_maximo, activo } = req.body;
  const updates: Record<string, unknown> = {};
  if (nombre !== undefined) updates.nombre = nombre;
  if (descripcion !== undefined) updates.descripcion = descripcion;
  if (temario !== undefined) updates.temario = temario;
  if (fechas !== undefined) updates.fechas = fechas;
  if (precio !== undefined) updates.precio = Number(precio);
  if (foto_url !== undefined) updates.foto_url = foto_url;
  if (cupo_maximo !== undefined) updates.cupo_maximo = cupo_maximo ? Number(cupo_maximo) : null;
  if (activo !== undefined) updates.activo = activo;

  const { data, error } = await supabaseAdmin
    .from('cursos_ayurveda')
    .update(updates)
    .eq('id', req.params.id)
    .select()
    .single();
  if (error) { res.status(400).json({ error: error.message }); return; }
  res.json(data);
});

// Admin: soft delete
router.delete('/:id', requireAuth, requireRole('admin'), async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const { error } = await supabaseAdmin
    .from('cursos_ayurveda')
    .update({ activo: false })
    .eq('id', req.params.id);
  if (error) { res.status(400).json({ error: error.message }); return; }
  res.status(204).send();
});

export default router;
