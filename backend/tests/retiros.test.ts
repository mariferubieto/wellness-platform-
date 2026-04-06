// backend/tests/retiros.test.ts
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

describe('GET /api/retiros', () => {
  it('returns active retiros (public)', async () => {
    mockFrom.mockReturnValueOnce({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      order: jest.fn().mockResolvedValueOnce({
        data: [
          {
            id: 'ret-1',
            nombre: 'Retiro de Meditación',
            descripcion: 'Retiro en la montaña',
            lugar: 'Tepoztlán',
            precio: 8500,
            fecha_inicio: '2026-06-01',
            fecha_fin: '2026-06-03',
            activo: true,
          },
        ],
        error: null,
      }),
    });

    const res = await request(app).get('/api/retiros');
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0].nombre).toBe('Retiro de Meditación');
  });
});

describe('GET /api/retiros/:id', () => {
  it('returns retiro detail (public)', async () => {
    mockFrom.mockReturnValueOnce({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValueOnce({
        data: {
          id: 'ret-1',
          nombre: 'Retiro de Meditación',
          descripcion: 'Retiro en la montaña',
          lugar: 'Tepoztlán',
          incluye: 'Hospedaje, 3 comidas, sesiones guiadas',
          precio: 8500,
          fecha_inicio: '2026-06-01',
          fecha_fin: '2026-06-03',
          whatsapp_contacto: '5512345678',
          activo: true,
        },
        error: null,
      }),
    });

    const res = await request(app).get('/api/retiros/ret-1');
    expect(res.status).toBe(200);
    expect(res.body.incluye).toBeTruthy();
    expect(res.body.whatsapp_contacto).toBe('5512345678');
  });

  it('returns 404 when not found', async () => {
    mockFrom.mockReturnValueOnce({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValueOnce({ data: null, error: { message: 'Not found' } }),
    });

    const res = await request(app).get('/api/retiros/no-existe');
    expect(res.status).toBe(404);
  });
});

describe('POST /api/retiros (admin)', () => {
  it('creates a retiro (admin only)', async () => {
    mockAdminAuth();

    mockFrom.mockReturnValueOnce({
      insert: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValueOnce({
        data: { id: 'ret-new', nombre: 'Nuevo Retiro', precio: 7000, activo: true },
        error: null,
      }),
    });

    const res = await request(app)
      .post('/api/retiros')
      .set('Authorization', 'Bearer admin-token')
      .send({ nombre: 'Nuevo Retiro', precio: 7000 });

    expect(res.status).toBe(201);
    expect(res.body.id).toBe('ret-new');
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
      .post('/api/retiros')
      .set('Authorization', 'Bearer user-token')
      .send({ nombre: 'Test', precio: 1000 });

    expect(res.status).toBe(403);
  });
});

describe('POST /api/retiros/inscripciones', () => {
  it('creates an inscription without auth', async () => {
    // 1) check retiro exists
    mockFrom.mockReturnValueOnce({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValueOnce({
        data: { id: 'ret-1', nombre: 'Retiro de Meditación', activo: true },
        error: null,
      }),
    });

    // 2) insert inscripcion
    mockFrom.mockReturnValueOnce({
      insert: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValueOnce({
        data: {
          id: 'insc-ret-1',
          retiro_id: 'ret-1',
          nombre_completo: 'Ana García',
          whatsapp: '5512345678',
          email: 'ana@gmail.com',
          estado_pago: 'pendiente',
        },
        error: null,
      }),
    });

    const res = await request(app)
      .post('/api/retiros/inscripciones')
      .send({
        retiro_id: 'ret-1',
        nombre_completo: 'Ana García',
        whatsapp: '5512345678',
        email: 'ana@gmail.com',
      });

    expect(res.status).toBe(201);
    expect(res.body.nombre_completo).toBe('Ana García');
    expect(res.body.estado_pago).toBe('pendiente');
  });

  it('returns 400 when required fields missing', async () => {
    const res = await request(app)
      .post('/api/retiros/inscripciones')
      .send({ retiro_id: 'ret-1' });

    expect(res.status).toBe(400);
  });

  it('returns 404 when retiro not found', async () => {
    mockFrom.mockReturnValueOnce({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValueOnce({ data: null, error: { message: 'Not found' } }),
    });

    const res = await request(app)
      .post('/api/retiros/inscripciones')
      .send({ retiro_id: 'no-existe', nombre_completo: 'Ana', whatsapp: '55', email: 'a@b.com' });

    expect(res.status).toBe(404);
  });
});
