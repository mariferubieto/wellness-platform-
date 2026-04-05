import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from './auth';

export function requireRole(...roles: string[]) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (!req.userRol || !roles.includes(req.userRol)) {
      res.status(403).json({ error: 'Acceso denegado' });
      return;
    }
    next();
  };
}
