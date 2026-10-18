import '@testing-library/jest-dom/vitest';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { PublicAnimalVerification } from './PublicAnimalVerification.jsx';
import { publicApi } from './api.js';

vi.mock('./api.js', () => ({
  publicApi: vi.fn(),
}));

describe('PublicAnimalVerification Component', () => {
  it('renders eligible status, animal identity, and safeguards without private medical records', async () => {
    publicApi.mockResolvedValueOnce({
      verificationId: 'anm_test_123',
      animalTag: 'UK-04-COW-101',
      animalName: 'Gauri',
      species: 'Cattle (Bos taurus)',
      breed: 'Gir',
      farmName: 'Green Valley Dairy',
      status: 'ELIGIBLE_FOR_MILK',
      lactating: true,
      evaluatedAt: '2026-10-18T10:00:00.000Z',
      eligibleFrom: '2026-10-18T08:00:00.000Z',
      withdrawalEndsAt: null,
      blockers: [],
      ruleExplanation: null,
      disclaimer: 'Public animal verification reflects live deterministic eligibility.',
    });

    render(<PublicAnimalVerification verificationId="anm_test_123" />);

    expect(await screen.findByText('UK-04-COW-101')).toBeInTheDocument();
    expect(screen.getByText('ELIGIBLE FOR MILK COLLECTION')).toBeInTheDocument();
    expect(screen.getByText('Gauri')).toBeInTheDocument();
    expect(screen.getByText('Green Valley Dairy')).toBeInTheDocument();
    // Verify privacy & scope: slaughter eligibility is explicitly not certified, and no clinical transcripts
    expect(screen.getByText(/does not certify slaughter eligibility/i)).toBeInTheDocument();
    expect(screen.queryByText(/slaughter cleared|slaughter eligible|slaughter approved/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/clinical diagnosis|doctor prescription|chat transcript/i)).not.toBeInTheDocument();
  });

  it('renders fail-closed blocked status when statutory withdrawal rule is missing', async () => {
    publicApi.mockResolvedValueOnce({
      verificationId: 'anm_missing_rule',
      animalTag: 'COW-RULE-MISSING',
      animalName: 'Radha',
      species: 'Cattle',
      farmName: 'Test Farm',
      status: 'RULE_NOT_FOUND',
      lactating: true,
      evaluatedAt: '2026-10-18T10:00:00.000Z',
      eligibleFrom: null,
      withdrawalEndsAt: null,
      blockers: ['WITHDRAWAL_RULE_MISSING'],
      ruleExplanation:
        'Statutory milk withdrawal reference rule is missing for an administered veterinary substance.',
      disclaimer: 'Public animal verification reflects live deterministic eligibility.',
    });

    render(<PublicAnimalVerification verificationId="anm_missing_rule" />);

    expect(await screen.findByText('COW-RULE-MISSING')).toBeInTheDocument();
    expect(screen.getByText(/RULE MISSING — MILK BLOCKED \(FAIL-CLOSED\)/i)).toBeInTheDocument();
    expect(screen.getByText(/Statutory milk withdrawal reference rule is missing/i)).toBeInTheDocument();
  });

  it('displays user-friendly error when animal verification ID is not found', async () => {
    publicApi.mockRejectedValueOnce(new Error('Animal record not found for this verification ID.'));

    render(<PublicAnimalVerification verificationId="invalid-id" />);

    expect(await screen.findByText(/Verification Error/i)).toBeInTheDocument();
    expect(screen.getByText(/Animal record not found for this verification ID/i)).toBeInTheDocument();
  });
});
