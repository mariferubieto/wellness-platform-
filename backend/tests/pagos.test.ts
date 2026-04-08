// backend/tests/pagos.test.ts
import request from 'supertest';
import app from '../src/app';

jest.mock('../src/config/supabase', () => ({
  supabaseAdmin: {
    from: jest.fn(),
    auth: { getUser: jest.fn() },
  },
}));

// Mock mercadopago SDK
jest.mock('mercadopago', () => {
  const mockCreate = jest.fn();
  return {
    __esModule: true,
    default: jest.fn().mockImplementation(() => ({})),
    Preference: jest.fn().mockImplementation(() => ({ create: mockCreate })),
    Payment: jest.fn().mockImplementation(() => ({ get: jest.fn() })),
    _mockCreate: mockCreate,
  };
});

import { supabaseAdmin } from '../src/config/supabase';
const mockFrom = supabaseAdmin.from as jest.Mock;
const mockGetUser = supabaseAdmin.auth.getUser as jest.Mock;

function mockUserAuth(rol = 'user') {
  mockGetUser.mockResolvedValueOnce({ data: { user: { id: 'auth-user' } }, error: null });
  mockFrom.mockReturnValueOnce({
    select: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    single: jest.fn().mockResolvedValueOnce({
      data: { id: 'user-1', rol, nombre: 'Ana', email: 'ana@test.com', tags: [] },
      error: null,
    }),
  });
}

beforeEach(() => jest.resetAllMocks());

describe('POST /api/pagos/mercadopago/crear', () => {
  it('returns 401 without token', async () => {
    const res = await request(app)
      .post('/api/pagos/mercadopago/crear')
      .send({ concepto: 'paquete_shala', concepto_id: 'pkg-1', monto: 1500, titulo: 'Paquete 10' });
    expect(res.status).toBe(401);
  });

  it('returns 400 for invalid concepto', async () => {
    mockUserAuth();
    const res = await request(app)
      .post('/api/pagos/mercadopago/crear')
      .set('Authorization', 'Bearer valid-token')
      .send({ concepto: 'invalido', concepto_id: 'pkg-1', monto: 1500, titulo: 'Test' });
    expect(res.status).toBe(400);
  });

  it('returns 400 when required fields missing', async () => {
    mockUserAuth();
    const res = await request(app)
      .post('/api/pagos/mercadopago/crear')
      .set('Authorization', 'Bearer valid-token')
      .send({ concepto: 'paquete_shala' });
    expect(res.status).toBe(400);
  });
});

describe('POST /api/pagos/mercadopago/webhook', () => {
  it('returns 200 for any payload (fire-and-forget)', async () => {
    const res = await request(app)
      .post('/api/pagos/mercadopago/webhook')
      .send({ type: 'payment', data: { id: '12345' } });
    expect(res.status).toBe(200);
    expect(res.body.received).toBe(true);
  });

  it('returns 200 even for unknown event types', async () => {
    const res = await request(app)
      .post('/api/pagos/mercadopago/webhook')
      .send({ type: 'chargeback', data: { id: '999' } });
    expect(res.status).toBe(200);
  });
});

describe('GET /api/pagos/:id', () => {
  it('returns 401 without token', async () => {
    const res = await request(app).get('/api/pagos/some-pago-id');
    expect(res.status).toBe(401);
  });

  it('returns 404 for unknown pago', async () => {
    mockUserAuth();
    mockFrom.mockReturnValueOnce({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValueOnce({ data: null, error: { message: 'No rows' } }),
    });
    const res = await request(app)
      .get('/api/pagos/no-existe')
      .set('Authorization', 'Bearer valid-token');
    expect(res.status).toBe(404);
  });
});
