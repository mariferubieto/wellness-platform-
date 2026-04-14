import { Router } from 'express';
import diplomadosRouter from './diplomados';
import inscripcionesRouter from './inscripciones';
import cursosRouter from './cursos';
import cursosInscripcionesRouter from './cursos-inscripciones';

const router = Router();
router.use('/diplomados', diplomadosRouter);
router.use('/inscripciones', inscripcionesRouter);
router.use('/cursos', cursosRouter);
router.use('/cursos-inscripciones', cursosInscripcionesRouter);

export default router;
