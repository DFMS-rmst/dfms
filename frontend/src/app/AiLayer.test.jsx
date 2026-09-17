import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { AiLayer } from './AiLayer.jsx';

vi.mock('./api.js', () => ({
  api: vi.fn().mockResolvedValue({ animals: [] }),
}));

describe('AI intelligence UI', () => {
  it('shows risk and clinical safety boundaries without fake results', () => {
    render(
      <AiLayer farms={[{ id: 'farm-1', name: 'Authorized Farm' }]} user={{ platformRoles: [] }} />,
    );
    expect(screen.getByText('AMU Pattern Risk')).toBeTruthy();
    expect(screen.getByText(/AI cannot diagnose, prescribe/)).toBeTruthy();
    expect(screen.queryByText(/misuse confirmed/i)).toBeNull();
  });
});



