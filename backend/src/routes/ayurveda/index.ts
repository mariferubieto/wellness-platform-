import { Router } from 'express';
import diplomadosRouter from './diplomados';
import inscripcionesRouter from './inscripciones';

const router = Router();
router.use('/diplomados', diplomadosRouter);
router.use('/inscripciones', inscripcionesRouter);

export default router;
