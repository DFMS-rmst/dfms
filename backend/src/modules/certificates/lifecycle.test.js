import { describe, expect, it, vi } from 'vitest';
import { revokeActiveCertificates } from './lifecycle.js';

describe('certificate eligibility lifecycle hook', () => {
  it('revokes an active certificate when current eligibility becomes blocking', async () => {
    const updateMany = vi.fn().mockResolvedValue({ count: 1 });
    const client = {
      milkEligibilityCertificate: {
        findMany: vi
          .fn()
          .mockResolvedValue([
            { id: 'certificate-1', farmId: 'farm-1', certificateNumber: 'MEC-1' },
          ]),
        updateMany,
      },
      farmMember: { findMany: vi.fn().mockResolvedValue([]) },
      alert: { createMany: vi.fn() },
      auditLog: { create: vi.fn().mockResolvedValue({}) },
    };
    await revokeActiveCertificates(client, {
      animalId: 'animal-1',
      status: 'TREATMENT_ACTIVE',
      checkId: 'check-1',
      reasonCode: 'NEW_TREATMENT',
    });
    expect(updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: 'REVOKED', revocationCode: 'NEW_TREATMENT' }),
      }),
    );
  });

  it('does not revoke historical proof when eligibility remains eligible', async () => {
    const client = { milkEligibilityCertificate: { findMany: vi.fn() } };
    expect(
      await revokeActiveCertificates(client, {
        animalId: 'animal-1',
        status: 'ELIGIBLE_FOR_MILK',
        checkId: 'check-1',
      }),
    ).toEqual([]);
    expect(client.milkEligibilityCertificate.findMany).not.toHaveBeenCalled();
  });
});
