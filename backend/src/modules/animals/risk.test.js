import { describe, expect, it, vi } from 'vitest';
import { getAnimalRiskController } from './risk-controller.js';
import { prisma } from '../../infrastructure/prisma/client.js';

describe('Animal Risk Controller (GET /api/animals/:id/risk)', () => {
  it('applies smart hybrid logic when treatment_last_90d === 0', async () => {
    const mockAnimal = {
      id: 'anm-1',
      tagNumber: 'TAG-COW-001',
      name: 'Gauri',
      dateOfBirth: new Date(Date.now() - 4 * 365.25 * 24 * 60 * 60 * 1000),
      estimatedWeightKg: 460,
      species: { canonicalName: 'Cow' },
      breed: { name: 'Gir' },
      farm: { name: 'Test Farm' },
    };

    vi.spyOn(prisma.animal, 'findUnique').mockResolvedValue(mockAnimal);
    vi.spyOn(prisma.treatment, 'count').mockResolvedValue(0);
    vi.spyOn(prisma.treatmentAdministration, 'count').mockResolvedValue(0);
    vi.spyOn(prisma.treatment, 'findFirst').mockResolvedValue(null);
    vi.spyOn(prisma.treatmentAdministration, 'findFirst').mockResolvedValue(null);

    const req = { params: { id: 'anm-1' } };
    let jsonResult = null;
    const res = {
      json: (data) => {
        jsonResult = data;
        return data;
      },
    };

    await getAnimalRiskController(req, res);

    expect(jsonResult).toBeDefined();
    const payload = jsonResult.data;
    expect(payload.species).toBe('Cow');
    expect(payload.inputs.treatment_last_30d).toBe(0);
    expect(payload.inputs.treatment_last_90d).toBe(0);
    expect(payload.inputs.days_since_last_treatment).toBe(999);
    expect(payload.inputs.unique_antimicrobial_classes_90d).toBe(0);
    expect(payload.inputs.total_antimicrobial_days_90d).toBe(0);
    expect(payload.inputs.max_repeated_class_count_90d).toBe(0);
    expect(payload.inputs.mean_treatment_interval_days).toBe(0);
    expect(payload.inputs.recurrent_condition_events_90d).toBe(0);
    expect(payload.inputs.no_response_events_90d).toBe(0);
    expect(payload.inputs.partial_response_events_90d).toBe(0);
    expect(payload.riskLevel).toBe('LOW');
    expect(payload.icon).toBe('🟢');
    expect(payload.badgeText).toContain('Low');
  });

  it('applies smart hybrid logic when treatment_last_90d > 0', async () => {
    const mockAnimal = {
      id: 'anm-2',
      tagNumber: 'TAG-BUF-002',
      name: 'Shyama',
      dateOfBirth: new Date(Date.now() - 3 * 365.25 * 24 * 60 * 60 * 1000),
      species: { canonicalName: 'Buffalo' },
      breed: { name: 'Murrah' },
      farm: { name: 'Test Farm' },
    };

    vi.spyOn(prisma.animal, 'findUnique').mockResolvedValue(mockAnimal);
    vi.spyOn(prisma.treatment, 'count').mockImplementation(async ({ where }) => {
      const gte = where?.createdAt?.gte;
      const is30d = Date.now() - gte.getTime() <= 35 * 24 * 60 * 60 * 1000;
      return is30d ? 1 : 2;
    });
    vi.spyOn(prisma.treatmentAdministration, 'count').mockResolvedValue(0);
    vi.spyOn(prisma.treatment, 'findFirst').mockResolvedValue({
      id: 'trt-1',
      completedAt: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000),
    });
    vi.spyOn(prisma.treatmentAdministration, 'findFirst').mockResolvedValue(null);

    const req = { params: { id: 'anm-2' } };
    let jsonResult = null;
    const res = {
      json: (data) => {
        jsonResult = data;
        return data;
      },
    };

    await getAnimalRiskController(req, res);

    expect(jsonResult).toBeDefined();
    const payload = jsonResult.data;
    expect(payload.species).toBe('Buffalo');
    expect(payload.inputs.treatment_last_30d).toBe(1);
    expect(payload.inputs.treatment_last_90d).toBe(2);
    expect(payload.inputs.days_since_last_treatment).toBe(15);
    expect(payload.inputs.unique_antimicrobial_classes_90d).toBe(1);
    expect(payload.inputs.max_repeated_class_count_90d).toBe(1);
    expect(payload.inputs.total_antimicrobial_days_90d).toBe(6); // 2 * 3
    expect(payload.riskLevel).toBe('MEDIUM');
    expect(payload.icon).toBe('🟡');
    expect(payload.badgeText).toContain('Medium');
  });
});
