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

describe('GET /api/ayurveda/diplomados', () => {
  it('returns active diplomados (public)', async () => {
    mockFrom.mockReturnValueOnce({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      order: jest.fn().mockResolvedValueOnce({
        data: [
          {
            id: 'dip-1',
            nombre: 'Diplomado Ayurveda 2026',
            descripcion: 'Formación completa',
            precio: 15000,
            generacion: 'Generación 2026-A',
            activo: true,
          },
        ],
        error: null,
      }),
    });

    const res = await request(app).get('/api/ayurveda/diplomados');
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0].nombre).toBe('Diplomado Ayurveda 2026');
  });
});

describe('GET /api/ayurveda/diplomados/:id', () => {
  it('returns diplomado detail (public)', async () => {
    mockFrom.mockReturnValueOnce({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValueOnce({
        data: {
          id: 'dip-1',
          nombre: 'Diplomado Ayurveda 2026',
          descripcion: 'Formación completa',
          temario: ['Módulo 1: Fundamentos', 'Módulo 2: Doshas'],
          calendario: ['15 febrero 2026', '22 febrero 2026'],
          precio: 15000,
          generacion: 'Generación 2026-A',
          activo: true,
        },
        error: null,
      }),
    });

    const res = await request(app).get('/api/ayurveda/diplomados/dip-1');
    expect(res.status).toBe(200);
    expect(res.body.temario).toHaveLength(2);
    expect(res.body.generacion).toBe('Generación 2026-A');
  });

  it('returns 404 when diplomado not found', async () => {
    mockFrom.mockReturnValueOnce({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValueOnce({ data: null, error: { message: 'Not found' } }),
    });

    const res = await request(app).get('/api/ayurveda/diplomados/no-existe');
    expect(res.status).toBe(404);
  });
});

describe('POST /api/ayurveda/diplomados (admin)', () => {
  it('creates a diplomado (admin only)', async () => {
    mockAdminAuth();

    mockFrom.mockReturnValueOnce({
      insert: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValueOnce({
        data: {
          id: 'dip-new',
          nombre: 'Nuevo Diplomado',
          precio: 12000,
          generacion: 'Generación 2026-B',
          activo: true,
        },
        error: null,
      }),
    });

    const res = await request(app)
      .post('/api/ayurveda/diplomados')
      .set('Authorization', 'Bearer admin-token')
      .send({ nombre: 'Nuevo Diplomado', precio: 12000, generacion: 'Generación 2026-B' });

    expect(res.status).toBe(201);
    expect(res.body.id).toBe('dip-new');
  });

  it('rejects non-admin users', async () => {
    mockGetUser.mockResolvedValueOnce({ data: { user: { id: 'auth-user' } }, error: null });
    mockFrom.mockReturnValueOnce({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValueOnce({
        data: { id: 'user-1', rol: 'user', nombre: 'User', email: 'u@t.com', tags: [] },
        error: null,
      }),
    });

    const res = await request(app)
      .post('/api/ayurveda/diplomados')
      .set('Authorization', 'Bearer user-token')
      .send({ nombre: 'Nuevo', precio: 1000, generacion: 'Gen A' });

    expect(res.status).toBe(403);
  });
});

describe('POST /api/ayurveda/inscripciones', () => {
  it('creates an inscription without auth', async () => {
    // 1) check diplomado exists
    mockFrom.mockReturnValueOnce({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValueOnce({
        data: { id: 'dip-1', nombre: 'Diplomado Ayurveda 2026', activo: true },
        error: null,
      }),
    });

    // 2) insert inscripcion
    mockFrom.mockReturnValueOnce({
      insert: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValueOnce({
        data: {
          id: 'insc-1',
          diplomado_id: 'dip-1',
          nombre_completo: 'Ana García',
          whatsapp: '5512345678',
          email_gmail: 'ana@gmail.com',
          estado_pago: 'pendiente',
        },
        error: null,
      }),
    });

    const res = await request(app)
      .post('/api/ayurveda/inscripciones')
      .send({
        diplomado_id: 'dip-1',
        nombre_completo: 'Ana García',
        whatsapp: '5512345678',
        email_gmail: 'ana@gmail.com',
        razon: 'Quiero aprender',
      });

    expect(res.status).toBe(201);
    expect(res.body.nombre_completo).toBe('Ana García');
    expect(res.body.estado_pago).toBe('pendiente');
  });

  it('returns 400 when required fields missing', async () => {
    const res = await request(app)
      .post('/api/ayurveda/inscripciones')
      .send({ diplomado_id: 'dip-1' });

    expect(res.status).toBe(400);
  });

  it('returns 404 when diplomado not found or inactive', async () => {
    mockFrom.mockReturnValueOnce({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValueOnce({ data: null, error: { message: 'Not found' } }),
    });

    const res = await request(app)
      .post('/api/ayurveda/inscripciones')
      .send({
        diplomado_id: 'no-existe',
        nombre_completo: 'Ana',
        whatsapp: '55',
        email_gmail: 'a@gmail.com',
      });

    expect(res.status).toBe(404);
  });
});
