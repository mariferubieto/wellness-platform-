import request from 'supertest';
import app from '../src/app';

jest.mock('../src/config/supabase', () => ({
  supabaseAdmin: {
    from: jest.fn(),
    auth: { getUser: jest.fn() },
  },
}));

import { supabaseAdmin } from '../src/config/supabase';
const mockFrom = supabaseAdmin.from as jest.Mock;
const mockGetUser = supabaseAdmin.auth.getUser as jest.Mock;

function mockAdminAuth() {
  mockGetUser.mockResolvedValueOnce({ data: { user: { id: 'auth-admin' } }, error: null });
  mockFrom.mockReturnValueOnce({
    select: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    single: jest.fn().mockResolvedValueOnce({
      data: { id: 'admin-1', rol: 'admin', nombre: 'Admin', email: 'a@t.com', tags: [] },
      error: null,
    }),
  });
}

beforeEach(() => jest.resetAllMocks());

describe('GET /api/contenido/posts', () => {
  it('returns published posts (public)', async () => {
    mockFrom.mockReturnValueOnce({
      select: jest.fn().mockReturnThis(),
      order: jest.fn().mockReturnThis(),
      eq: jest.fn().mockResolvedValueOnce({
        data: [
          { id: 'post-1', titulo: 'Mi primer post', slug: 'mi-primer-post', publicado: true, created_at: '2026-04-01T00:00:00Z' },
        ],
        error: null,
      }),
    });

    const res = await request(app).get('/api/contenido/posts');
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0].slug).toBe('mi-primer-post');
  });
});

describe('GET /api/contenido/posts/:slug', () => {
  it('returns 404 for unknown slug', async () => {
    mockFrom.mockReturnValueOnce({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValueOnce({ data: null, error: { message: 'No rows' } }),
    });

    const res = await request(app).get('/api/contenido/posts/no-existe');
    expect(res.status).toBe(404);
  });

  it('returns post for valid slug', async () => {
    mockFrom.mockReturnValueOnce({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValueOnce({
        data: { id: 'post-1', titulo: 'Mi post', slug: 'mi-post', contenido: 'Hola mundo', publicado: true, created_at: '2026-04-01T00:00:00Z' },
        error: null,
      }),
    });

    const res = await request(app).get('/api/contenido/posts/mi-post');
    expect(res.status).toBe(200);
    expect(res.body.titulo).toBe('Mi post');
  });
});

describe('GET /api/contenido/videos', () => {
  it('returns published videos (public)', async () => {
    mockFrom.mockReturnValueOnce({
      select: jest.fn().mockReturnThis(),
      order: jest.fn().mockReturnThis(),
      eq: jest.fn().mockResolvedValueOnce({
        data: [
          { id: 'vid-1', titulo: 'Vlog Abril', tipo: 'vlog', gratis: true, publicado: true },
        ],
        error: null,
      }),
    });

    const res = await request(app).get('/api/contenido/videos');
    expect(res.status).toBe(200);
    expect(res.body[0].tipo).toBe('vlog');
  });
});

describe('POST /api/contenido/posts (admin)', () => {
  it('returns 401 without token', async () => {
    const res = await request(app)
      .post('/api/contenido/posts')
      .send({ titulo: 'Test', slug: 'test', contenido: 'Contenido' });
    expect(res.status).toBe(401);
  });

  it('creates post with valid admin token', async () => {
    mockAdminAuth();
    mockFrom.mockReturnValueOnce({
      insert: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValueOnce({
        data: { id: 'post-new', titulo: 'Nuevo', slug: 'nuevo', contenido: 'Texto', publicado: false },
        error: null,
      }),
    });

    const res = await request(app)
      .post('/api/contenido/posts')
      .set('Authorization', 'Bearer valid-token')
      .send({ titulo: 'Nuevo', slug: 'nuevo', contenido: 'Texto' });
    expect(res.status).toBe(201);
    expect(res.body.slug).toBe('nuevo');
  });

  it('returns 400 when required fields missing', async () => {
    mockAdminAuth();
    const res = await request(app)
      .post('/api/contenido/posts')
      .set('Authorization', 'Bearer valid-token')
      .send({ titulo: 'Solo titulo' });
    expect(res.status).toBe(400);
  });
});

describe('PATCH /api/contenido/posts/:id (admin)', () => {
  it('publishes a post', async () => {
    mockAdminAuth();
    mockFrom.mockReturnValueOnce({
      update: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValueOnce({
        data: { id: 'post-1', publicado: true },
        error: null,
      }),
    });

    const res = await request(app)
      .patch('/api/contenido/posts/post-1')
      .set('Authorization', 'Bearer valid-token')
      .send({ publicado: true });
    expect(res.status).toBe(200);
    expect(res.body.publicado).toBe(true);
  });
});

describe('POST /api/contenido/videos (admin)', () => {
  it('returns 400 for invalid tipo', async () => {
    mockAdminAuth();
    const res = await request(app)
      .post('/api/contenido/videos')
      .set('Authorization', 'Bearer valid-token')
      .send({ titulo: 'Test', url_video: 'https://youtube.com/x', tipo: 'invalido' });
    expect(res.status).toBe(400);
  });

  it('creates video with valid data', async () => {
    mockAdminAuth();
    mockFrom.mockReturnValueOnce({
      insert: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValueOnce({
        data: { id: 'vid-new', titulo: 'Mini clase', tipo: 'mini_clase', gratis: true, publicado: false },
        error: null,
      }),
    });

    const res = await request(app)
      .post('/api/contenido/videos')
      .set('Authorization', 'Bearer valid-token')
      .send({ titulo: 'Mini clase', url_video: 'https://youtube.com/x', tipo: 'mini_clase' });
    expect(res.status).toBe(201);
    expect(res.body.tipo).toBe('mini_clase');
  });
});
