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

function mockUserAuth(userId: string = 'user-1') {
  mockGetUser.mockResolvedValueOnce({ data: { user: { id: 'auth-1' } }, error: null });
  mockFrom.mockReturnValueOnce({
    select: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    single: jest.fn().mockResolvedValueOnce({
      data: { id: userId, rol: 'user', nombre: 'User', email: 'u@t.com', tags: [] },
      error: null,
    }),
  });
}

const futureDate = new Date(Date.now() + 3 * 60 * 60 * 1000).toISOString();
const soonDate = new Date(Date.now() + 1 * 60 * 60 * 1000).toISOString();

beforeEach(() => jest.resetAllMocks());

describe('POST /api/shala/reservas — crear reserva', () => {
  it('fails if no active package', async () => {
    mockUserAuth();

    mockFrom.mockReturnValueOnce({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValueOnce({
        data: { id: 'clase-1', capacidad: 15, cupo_actual: 3, tipo: 'regular', activo: true, inicio: futureDate },
        error: null,
      }),
    });

    mockFrom.mockReturnValueOnce({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      gt: jest.fn().mockReturnThis(),
      order: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValueOnce({ data: null, error: { message: 'Row not found', code: 'PGRST116' } }),
    });

    const res = await request(app)
      .post('/api/shala/reservas')
      .set('Authorization', 'Bearer token')
      .send({ clase_id: 'clase-1' });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/paquete/i);
  });

  it('fails if class is full', async () => {
    mockUserAuth();

    mockFrom.mockReturnValueOnce({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValueOnce({
        data: { id: 'clase-1', capacidad: 10, cupo_actual: 10, tipo: 'regular', activo: true, inicio: futureDate },
        error: null,
      }),
    });

    const res = await request(app)
      .post('/api/shala/reservas')
      .set('Authorization', 'Bearer token')
      .send({ clase_id: 'clase-1' });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/cupo/i);
  });

  it('creates reservation and decrements credit', async () => {
    mockUserAuth();

    mockFrom.mockReturnValueOnce({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValueOnce({
        data: { id: 'clase-1', capacidad: 15, cupo_actual: 3, tipo: 'regular', activo: true, inicio: futureDate },
        error: null,
      }),
    });

    mockFrom.mockReturnValueOnce({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      gt: jest.fn().mockReturnThis(),
      order: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValueOnce({
        data: { id: 'pu-1', clases_restantes: 5, expira_en: '2026-12-01T00:00:00Z' },
        error: null,
      }),
    });

    mockFrom.mockReturnValueOnce({
      insert: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValueOnce({
        data: { id: 'res-1', estado: 'activa', clase_id: 'clase-1' },
        error: null,
      }),
    });

    mockFrom.mockReturnValueOnce({
      update: jest.fn().mockReturnThis(),
      eq: jest.fn().mockResolvedValueOnce({ error: null }),
    });

    mockFrom.mockReturnValueOnce({
      update: jest.fn().mockReturnThis(),
      eq: jest.fn().mockResolvedValueOnce({ error: null }),
    });

    const res = await request(app)
      .post('/api/shala/reservas')
      .set('Authorization', 'Bearer token')
      .send({ clase_id: 'clase-1' });

    expect(res.status).toBe(201);
    expect(res.body.id).toBe('res-1');
  });
});

describe('DELETE /api/shala/reservas/:id — cancelar reserva', () => {
  it('returns credit if cancelled >= 2h before class', async () => {
    mockUserAuth();

    mockFrom.mockReturnValueOnce({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValueOnce({
        data: {
          id: 'res-1',
          user_id: 'user-1',
          clase_id: 'clase-1',
          estado: 'activa',
          paquete_usuario_id: 'pu-1',
          clases: { inicio: futureDate, cupo_actual: 4 },
        },
        error: null,
      }),
    });

    mockFrom.mockReturnValueOnce({
      update: jest.fn().mockReturnThis(),
      eq: jest.fn().mockResolvedValueOnce({ error: null }),
    });

    mockFrom.mockReturnValueOnce({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValueOnce({
        data: { clases_restantes: 2 },
        error: null,
      }),
    });

    mockFrom.mockReturnValueOnce({
      update: jest.fn().mockReturnThis(),
      eq: jest.fn().mockResolvedValueOnce({ error: null }),
    });

    mockFrom.mockReturnValueOnce({
      update: jest.fn().mockReturnThis(),
      eq: jest.fn().mockResolvedValueOnce({ error: null }),
    });

    const res = await request(app)
      .delete('/api/shala/reservas/res-1')
      .set('Authorization', 'Bearer token');

    expect(res.status).toBe(200);
    expect(res.body.credito_devuelto).toBe(true);
  });

  it('does NOT return credit if cancelled < 2h before class', async () => {
    mockUserAuth();

    mockFrom.mockReturnValueOnce({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValueOnce({
        data: {
          id: 'res-2',
          user_id: 'user-1',
          clase_id: 'clase-1',
          estado: 'activa',
          paquete_usuario_id: 'pu-1',
          clases: { inicio: soonDate, cupo_actual: 4 },
        },
        error: null,
      }),
    });

    mockFrom.mockReturnValueOnce({
      update: jest.fn().mockReturnThis(),
      eq: jest.fn().mockResolvedValueOnce({ error: null }),
    });

    mockFrom.mockReturnValueOnce({
      update: jest.fn().mockReturnThis(),
      eq: jest.fn().mockResolvedValueOnce({ error: null }),
    });

    const res = await request(app)
      .delete('/api/shala/reservas/res-2')
      .set('Authorization', 'Bearer token');

    expect(res.status).toBe(200);
    expect(res.body.credito_devuelto).toBe(false);
  });
});
