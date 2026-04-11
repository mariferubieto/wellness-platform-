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
      data: { id: 'user-admin', rol: 'admin', nombre: 'Admin', email: 'a@test.com', tags: [] },
      error: null,
    }),
  });
}

const futureDate = new Date(Date.now() + 3 * 60 * 60 * 1000).toISOString();

const sampleClase = {
  id: 'clase-1',
  nombre: 'Hatha Yoga',
  descripcion: 'Clase suave',
  inicio: futureDate,
  fin: new Date(Date.now() + 4 * 60 * 60 * 1000).toISOString(),
  capacidad: 15,
  cupo_actual: 3,
  tipo: 'regular',
  precio_especial: null,
  activo: true,
  espacio_tipo: 'salon',
  maestros: { id: 'maestro-1', users: { nombre: 'Ana' } },
};

beforeEach(() => jest.resetAllMocks());

describe('GET /api/shala/clases', () => {
  it('returns upcoming classes (public)', async () => {
    mockFrom.mockReturnValueOnce({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      gte: jest.fn().mockReturnThis(),
      order: jest.fn().mockResolvedValueOnce({
        data: [sampleClase],
        error: null,
      }),
    });

    const res = await request(app).get('/api/shala/clases');
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0].nombre).toBe('Hatha Yoga');
  });
});

describe('POST /api/shala/clases', () => {
  it('requires admin', async () => {
    mockGetUser.mockResolvedValueOnce({ data: { user: { id: 'auth-u' } }, error: null });
    mockFrom.mockReturnValueOnce({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValueOnce({
        data: { id: 'u1', rol: 'user', nombre: 'User', email: 'u@t.com', tags: [] },
        error: null,
      }),
    });

    const res = await request(app)
      .post('/api/shala/clases')
      .set('Authorization', 'Bearer token')
      .send({ nombre: 'Clase' });

    expect(res.status).toBe(403);
  });

  it('creates clase (admin)', async () => {
    mockAdminAuth();
    mockFrom.mockReturnValueOnce({
      insert: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValueOnce({ data: sampleClase, error: null }),
    });

    const res = await request(app)
      .post('/api/shala/clases')
      .set('Authorization', 'Bearer admin-token')
      .send({
        nombre: 'Hatha Yoga',
        inicio: futureDate,
        fin: new Date(Date.now() + 4 * 60 * 60 * 1000).toISOString(),
        capacidad: 15,
        maestro_id: 'maestro-1',
      });

    expect(res.status).toBe(201);
    expect(res.body.id).toBe('clase-1');
  });
});
