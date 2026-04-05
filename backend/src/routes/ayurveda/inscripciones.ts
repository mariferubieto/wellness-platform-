import { Router, Request, Response } from 'express';
import { crearInscripcion } from '../../services/diplomados.service';

const router = Router();

router.post('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const { diplomado_id, nombre_completo, fecha_nacimiento, whatsapp, email_gmail, razon, user_id } = req.body;

    if (!diplomado_id || !nombre_completo || !whatsapp || !email_gmail) {
      res.status(400).json({ error: 'diplomado_id, nombre_completo, whatsapp y email_gmail son requeridos' });
      return;
    }

    const inscripcion = await crearInscripcion({
      diplomado_id,
      nombre_completo,
      fecha_nacimiento,
      whatsapp,
      email_gmail,
      razon,
      user_id,
    });

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

export default router;
