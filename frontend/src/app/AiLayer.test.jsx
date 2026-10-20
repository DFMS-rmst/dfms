import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { AmuRiskCard } from './AiLayer.jsx';

vi.mock('./api.js', () => ({
  api: vi.fn().mockResolvedValue({ animals: [] }),
}));

afterEach(cleanup);

describe('AMU Risk UI', () => {
  it('labels ML output as synthetic pattern support rather than milk safety', async () => {
    const { api } = await import('./api.js');
    api.mockResolvedValueOnce({
      risk: {
        category: 'LOW',
        displayRiskScore: 12,
        modelVersion: 'SIH-AMU-IFOREST-1.1',
        disclaimer: 'Decision support only.',
        contributingIndicators: [],
      },
    });
    render(<AmuRiskCard animalId="animal-1" />);
    fireEvent.click(screen.getByRole('button', { name: /evaluate recorded amu pattern/i }));
    await waitFor(() => expect(screen.getByText(/SIH-AMU-IFOREST-1.1/)).toBeTruthy());
    expect(screen.getByText(/SYNTHETIC DEMONSTRATION DATA/)).toBeTruthy();
    expect(screen.getByText(/not a clinical diagnosis or milk-safety determination/i)).toBeTruthy();
  });
});
