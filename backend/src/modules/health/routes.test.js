import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { createApp } from '../../app.js';
describe('GET /api/v1/health', () => {
  it('returns API health without external services', async () => {
    const response = await request(createApp()).get('/api/v1/health');
    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({ status: 'ok', service: 'sih25007-backend' });
  });
});
