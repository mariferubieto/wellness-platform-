import { Router } from 'express';
import maestrosRouter from './maestros';
import paquetesRouter from './paquetes';

const router = Router();
router.use('/maestros', maestrosRouter);
router.use('/paquetes', paquetesRouter);

export default router;
