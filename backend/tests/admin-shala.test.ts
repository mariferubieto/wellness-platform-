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

describe('GET /api/admin/shala/alumnos', () => {
  it('returns students list (admin only)', async () => {
    mockAdminAuth();

    mockFrom.mockReturnValueOnce({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      order: jest.fn().mockResolvedValueOnce({
        data: [
          {
            id: 'u1',
            nombre: 'Ana',
            email: 'ana@t.com',
            telefono: '5512345678',
            created_at: '2026-01-01T00:00:00Z',
            paquetes_usuario: [{ id: 'pu-1', clases_restantes: 5, expira_en: '2026-06-01T00:00:00Z', activo: true }],
          },
        ],
        error: null,
      }),
    });

    const res = await request(app)
      .get('/api/admin/shala/alumnos')
      .set('Authorization', 'Bearer admin-token');

    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0].nombre).toBe('Ana');
  });
});

describe('GET /api/admin/shala/leads', () => {
  it('returns shala leads (admin only)', async () => {
    mockAdminAuth();

    mockFrom.mockReturnValueOnce({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      order: jest.fn().mockResolvedValueOnce({
        data: [{ id: 'l1', nombre: 'María', email: 'm@t.com', fuente: 'shala', estado: 'nuevo' }],
        error: null,
      }),
    });

    const res = await request(app)
      .get('/api/admin/shala/leads')
      .set('Authorization', 'Bearer admin-token');

    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0].fuente).toBe('shala');
  });
});
