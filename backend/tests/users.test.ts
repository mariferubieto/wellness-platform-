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

beforeEach(() => {
  jest.resetAllMocks();
});

const mockProfile = {
  id: 'user-123',
  nombre: 'Ana García',
  email: 'ana@test.com',
  telefono: '5512345678',
  fecha_nacimiento: '1990-01-15',
  rol: 'user',
  fuente: 'shala',
  tags: ['yoga'],
  created_at: new Date().toISOString(),
};

function mockAuthMiddleware(userId: string, rol: string, profile: object) {
  (mockAdmin.auth.getUser as jest.Mock).mockResolvedValue({
    data: { user: { id: 'supabase-auth-id' } },
    error: null,
  });
  const fromForAuth = {
    select: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    single: jest.fn().mockResolvedValue({
      data: { id: userId, nombre: 'Ana', email: 'ana@test.com', rol, tags: [] },
      error: null,
    }),
  };
  const fromForProfile = {
    select: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    single: jest.fn().mockResolvedValue({ data: profile, error: null }),
    update: jest.fn().mockReturnThis(),
  };
  (mockAdmin.from as jest.Mock)
    .mockReturnValueOnce(fromForAuth)
    .mockReturnValueOnce(fromForProfile);
}

describe('GET /api/users/:id', () => {
  it('retorna el perfil del usuario', async () => {
    mockAuthMiddleware('user-123', 'user', mockProfile);

    const res = await request(app)
      .get('/api/users/user-123')
      .set('Authorization', 'Bearer valid-token');

    expect(res.status).toBe(200);
    expect(res.body.nombre).toBe('Ana García');
  });

  it('rechaza acceso a perfil de otro usuario', async () => {
    mockAuthMiddleware('user-123', 'user', mockProfile);

    const res = await request(app)
      .get('/api/users/otro-usuario-id')
      .set('Authorization', 'Bearer valid-token');

    expect(res.status).toBe(403);
  });
});

describe('PATCH /api/users/:id', () => {
  it('actualiza el perfil correctamente', async () => {
    (mockAdmin.auth.getUser as jest.Mock).mockResolvedValue({
      data: { user: { id: 'supabase-auth-id' } },
      error: null,
    });
    const fromForAuth = {
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({
        data: { id: 'user-123', nombre: 'Ana', email: 'ana@test.com', rol: 'user', tags: [] },
        error: null,
      }),
    };
    const updated = { ...mockProfile, telefono: '5598765432' };
    const fromForUpdate = {
      update: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({ data: updated, error: null }),
    };
    (mockAdmin.from as jest.Mock)
      .mockReturnValueOnce(fromForAuth)
      .mockReturnValueOnce(fromForUpdate);

    const res = await request(app)
      .patch('/api/users/user-123')
      .set('Authorization', 'Bearer valid-token')
      .send({ telefono: '5598765432' });

    expect(res.status).toBe(200);
    expect(res.body.telefono).toBe('5598765432');
  });
});
