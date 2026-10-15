import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { AiLayer, AmuRiskCard } from './AiLayer.jsx';

vi.mock('./api.js', () => ({
  api: vi.fn().mockResolvedValue({ animals: [] }),
}));

afterEach(cleanup);

describe('AI intelligence UI', () => {
  it('shows risk and clinical safety boundaries without fake results', () => {
    render(
      <AiLayer farms={[{ id: 'farm-1', name: 'Authorized Farm' }]} user={{ platformRoles: [] }} />,
    );
    expect(screen.getByText('AMU Pattern Risk')).toBeTruthy();
    expect(screen.getByText(/AI cannot diagnose, prescribe/)).toBeTruthy();
    expect(screen.queryByText(/misuse confirmed/i)).toBeNull();
  });

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
