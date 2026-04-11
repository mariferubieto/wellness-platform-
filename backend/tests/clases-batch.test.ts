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

describe('POST /api/shala/clases/batch', () => {
  it('creates multiple classes and returns count', async () => {
    mockAdminAuth();

    const clases = [
      { nombre: 'Hatha Yoga', inicio: '2026-05-05T07:00:00', fin: '2026-05-05T08:00:00', capacidad: 10, espacio_tipo: 'salon' },
      { nombre: 'Vinyasa', inicio: '2026-05-07T09:00:00', fin: '2026-05-07T10:00:00', capacidad: 70, espacio_tipo: 'jardin' },
    ];

    mockFrom.mockReturnValueOnce({
      insert: jest.fn().mockReturnThis(),
      select: jest.fn().mockResolvedValueOnce({
        data: [
          { id: 'c1', ...clases[0] },
          { id: 'c2', ...clases[1] },
        ],
        error: null,
      }),
    });

    const res = await request(app)
      .post('/api/shala/clases/batch')
      .set('Authorization', 'Bearer admin-token')
      .send({ clases });

    expect(res.status).toBe(201);
    expect(res.body.created).toBe(2);
    expect(res.body.clases).toHaveLength(2);
  });

  it('returns 400 if clases array is missing', async () => {
    mockAdminAuth();

    const res = await request(app)
      .post('/api/shala/clases/batch')
      .set('Authorization', 'Bearer admin-token')
      .send({});

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/clases/);
  });

  it('returns 400 if clases array is empty', async () => {
    mockAdminAuth();

    const res = await request(app)
      .post('/api/shala/clases/batch')
      .set('Authorization', 'Bearer admin-token')
      .send({ clases: [] });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/clases/);
  });

  it('returns 401 if not authenticated', async () => {
    mockGetUser.mockResolvedValueOnce({ data: { user: null }, error: { message: 'Not authenticated' } });

    const res = await request(app)
      .post('/api/shala/clases/batch')
      .send({ clases: [{ nombre: 'X', inicio: 'a', fin: 'b', capacidad: 10 }] });

    expect(res.status).toBe(401);
  });
});
