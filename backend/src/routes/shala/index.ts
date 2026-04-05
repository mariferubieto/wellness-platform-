import { Router } from 'express';
import maestrosRouter from './maestros';
import paquetesRouter from './paquetes';
import clasesRouter from './clases';

const router = Router();
router.use('/maestros', maestrosRouter);
router.use('/paquetes', paquetesRouter);
router.use('/clases', clasesRouter);

export default router;
