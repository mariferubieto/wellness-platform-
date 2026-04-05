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

function mockAuth(rol: string = 'user') {
  mockGetUser.mockResolvedValueOnce({ data: { user: { id: `auth-${rol}` } }, error: null });
  mockFrom.mockReturnValueOnce({
    select: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    single: jest.fn().mockResolvedValueOnce({
      data: { id: `user-${rol}`, rol, nombre: 'User', email: 'u@test.com', tags: [] },
      error: null,
    }),
  });
}

beforeEach(() => jest.resetAllMocks());

describe('GET /api/shala/paquetes', () => {
  it('returns active package catalog (public)', async () => {
    mockFrom.mockReturnValueOnce({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      order: jest.fn().mockResolvedValueOnce({
        data: [
          { id: 'pkg-1', nombre: 'Paquete 10', num_clases: 10, precio: 800, vigencia_dias: 30, activo: true },
        ],
        error: null,
      }),
    });

    const res = await request(app).get('/api/shala/paquetes');
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0].nombre).toBe('Paquete 10');
  });
});

describe('GET /api/shala/paquetes/mis-paquetes', () => {
  it('returns active user packages', async () => {
    mockAuth('user');
    mockFrom.mockReturnValueOnce({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      gt: jest.fn().mockReturnThis(),
      order: jest.fn().mockResolvedValueOnce({
        data: [
          {
            id: 'pu-1',
            clases_restantes: 8,
            expira_en: '2026-05-01T00:00:00Z',
            activo: true,
            paquetes_catalogo: { nombre: 'Paquete 10', num_clases: 10 },
          },
        ],
        error: null,
      }),
    });

    const res = await request(app)
      .get('/api/shala/paquetes/mis-paquetes')
      .set('Authorization', 'Bearer token');

    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0].clases_restantes).toBe(8);
  });
});

describe('POST /api/shala/paquetes/otorgar', () => {
  it('admin can grant package to user', async () => {
    mockAuth('admin');

    mockFrom.mockReturnValueOnce({
      insert: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValueOnce({
        data: { id: 'pago-1', estado: 'aprobado' },
        error: null,
      }),
    });

    mockFrom.mockReturnValueOnce({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValueOnce({
        data: { id: 'pkg-1', num_clases: 10, vigencia_dias: 30, precio: 800 },
        error: null,
      }),
    });

    mockFrom.mockReturnValueOnce({
      insert: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValueOnce({
        data: { id: 'pu-1', clases_restantes: 10, expira_en: '2026-05-01T00:00:00Z' },
        error: null,
      }),
    });

    const res = await request(app)
      .post('/api/shala/paquetes/otorgar')
      .set('Authorization', 'Bearer admin-token')
      .send({ user_id: 'user-1', paquete_id: 'pkg-1', monto: 800 });

    expect(res.status).toBe(201);
    expect(res.body.clases_restantes).toBe(10);
  });
});
