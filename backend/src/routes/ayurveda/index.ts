import { Router } from 'express';
import diplomadosRouter from './diplomados';
import inscripcionesRouter from './inscripciones';
import cursosRouter from './cursos';

const router = Router();
router.use('/diplomados', diplomadosRouter);
router.use('/inscripciones', inscripcionesRouter);
router.use('/cursos', cursosRouter);

export default router;
