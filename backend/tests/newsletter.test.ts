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

describe('POST /api/newsletter/suscribir', () => {
  it('returns 400 without email', async () => {
    const res = await request(app).post('/api/newsletter/suscribir').send({ nombre: 'Ana' });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('El email es requerido');
  });

  it('subscribes successfully', async () => {
    mockFrom.mockReturnValueOnce({
      upsert: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValueOnce({
        data: { id: 'sub-1', email: 'ana@mail.com', nombre: 'Ana', activo: true },
        error: null,
      }),
    });

    const res = await request(app)
      .post('/api/newsletter/suscribir')
      .send({ email: 'ana@mail.com', nombre: 'Ana' });
    expect(res.status).toBe(201);
    expect(res.body.email).toBe('ana@mail.com');
  });
});

describe('DELETE /api/newsletter/cancelar', () => {
  it('returns 400 without email', async () => {
    const res = await request(app).delete('/api/newsletter/cancelar').send({});
    expect(res.status).toBe(400);
  });

  it('unsubscribes successfully', async () => {
    mockFrom.mockReturnValueOnce({
      update: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValueOnce({
        data: { id: 'sub-1', email: 'ana@mail.com', activo: false },
        error: null,
      }),
    });

    const res = await request(app)
      .delete('/api/newsletter/cancelar')
      .send({ email: 'ana@mail.com' });
    expect(res.status).toBe(200);
    expect(res.body.activo).toBe(false);
  });
});

describe('GET /api/newsletter/suscriptores (admin)', () => {
  it('returns 401 without token', async () => {
    const res = await request(app).get('/api/newsletter/suscriptores');
    expect(res.status).toBe(401);
  });

  it('returns subscribers list for admin', async () => {
    mockAdminAuth();
    mockFrom.mockReturnValueOnce({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      order: jest.fn().mockResolvedValueOnce({
        data: [
          { id: 'sub-1', email: 'ana@mail.com', nombre: 'Ana', activo: true, created_at: '2026-04-01T00:00:00Z' },
        ],
        error: null,
      }),
    });

    const res = await request(app)
      .get('/api/newsletter/suscriptores')
      .set('Authorization', 'Bearer valid-token');
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0].email).toBe('ana@mail.com');
  });
});
