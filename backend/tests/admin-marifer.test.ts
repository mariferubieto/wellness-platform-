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

describe('GET /api/admin/retiros/:id/inscritos', () => {
  it('returns inscriptions for a retiro (admin)', async () => {
    mockAdminAuth();

    mockFrom.mockReturnValueOnce({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      order: jest.fn().mockResolvedValueOnce({
        data: [
          {
            id: 'insc-1',
            nombre_completo: 'Ana García',
            email: 'ana@gmail.com',
            whatsapp: '5512345678',
            estado_pago: 'pendiente',
            created_at: '2026-04-01T00:00:00Z',
          },
        ],
        error: null,
      }),
    });

    const res = await request(app)
      .get('/api/admin/retiros/ret-1/inscritos')
      .set('Authorization', 'Bearer admin-token');

    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0].nombre_completo).toBe('Ana García');
  });

  it('rejects non-admin', async () => {
    mockGetUser.mockResolvedValueOnce({ data: { user: { id: 'auth-user' } }, error: null });
    mockFrom.mockReturnValueOnce({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValueOnce({
        data: { id: 'u1', rol: 'user', nombre: 'User', email: 'u@t.com', tags: [] },
        error: null,
      }),
    });

    const res = await request(app)
      .get('/api/admin/retiros/ret-1/inscritos')
      .set('Authorization', 'Bearer user-token');

    expect(res.status).toBe(403);
  });
});

describe('GET /api/admin/exportar/retiro/:id', () => {
  it('returns xlsx for a retiro (admin)', async () => {
    mockAdminAuth();

    mockFrom.mockReturnValueOnce({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      order: jest.fn().mockResolvedValueOnce({
        data: [
          {
            id: 'insc-1',
            nombre_completo: 'Ana García',
            email: 'ana@gmail.com',
            whatsapp: '5512345678',
            fecha_nacimiento: '1990-05-15',
            ciudad: 'CDMX',
            instagram: '@ana',
            razon: 'Descansar',
            restricciones_alimenticias: null,
            estado_pago: 'pendiente',
            created_at: '2026-04-01T00:00:00Z',
            retiros: { nombre: 'Retiro de Meditación' },
          },
        ],
        error: null,
      }),
    });

    const res = await request(app)
      .get('/api/admin/exportar/retiro/ret-1')
      .set('Authorization', 'Bearer admin-token');

    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toContain('spreadsheetml');
  });
});

describe('GET /api/admin/eventos/:id/inscritos', () => {
  it('returns inscriptions for an evento (admin)', async () => {
    mockAdminAuth();

    mockFrom.mockReturnValueOnce({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      order: jest.fn().mockResolvedValueOnce({
        data: [
          {
            id: 'insc-e-1',
            nombre_completo: 'Laura López',
            email: 'laura@gmail.com',
            whatsapp: '5598765432',
            estado_pago: 'pendiente',
            created_at: '2026-04-02T00:00:00Z',
          },
        ],
        error: null,
      }),
    });

    const res = await request(app)
      .get('/api/admin/eventos/evt-1/inscritos')
      .set('Authorization', 'Bearer admin-token');

    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0].nombre_completo).toBe('Laura López');
  });
});

describe('GET /api/admin/exportar/evento/:id', () => {
  it('returns xlsx for an evento (admin)', async () => {
    mockAdminAuth();

    mockFrom.mockReturnValueOnce({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      order: jest.fn().mockResolvedValueOnce({
        data: [
          {
            id: 'insc-e-1',
            nombre_completo: 'Laura López',
            email: 'laura@gmail.com',
            whatsapp: '5598765432',
            estado_pago: 'pendiente',
            created_at: '2026-04-02T00:00:00Z',
            eventos: { nombre: 'Taller de Yoga' },
          },
        ],
        error: null,
      }),
    });

    const res = await request(app)
      .get('/api/admin/exportar/evento/evt-1')
      .set('Authorization', 'Bearer admin-token');

    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toContain('spreadsheetml');
  });
});
