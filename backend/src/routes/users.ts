import { Router, Response } from 'express';
import { requireAuth, AuthenticatedRequest } from '../middleware/auth';
import { getUserById, updateUser } from '../services/users.service';

const router = Router();

router.get('/:id', requireAuth, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const { id } = req.params;

  if (req.userId !== id && req.userRol !== 'admin') {
    res.status(403).json({ error: 'Acceso denegado' });
    return;
  }

  try {
    const user = await getUserById(id);
    res.json(user);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Error';
    res.status(404).json({ error: message });
  }
});

router.patch('/:id', requireAuth, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const { id } = req.params;

  if (req.userId !== id && req.userRol !== 'admin') {
    res.status(403).json({ error: 'Acceso denegado' });
    return;
  }

  try {
    const user = await updateUser(id, req.body);
    res.json(user);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Error al actualizar';
    res.status(400).json({ error: message });
  }
});

export default router;
