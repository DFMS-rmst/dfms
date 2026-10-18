import '@testing-library/jest-dom/vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { DailyClearance, PublicDailyClearance } from './DailyClearance.jsx';
import * as apiModule from './api.js';

vi.mock('./api.js', () => ({ api: vi.fn(), download: vi.fn(), publicApi: vi.fn() }));

const evaluation = {
  id: 'evaluation-1',
  businessDate: '2026-09-23T00:00:00.000Z',
  timeZone: 'Asia/Kolkata',
  applicableCount: 2,
  eligibleCount: 1,
  blockedCount: 1,
  version: 1,
  status: 'CURRENT',
  items: [
    {
      id: 'a',
      included: true,
      animalTagSnapshot: 'COW-1',
      animalNameSnapshot: 'Asha',
      eligibilityStatus: 'ELIGIBLE_FOR_MILK',
    },
    {
      id: 'b',
      included: false,
      animalTagSnapshot: 'COW-2',
      eligibilityStatus: 'UNDER_WITHDRAWAL',
      withdrawalEndsAt: '2026-09-25T05:00:00Z',
    },
  ],
  clearance: {
    clearanceNumber: 'DMC-20260923-ABC-V1',
    disclaimer: 'Not a laboratory residue test.',
  },
};

describe('daily milk collection UI', () => {
  beforeEach(() => {
    apiModule.api.mockImplementation((path) => {
      if (path.startsWith('/daily-clearances/today')) return Promise.resolve({ evaluation });
      if (path.startsWith('/daily-clearances?'))
        return Promise.resolve({ evaluations: [evaluation] });
      if (path === '/alerts')
        return Promise.resolve({
          alerts: [
            {
              id: 'x',
              farmId: 'farm-1',
              title: 'Today’s milk eligibility is ready',
              message: '1 of 2 eligible',
              status: 'UNREAD',
              createdAt: '2026-09-23T05:00:00Z',
            },
          ],
        });
      if (path === '/daily-clearances/run-today') return Promise.resolve({ evaluation });
      if (path === '/daily-clearances/evaluation-1/blockchain/verify')
        return Promise.resolve({ verification: { status: 'NOT_ANCHORED', anchor: null } });
      if (path === '/daily-clearances/evaluation-1/blockchain/anchor')
        return Promise.resolve({ anchor: { status: 'ANCHORED' } });
      return Promise.reject(new Error('Unexpected request'));
    });
  });

  it('renders system-derived eligible and blocked lists with no selection checkboxes', async () => {
    render(<DailyClearance farm={{ id: 'farm-1', name: 'Farm' }} canRun />);
    expect(await screen.findByText('COW-1')).toBeInTheDocument();
    expect(screen.getByText('COW-2')).toBeInTheDocument();
    expect(screen.getByText(/withdrawal period continues/i)).toBeInTheDocument();
    expect(screen.queryByRole('checkbox')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /run today/i }));
    await waitFor(() =>
      expect(apiModule.api).toHaveBeenCalledWith('/daily-clearances/run-today', expect.any(Object)),
    );
    expect(screen.getByText(/does not determine milk eligibility/i)).toBeInTheDocument();
    expect(screen.getByText(/Tamper Verification:/i)).toBeInTheDocument();
  });

  it('renders a zero-eligible result without a positive clearance', async () => {
    apiModule.api.mockImplementation((path) =>
      path === '/alerts'
        ? Promise.resolve({ alerts: [] })
        : path.startsWith('/daily-clearances?')
          ? Promise.resolve({ evaluations: [] })
          : Promise.resolve({
              evaluation: {
                ...evaluation,
                eligibleCount: 0,
                blockedCount: 2,
                items: evaluation.items.map((x) => ({
                  ...x,
                  included: false,
                  eligibilityStatus: 'REVIEW_REQUIRED',
                })),
                clearance: null,
              },
            }),
    );
    render(<DailyClearance farm={{ id: 'farm-1' }} />);
    expect(await screen.findByText(/no animals are currently eligible/i)).toBeInTheDocument();
    expect(screen.getByText(/no positive clearance document/i)).toBeInTheDocument();
  });

  it('keeps the public projection privacy limited', async () => {
    apiModule.publicApi.mockResolvedValue({
      clearanceNumber: 'DMC-1',
      farmName: 'Farm',
      businessDate: '2026-09-23',
      version: 1,
      status: 'CURRENT',
      eligibleAnimalCount: 1,
      documentIntegrity: 'VERIFIED',
      blockchainIntegrity: 'NOT_ANCHORED',
      disclaimer: 'Not a laboratory test.',
    });
    render(<PublicDailyClearance verificationId="opaque" />);
    expect(await screen.findByText('DMC-1')).toBeInTheDocument();
    expect(screen.queryByText(/diagnosis|prescription/i)).not.toBeInTheDocument();
  });
});
