import request from 'supertest';
import app from '../src/app';

const VALID_BODY = {
  curso_id: 'curso-1',
  nombre_completo: 'Ana García',
  whatsapp: '5512345678',
  email: 'ana@example.com',
};

jest.mock('../src/config/supabase', () => ({
  supabaseAdmin: {
    from: jest.fn().mockReturnThis(),
    insert: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    single: jest.fn().mockResolvedValue({
      data: {
        id: 'insc-1',
        curso_id: 'curso-1',
        nombre_completo: 'Ana García',
        whatsapp: '5512345678',
        email: 'ana@example.com',
        created_at: '2026-04-13T00:00:00.000Z',
      },
      error: null,
    }),
  },
}));

describe('POST /api/ayurveda/cursos-inscripciones', () => {
  it('creates inscription with valid body', async () => {
    const res = await request(app)
      .post('/api/ayurveda/cursos-inscripciones')
      .send(VALID_BODY);
    expect(res.status).toBe(201);
    expect(res.body.id).toBe('insc-1');
    expect(res.body.nombre_completo).toBe('Ana García');
  });

  it('returns 400 when nombre_completo is missing', async () => {
    const { nombre_completo, ...body } = VALID_BODY;
    const res = await request(app)
      .post('/api/ayurveda/cursos-inscripciones')
      .send(body);
    expect(res.status).toBe(400);
    expect(res.body.error).toBeDefined();
  });

  it('returns 400 when email is missing', async () => {
    const { email, ...body } = VALID_BODY;
    const res = await request(app)
      .post('/api/ayurveda/cursos-inscripciones')
      .send(body);
    expect(res.status).toBe(400);
  });

  it('returns 400 when curso_id is missing', async () => {
    const { curso_id, ...body } = VALID_BODY;
    const res = await request(app)
      .post('/api/ayurveda/cursos-inscripciones')
      .send(body);
    expect(res.status).toBe(400);
  });
});
