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
  mockGetUser.mockResolvedValueOnce({
    data: { user: { id: 'auth-admin-1' } },
    error: null,
  });
  mockFrom.mockReturnValueOnce({
    select: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    single: jest.fn().mockResolvedValueOnce({
      data: { id: 'user-admin-1', rol: 'admin', nombre: 'Admin', email: 'admin@test.com', tags: [] },
      error: null,
    }),
  });
}

beforeEach(() => jest.resetAllMocks());

describe('GET /api/shala/maestros', () => {
  it('returns list of maestros (public)', async () => {
    mockFrom.mockReturnValueOnce({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      order: jest.fn().mockResolvedValueOnce({
        data: [
          {
            id: 'maestro-1',
            bio: 'Maestra de yoga',
            foto_url: null,
            activo: true,
            users: { nombre: 'Ana García', email: 'ana@test.com' },
          },
        ],
        error: null,
      }),
    });

    const res = await request(app).get('/api/shala/maestros');
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0].nombre).toBe('Ana García');
  });
});

describe('POST /api/shala/maestros', () => {
  it('requires admin role', async () => {
    mockGetUser.mockResolvedValueOnce({
      data: { user: { id: 'auth-user-1' } },
      error: null,
    });
    mockFrom.mockReturnValueOnce({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValueOnce({
        data: { id: 'user-1', rol: 'user', nombre: 'Normal', email: 'u@test.com', tags: [] },
        error: null,
      }),
    });

    const res = await request(app)
      .post('/api/shala/maestros')
      .set('Authorization', 'Bearer token')
      .send({ user_id: 'user-1', bio: 'Bio' });

    expect(res.status).toBe(403);
  });

  it('creates maestro (admin)', async () => {
    mockAdminAuth();

    mockFrom.mockReturnValueOnce({
      insert: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValueOnce({
        data: { id: 'maestro-new', user_id: 'user-1', bio: 'Bio test', foto_url: null, activo: true },
        error: null,
      }),
    });

    const res = await request(app)
      .post('/api/shala/maestros')
      .set('Authorization', 'Bearer admin-token')
      .send({ user_id: 'user-1', bio: 'Bio test' });

    expect(res.status).toBe(201);
    expect(res.body.id).toBe('maestro-new');
  });
});
