import { Request, Response, NextFunction } from 'express';
import { supabaseAdmin } from '../config/supabase';

export interface AuthenticatedRequest extends Request {
  userId?: string;
  userRol?: string;
  userProfile?: {
    id: string;
    nombre: string;
    email: string;
    rol: string;
    tags: string[];
  };
}

export async function requireAuth(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  const authHeader = req.headers.authorization;

  if (!authHeader?.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Token requerido' });
    return;
  }

  const token = authHeader.slice(7);

  const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);

  if (error || !user) {
    res.status(401).json({ error: 'Token inválido' });
    return;
  }

  const { data: profile, error: profileError } = await supabaseAdmin
    .from('users')
    .select('id, nombre, email, rol, tags')
    .eq('auth_id', user.id)
    .single();

  if (profileError || !profile) {
    res.status(401).json({ error: 'Perfil de usuario no encontrado' });
    return;
  }

  req.userId = profile.id;
  req.userRol = profile.rol;
  req.userProfile = profile;
  next();
}
