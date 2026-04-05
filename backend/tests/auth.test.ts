import request from 'supertest';
import app from '../src/app';
import { supabaseAdmin } from '../src/config/supabase';

jest.mock('../src/config/supabase', () => ({
  supabaseAdmin: {
    auth: {
      getUser: jest.fn(),
      admin: {
        createUser: jest.fn(),
        deleteUser: jest.fn(),
      },
    },
    from: jest.fn(),
  },
}));

const mockAdmin = supabaseAdmin as jest.Mocked<typeof supabaseAdmin>;

const mockUser = {
  id: 'test-profile-id',
  nombre: 'Ana García',
  email: 'ana@test.com',
  telefono: '5512345678',
  fecha_nacimiento: '1990-01-15',
  rol: 'user',
  fuente: 'shala',
  tags: [],
  created_at: new Date().toISOString(),
};

describe('Auth middleware', () => {
  it('rechaza requests sin token', async () => {
    const res = await request(app).get('/api/auth/me');
    expect(res.status).toBe(401);
    expect(res.body.error).toBe('Token requerido');
  });

  it('rechaza tokens inválidos', async () => {
    (mockAdmin.auth.getUser as jest.Mock).mockResolvedValueOnce({
      data: { user: null },
      error: new Error('Invalid token'),
    });

    const res = await request(app)
      .get('/api/auth/me')
      .set('Authorization', 'Bearer token-invalido');
    expect(res.status).toBe(401);
    expect(res.body.error).toBe('Token inválido');
  });
});

describe('POST /api/auth/register', () => {
  it('registra un nuevo usuario correctamente', async () => {
    (mockAdmin.auth.admin.createUser as jest.Mock).mockResolvedValueOnce({
      data: { user: { id: 'supabase-auth-id' } },
      error: null,
    });

    const fromMock = {
      insert: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({ data: mockUser, error: null }),
    };
    (mockAdmin.from as jest.Mock).mockReturnValue(fromMock);

    const res = await request(app)
      .post('/api/auth/register')
      .send({
        nombre: 'Ana García',
        email: 'ana@test.com',
        password: 'Segura123!',
        telefono: '5512345678',
        fecha_nacimiento: '1990-01-15',
        fuente: 'shala',
      });

    expect(res.status).toBe(201);
    expect(res.body.user.email).toBe('ana@test.com');
    expect(res.body.user.nombre).toBe('Ana García');
  });

  it('falla si faltan campos requeridos', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ email: 'ana@test.com' });

    expect(res.status).toBe(400);
    expect(res.body.error).toContain('requerido');
  });
});

describe('GET /api/auth/me', () => {
  it('retorna perfil del usuario autenticado', async () => {
    (mockAdmin.auth.getUser as jest.Mock).mockResolvedValueOnce({
      data: { user: { id: 'supabase-auth-id' } },
      error: null,
    });

    const fromMock = {
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({ data: mockUser, error: null }),
    };
    (mockAdmin.from as jest.Mock).mockReturnValue(fromMock);

    const res = await request(app)
      .get('/api/auth/me')
      .set('Authorization', 'Bearer valid-token');

    expect(res.status).toBe(200);
    expect(res.body.email).toBe('ana@test.com');
  });
});
