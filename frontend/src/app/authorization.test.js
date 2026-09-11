import { describe, expect, it } from 'vitest';
import {
  buildWorkspaces,
  farmCapabilities,
  navigationFor,
  normalizeOptionalFields,
} from './authorization.js';

const labels = (workspace) => navigationFor(workspace).map(([, label]) => label);

describe('authorization context helpers', () => {
  it('normalizes only selected blank optional fields', () => {
    expect(normalizeOptionalFields({ phone: ' ', email: '', name: 'A' }, ['phone'])).toEqual({
      email: '',
      name: 'A',
    });
  });

  it('builds all legitimate workspaces for a mixed-role user', () => {
    const workspaces = buildWorkspaces({
      platformRoles: ['VETERINARIAN'],
      veterinarian: { exists: true, status: 'VERIFIED' },
      farmMemberships: [
        { farmId: 'one', farmName: 'Owned Farm', roles: ['FARM_OWNER', 'FARM_MANAGER'] },
        { farmId: 'two', farmName: 'Worker Farm', roles: ['FARM_WORKER'] },
      ],
    });
    expect(workspaces.map((item) => item.id)).toEqual([
      'veterinarian',
      'farm:one',
      'farm:two',
      'account',
    ]);
  });

  it('provides role-aware admin, owner, worker, pending-vet and verified-vet navigation', () => {
    expect(labels({ kind: 'ADMIN' })).toContain('Vet Reviews');
    expect(labels({ kind: 'ADMIN' })).not.toContain('Veterinarian Onboarding');
    const owner = { kind: 'FARM', roles: ['FARM_OWNER', 'FARM_MANAGER'] };
    expect(labels(owner)).toEqual(
      expect.arrayContaining(['Farm Dashboard', 'Farm Members', 'Certificates']),
    );
    const worker = { kind: 'FARM', roles: ['FARM_WORKER'] };
    expect(labels(worker)).toEqual(['Farm & Animals', 'Veterinary Operations']);
    expect(farmCapabilities(worker.roles).canEditAnimals).toBe(false);
    expect(labels({ kind: 'VETERINARIAN', veterinarianStatus: 'PENDING' })).toEqual([
      'Verification Status',
    ]);
    expect(labels({ kind: 'VETERINARIAN', veterinarianStatus: 'VERIFIED' })).toContain(
      'Assigned Care',
    );
  });
});
