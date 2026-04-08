// backend/tests/behavior.test.ts
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

beforeEach(() => jest.resetAllMocks());

describe('POST /api/behavior/track', () => {
  it('returns 400 when tipo is missing', async () => {
    const res = await request(app)
      .post('/api/behavior/track')
      .send({ pagina: '/shala' });
    expect(res.status).toBe(400);
  });

  it('returns 202 and tracks page view', async () => {
    mockFrom.mockReturnValue({
      insert: jest.fn().mockResolvedValueOnce({ data: [{ id: 'evt-1' }], error: null }),
    });

    const res = await request(app)
      .post('/api/behavior/track')
      .send({ tipo: 'page_view', pagina: '/shala' });
    expect(res.status).toBe(202);
    expect(res.body.tracked).toBe(true);
  });

  it('returns 202 even when DB fails (non-blocking)', async () => {
    mockFrom.mockReturnValue({
      insert: jest.fn().mockRejectedValueOnce(new Error('DB error')),
    });

    const res = await request(app)
      .post('/api/behavior/track')
      .send({ tipo: 'page_view', pagina: '/shala' });
    expect(res.status).toBe(202);
  });
});
