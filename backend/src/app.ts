import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';

dotenv.config();

const app = express();

app.use(helmet());
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true,
}));
app.use(express.json());

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

import authRouter from './routes/auth';
import usersRouter from './routes/users';
import adminRouter from './routes/admin';
import shalaRouter from './routes/shala/index';
import ayurvedaRouter from './routes/ayurveda/index';
import retirosRouter from './routes/retiros/index';
import eventosRouter from './routes/eventos/index';
import contenidoRouter from './routes/contenido/index';
import newsletterRouter from './routes/newsletter/index';
import pagosRouter from './routes/pagos/index';
import behaviorRouter from './routes/behavior/index';
import codigosRouter from './routes/codigos';

app.use('/api/auth', authRouter);
app.use('/api/users', usersRouter);
app.use('/api/admin', adminRouter);
app.use('/api/shala', shalaRouter);
app.use('/api/ayurveda', ayurvedaRouter);
app.use('/api/retiros', retirosRouter);
app.use('/api/eventos', eventosRouter);
app.use('/api/contenido', contenidoRouter);
app.use('/api/newsletter', newsletterRouter);
app.use('/api/pagos', pagosRouter);
app.use('/api/behavior', behaviorRouter);
app.use('/api/codigos', codigosRouter);

app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Error interno del servidor' });
});

export default app;
