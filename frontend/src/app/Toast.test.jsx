import '@testing-library/jest-dom/vitest';
import { render, screen, act, cleanup } from '@testing-library/react';
import { describe, expect, it, afterEach } from 'vitest';
import { toast } from './toast.js';
import { ToastContainer } from './Toast.jsx';

describe('Toast notification system', () => {
  afterEach(() => {
    cleanup();
  });

  it('renders a success toast notification when triggered', () => {
    render(<ToastContainer />);
    act(() => {
      toast.success('Submitted successfully!');
    });
    expect(screen.getByText('Submitted successfully!')).toBeInTheDocument();
    expect(screen.getByText('Success')).toBeInTheDocument();
  });

  it('renders error, warning and info toasts appropriately', () => {
    render(<ToastContainer />);
    act(() => {
      toast.error('Unique error message');
      toast.warning('Check input');
      toast.info('Info note');
    });
    expect(screen.getByText('Unique error message')).toBeInTheDocument();
    expect(screen.getByText('Check input')).toBeInTheDocument();
    expect(screen.getByText('Info note')).toBeInTheDocument();
  });
});
