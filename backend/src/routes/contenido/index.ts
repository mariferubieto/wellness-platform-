// backend/src/routes/contenido/index.ts
import { Router, Request, Response } from 'express';
import { requireAuth } from '../../middleware/auth';
import { requireRole } from '../../middleware/requireRole';
import type { AuthenticatedRequest } from '../../middleware/auth';
import {
  getPosts,
  getPostBySlug,
  createPost,
  updatePost,
  getVideos,
  createVideo,
  updateVideo,
} from '../../services/contenido.service';

const router = Router();

// ── PUBLIC ─────────────────────────────────────────────────

router.get('/posts', async (_req: Request, res: Response): Promise<void> => {
  try {
    const posts = await getPosts(true);
    res.json(posts);
  } catch (err: unknown) {
    res.status(500).json({ error: err instanceof Error ? err.message : 'Error' });
  }
});

router.get('/videos', async (req: Request, res: Response): Promise<void> => {
  try {
    const { tipo } = req.query as { tipo?: string };
    const validTipo = tipo === 'vlog' || tipo === 'mini_clase' ? tipo : undefined;
    const videos = await getVideos(validTipo, true);
    res.json(videos);
  } catch (err: unknown) {
    res.status(500).json({ error: err instanceof Error ? err.message : 'Error' });
  }
});

// IMPORTANT: /posts/admin MUST be before /posts/:slug to avoid param capture
router.get('/posts/admin', requireAuth, requireRole('admin'), async (_req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const posts = await getPosts(false);
    res.json(posts);
  } catch (err: unknown) {
    res.status(500).json({ error: err instanceof Error ? err.message : 'Error' });
  }
});

router.get('/posts/:slug', async (req: Request, res: Response): Promise<void> => {
  try {
    const post = await getPostBySlug(req.params.slug);
    res.json(post);
  } catch (err: unknown) {
    res.status(404).json({ error: err instanceof Error ? err.message : 'No encontrado' });
  }
});

// ── ADMIN ──────────────────────────────────────────────────

router.post('/posts', requireAuth, requireRole('admin'), async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { titulo, slug, contenido, imagen_url, tags } = req.body;
    if (!titulo || !slug || !contenido) {
      res.status(400).json({ error: 'titulo, slug y contenido son requeridos' });
      return;
    }
    const post = await createPost({
      titulo, slug, contenido,
      imagen_url, tags,
      autor_id: req.userId,
    });
    res.status(201).json(post);
  } catch (err: unknown) {
    res.status(400).json({ error: err instanceof Error ? err.message : 'Error' });
  }
});

router.patch('/posts/:id', requireAuth, requireRole('admin'), async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { titulo, slug, contenido, imagen_url, tags, publicado } = req.body;
    const post = await updatePost(req.params.id, { titulo, slug, contenido, imagen_url, tags, publicado });
    res.json(post);
  } catch (err: unknown) {
    res.status(400).json({ error: err instanceof Error ? err.message : 'Error' });
  }
});

router.get('/videos/admin', requireAuth, requireRole('admin'), async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { tipo } = req.query as { tipo?: string };
    const validTipo = tipo === 'vlog' || tipo === 'mini_clase' ? tipo : undefined;
    const videos = await getVideos(validTipo, false);
    res.json(videos);
  } catch (err: unknown) {
    res.status(500).json({ error: err instanceof Error ? err.message : 'Error' });
  }
});

router.post('/videos', requireAuth, requireRole('admin'), async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { titulo, url_video, tipo, descripcion, thumbnail_url, gratis } = req.body;
    if (!titulo || !url_video || !tipo) {
      res.status(400).json({ error: 'titulo, url_video y tipo son requeridos' });
      return;
    }
    if (tipo !== 'vlog' && tipo !== 'mini_clase') {
      res.status(400).json({ error: 'tipo debe ser "vlog" o "mini_clase"' });
      return;
    }
    const video = await createVideo({ titulo, url_video, tipo, descripcion, thumbnail_url, gratis });
    res.status(201).json(video);
  } catch (err: unknown) {
    res.status(400).json({ error: err instanceof Error ? err.message : 'Error' });
  }
});

router.patch('/videos/:id', requireAuth, requireRole('admin'), async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { titulo, descripcion, url_video, tipo, gratis, thumbnail_url, publicado } = req.body;
    const video = await updateVideo(req.params.id, { titulo, descripcion, url_video, tipo, gratis, thumbnail_url, publicado });
    res.json(video);
  } catch (err: unknown) {
    res.status(400).json({ error: err instanceof Error ? err.message : 'Error' });
  }
});

export default router;
