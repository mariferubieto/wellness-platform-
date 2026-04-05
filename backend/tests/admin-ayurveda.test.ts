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

describe('GET /api/admin/ayurveda/alumnos', () => {
  it('returns all inscriptions (admin only)', async () => {
    mockAdminAuth();

    mockFrom.mockReturnValueOnce({
      select: jest.fn().mockReturnThis(),
      order: jest.fn().mockResolvedValueOnce({
        data: [
          {
            id: 'insc-1',
            nombre_completo: 'Ana García',
            email_gmail: 'ana@gmail.com',
            whatsapp: '5512345678',
            estado_pago: 'pendiente',
            created_at: '2026-04-01T00:00:00Z',
            diplomados: { nombre: 'Diplomado Ayurveda 2026', generacion: 'Generación 2026-A' },
          },
        ],
        error: null,
      }),
    });

    const res = await request(app)
      .get('/api/admin/ayurveda/alumnos')
      .set('Authorization', 'Bearer admin-token');

    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0].nombre_completo).toBe('Ana García');
  });

  it('filters by generacion when provided', async () => {
    mockAdminAuth();

    mockFrom.mockReturnValueOnce({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      order: jest.fn().mockResolvedValueOnce({
        data: [],
        error: null,
      }),
    });

    const res = await request(app)
      .get('/api/admin/ayurveda/alumnos?generacion=Generaci%C3%B3n+2026-A')
      .set('Authorization', 'Bearer admin-token');

    expect(res.status).toBe(200);
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
      .get('/api/admin/ayurveda/alumnos')
      .set('Authorization', 'Bearer user-token');

    expect(res.status).toBe(403);
  });
});

describe('GET /api/admin/ayurveda/exportar/:generacion', () => {
  it('returns xlsx buffer for a generacion (admin only)', async () => {
    mockAdminAuth();

    mockFrom.mockReturnValueOnce({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      order: jest.fn().mockResolvedValueOnce({
        data: [
          {
            id: 'insc-1',
            nombre_completo: 'Ana García',
            email_gmail: 'ana@gmail.com',
            whatsapp: '5512345678',
            fecha_nacimiento: '1990-05-15',
            razon: 'Aprender',
            estado_pago: 'pendiente',
            created_at: '2026-04-01T00:00:00Z',
            diplomados: { nombre: 'Diplomado Ayurveda 2026', generacion: 'Generación 2026-A' },
          },
        ],
        error: null,
      }),
    });

    const res = await request(app)
      .get('/api/admin/ayurveda/exportar/Generaci%C3%B3n+2026-A')
      .set('Authorization', 'Bearer admin-token');

    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toContain('spreadsheetml');
  });
});
