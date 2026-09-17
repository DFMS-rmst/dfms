import '@testing-library/jest-dom/vitest';
import { render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { App } from './App.jsx';
afterEach(() => vi.unstubAllGlobals());
describe('App', () => {
  it('renders the project safety boundary', () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() => new Promise(() => {})),
    );
    render(<App />);
    expect(screen.getByText('Welcome back')).toBeInTheDocument();
  });
});
