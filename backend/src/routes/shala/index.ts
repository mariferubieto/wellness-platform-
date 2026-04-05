import { Router } from 'express';
import maestrosRouter from './maestros';

const router = Router();
router.use('/maestros', maestrosRouter);

export default router;
