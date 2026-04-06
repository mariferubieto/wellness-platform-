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

describe('GET /api/eventos', () => {
  it('returns active events (public)', async () => {
    mockFrom.mockReturnValueOnce({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      order: jest.fn().mockResolvedValueOnce({
        data: [
          {
            id: 'evt-1',
            nombre: 'Taller de Yoga',
            precio: 350,
            fecha: '2026-05-15T10:00:00Z',
            tipo_acceso: 'pago',
            activo: true,
          },
        ],
        error: null,
      }),
    });

    const res = await request(app).get('/api/eventos');
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0].tipo_acceso).toBe('pago');
  });
});

describe('GET /api/eventos/:id', () => {
  it('returns evento detail (public)', async () => {
    mockFrom.mockReturnValueOnce({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValueOnce({
        data: {
          id: 'evt-1',
          nombre: 'Taller de Yoga',
          descripcion: 'Workshop intensivo',
          lugar: 'CDMX',
          flyer_url: null,
          precio: 350,
          fecha: '2026-05-15T10:00:00Z',
          tipo_acceso: 'pago',
          whatsapp_contacto: '5512345678',
          activo: true,
        },
        error: null,
      }),
    });

    const res = await request(app).get('/api/eventos/evt-1');
    expect(res.status).toBe(200);
    expect(res.body.tipo_acceso).toBe('pago');
  });

  it('returns 404 when not found', async () => {
    mockFrom.mockReturnValueOnce({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValueOnce({ data: null, error: { message: 'Not found' } }),
    });

    const res = await request(app).get('/api/eventos/no-existe');
    expect(res.status).toBe(404);
  });
});

describe('POST /api/eventos (admin)', () => {
  it('creates an evento (admin only)', async () => {
    mockAdminAuth();

    mockFrom.mockReturnValueOnce({
      insert: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValueOnce({
        data: { id: 'evt-new', nombre: 'Nuevo Evento', tipo_acceso: 'pago', activo: true },
        error: null,
      }),
    });

    const res = await request(app)
      .post('/api/eventos')
      .set('Authorization', 'Bearer admin-token')
      .send({ nombre: 'Nuevo Evento', tipo_acceso: 'pago' });

    expect(res.status).toBe(201);
    expect(res.body.id).toBe('evt-new');
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
      .post('/api/eventos')
      .set('Authorization', 'Bearer user-token')
      .send({ nombre: 'Test' });

    expect(res.status).toBe(403);
  });
});

describe('POST /api/eventos/inscripciones', () => {
  it('creates an inscription (public)', async () => {
    // 1) check evento exists
    mockFrom.mockReturnValueOnce({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValueOnce({
        data: { id: 'evt-1', nombre: 'Taller de Yoga', activo: true, tipo_acceso: 'pago' },
        error: null,
      }),
    });

    // 2) insert inscripcion
    mockFrom.mockReturnValueOnce({
      insert: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValueOnce({
        data: {
          id: 'insc-evt-1',
          evento_id: 'evt-1',
          nombre_completo: 'Ana García',
          email: 'ana@gmail.com',
          whatsapp: '5512345678',
          estado_pago: 'pendiente',
        },
        error: null,
      }),
    });

    const res = await request(app)
      .post('/api/eventos/inscripciones')
      .send({
        evento_id: 'evt-1',
        nombre_completo: 'Ana García',
        email: 'ana@gmail.com',
        whatsapp: '5512345678',
      });

    expect(res.status).toBe(201);
    expect(res.body.nombre_completo).toBe('Ana García');
    expect(res.body.estado_pago).toBe('pendiente');
  });

  it('returns 400 when required fields missing', async () => {
    const res = await request(app)
      .post('/api/eventos/inscripciones')
      .send({ evento_id: 'evt-1' });

    expect(res.status).toBe(400);
  });

  it('returns 404 when evento not found', async () => {
    mockFrom.mockReturnValueOnce({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValueOnce({ data: null, error: { message: 'Not found' } }),
    });

    const res = await request(app)
      .post('/api/eventos/inscripciones')
      .send({ evento_id: 'no-existe', nombre_completo: 'Ana', email: 'a@b.com', whatsapp: '55' });

    expect(res.status).toBe(404);
  });
});
