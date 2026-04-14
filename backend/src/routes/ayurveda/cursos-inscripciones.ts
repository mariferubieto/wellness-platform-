import { Router, Request, Response } from 'express';
import { supabaseAdmin } from '../../config/supabase';

const router = Router();

router.post('/', async (req: Request, res: Response): Promise<void> => {
  const { curso_id, nombre_completo, whatsapp, email } = req.body;

  if (!curso_id || !nombre_completo || !whatsapp || !email) {
    res.status(400).json({ error: 'curso_id, nombre_completo, whatsapp y email son requeridos' });
    return;
  }

  const { data, error } = await supabaseAdmin
    .from('inscripciones_cursos')
    .insert({ curso_id, nombre_completo, whatsapp, email })
    .select()
    .single();

  if (error) {
    res.status(400).json({ error: error.message });
    return;
  }

  res.status(201).json(data);
});

export default router;
