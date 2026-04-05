import { Router, Request, Response } from 'express';
import { requireAuth, AuthenticatedRequest } from '../middleware/auth';
import { registerUser } from '../services/auth.service';

const router = Router();

router.post('/register', async (req: Request, res: Response): Promise<void> => {
  const { nombre, email, password, telefono, fecha_nacimiento, fuente } = req.body;

  if (!nombre || !email || !password) {
    res.status(400).json({ error: 'nombre, email y password son requeridos' });
    return;
  }

  if (password.length < 8) {
    res.status(400).json({ error: 'La contraseña debe tener al menos 8 caracteres' });
    return;
  }

  try {
    const user = await registerUser({ nombre, email, password, telefono, fecha_nacimiento, fuente });
    res.status(201).json({ user });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Error al registrar usuario';
    res.status(400).json({ error: message });
  }
});

router.get('/me', requireAuth, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  res.json(req.userProfile);
});

export default router;
