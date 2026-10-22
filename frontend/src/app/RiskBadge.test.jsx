import '@testing-library/jest-dom/vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { RiskBadge } from './RiskBadge.jsx';

describe('RiskBadge Component', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('renders loading state initially and then displays 🟢 Low badge', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          data: {
            riskLevel: 'LOW',
            risk: 'Low',
            badgeText: '🟢 Low',
          },
        }),
      }),
    );

    render(<RiskBadge animalId="anm-cow-123" />);

    expect(screen.getByText(/Evaluating…/i)).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText('🟢 Low')).toBeInTheDocument();
    });
  });

  it('displays 🔴 High badge when risk is HIGH', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          data: {
            riskLevel: 'HIGH',
            risk: 'High',
            badgeText: '🔴 High',
          },
        }),
      }),
    );

    render(<RiskBadge animalId="anm-cow-456" />);

    await waitFor(() => {
      expect(screen.getByText('🔴 High')).toBeInTheDocument();
    });
  });

  it('displays 🟡 Medium badge when risk is MEDIUM', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          data: {
            riskLevel: 'MEDIUM',
            risk: 'Medium',
            badgeText: '🟡 Medium',
          },
        }),
      }),
    );

    render(<RiskBadge animalId="anm-cow-789" />);

    await waitFor(() => {
      expect(screen.getByText('🟡 Medium')).toBeInTheDocument();
    });
  });
});
