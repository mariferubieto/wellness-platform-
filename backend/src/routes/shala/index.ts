import { Router } from 'express';
import maestrosRouter from './maestros';
import paquetesRouter from './paquetes';
import clasesRouter from './clases';
import reservasRouter from './reservas';

const router = Router();
router.use('/maestros', maestrosRouter);
router.use('/paquetes', paquetesRouter);
router.use('/clases', clasesRouter);
router.use('/reservas', reservasRouter);

export default router;
