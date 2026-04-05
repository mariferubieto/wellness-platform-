import request from 'supertest';
import app from '../src/app';
import { supabaseAdmin } from '../src/config/supabase';

jest.mock('../src/config/supabase', () => ({
  supabaseAdmin: {
    auth: { getUser: jest.fn() },
    from: jest.fn(),
  },
}));

const mockAdmin = supabaseAdmin as jest.Mocked<typeof supabaseAdmin>;

function mockAdminAuth() {
  (mockAdmin.auth.getUser as jest.Mock).mockResolvedValue({
    data: { user: { id: 'supabase-auth-id' } },
    error: null,
  });
  (mockAdmin.from as jest.Mock).mockReturnValueOnce({
    select: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    single: jest.fn().mockResolvedValue({
      data: { id: 'admin-id', nombre: 'Admin', email: 'admin@test.com', rol: 'admin', tags: [] },
      error: null,
    }),
  });
}

describe('GET /api/admin/dashboard', () => {
  it('requiere rol admin', async () => {
    (mockAdmin.auth.getUser as jest.Mock).mockResolvedValue({
      data: { user: { id: 'supabase-auth-id' } },
      error: null,
    });
    (mockAdmin.from as jest.Mock).mockReturnValueOnce({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({
        data: { id: 'user-id', nombre: 'Ana', email: 'ana@test.com', rol: 'user', tags: [] },
        error: null,
      }),
    });

    const res = await request(app)
      .get('/api/admin/dashboard')
      .set('Authorization', 'Bearer valid-token');

    expect(res.status).toBe(403);
  });

  it('retorna métricas del dashboard', async () => {
    mockAdminAuth();

    (mockAdmin.from as jest.Mock)
      .mockReturnValueOnce({
        select: jest.fn().mockResolvedValue({ count: 42, error: null }),
      })
      .mockReturnValueOnce({
        select: jest.fn().mockResolvedValue({ count: 15, error: null }),
      })
      .mockReturnValueOnce({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({ count: 8, error: null }),
        }),
      });

    const res = await request(app)
      .get('/api/admin/dashboard')
      .set('Authorization', 'Bearer valid-token');

    expect(res.status).toBe(200);
    expect(res.body.total_usuarios).toBe(42);
    expect(res.body.total_leads).toBe(15);
    expect(res.body.leads_nuevos).toBe(8);
  });
});

describe('GET /api/admin/crm', () => {
  it('retorna lista combinada de usuarios y leads', async () => {
    mockAdminAuth();

    (mockAdmin.from as jest.Mock).mockReturnValue({
      select: jest.fn().mockReturnThis(),
      order: jest.fn().mockReturnThis(),
      range: jest.fn().mockResolvedValue({
        data: [],
        error: null,
        count: 0,
      }),
    });

    const res = await request(app)
      .get('/api/admin/crm')
      .set('Authorization', 'Bearer valid-token');

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('usuarios');
    expect(res.body).toHaveProperty('leads');
  });
});
