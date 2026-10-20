import '@testing-library/jest-dom/vitest';
import { render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { FarmerChatbot, FarmerChatbotModal } from './FarmerChatbot.jsx';

afterEach(() => {
  vi.unstubAllGlobals();
  localStorage.clear();
});

describe('FarmerChatbot', () => {
  it('renders Kisan Mitra chatbot with default greeting and quick questions', () => {
    window.HTMLElement.prototype.scrollIntoView = vi.fn();
    render(<FarmerChatbot />);
    expect(screen.getAllByText(/Kisan Mitra/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/Quick Questions/i)).toBeInTheDocument();
    expect(
      screen.getByPlaceholderText(/Ask about crops, soil or cattle home remedies/i),
    ).toBeInTheDocument();
  });

  it('personalizes greeting, header, and sidebar for a specific farmer', () => {
    window.HTMLElement.prototype.scrollIntoView = vi.fn();
    const farmerUser = { id: 'farmer-101', fullName: 'Ramesh Patel' };
    const farmerFarm = { id: 'farm-202', name: 'Patel Dairy & Agro' };

    render(<FarmerChatbot user={farmerUser} farm={farmerFarm} />);

    // Farmer's name appears in personalized welcome greeting
    expect(screen.getByText(/Ram Ram & Namaste Ramesh Patel!/i)).toBeInTheDocument();
    // Farmer's farm appears in personalized greeting & sidebar
    expect(screen.getAllByText(/Patel Dairy & Agro/i).length).toBeGreaterThan(0);
    // Header displays personal assistant designation
    expect(screen.getByText(/Personal AI Assistant for/i)).toBeInTheDocument();
    // User ID-isolated key in localStorage
    expect(localStorage.getItem('kisanMitraChats_farmer-101')).toBeTruthy();
  });

  it('strictly isolates chat storage between different farmers', () => {
    window.HTMLElement.prototype.scrollIntoView = vi.fn();

    // Pre-populate Farmer 1's chat
    const farmer1Id = 'farmer-1';
    const farmer1Chat = [
      {
        id: 'chat-f1',
        title: 'Wheat Blight Query',
        messages: [{ role: 'user', content: 'Wheat crop yellow leaves', time: '10:00' }],
      },
    ];
    localStorage.setItem(`kisanMitraChats_${farmer1Id}`, JSON.stringify(farmer1Chat));

    // Render for Farmer 2 (different user)
    const farmer2User = { id: 'farmer-2', fullName: 'Suresh Kumar' };
    const { unmount } = render(<FarmerChatbot user={farmer2User} />);

    // Farmer 2 should NOT see Farmer 1's chat title
    expect(screen.queryByText('Wheat Blight Query')).not.toBeInTheDocument();
    // Farmer 2 should have their own personal storage key
    expect(localStorage.getItem('kisanMitraChats_farmer-2')).toBeTruthy();
    expect(localStorage.getItem('kisanMitraChats_farmer-2')).not.toContain('Wheat Blight Query');

    unmount();

    // Now render for Farmer 1
    render(<FarmerChatbot user={{ id: farmer1Id, fullName: 'Farmer One' }} />);
    // Farmer 1 SHOULD see their own chat (in sidebar & topbar)
    expect(screen.getAllByText('Wheat Blight Query').length).toBeGreaterThan(0);
  });

  it('renders FarmerChatbotModal with personalized title, close and expand actions', () => {
    window.HTMLElement.prototype.scrollIntoView = vi.fn();
    const onClose = vi.fn();
    const onOpenFullPage = vi.fn();
    const user = { id: 'farmer-303', fullName: 'Laxman Rao' };

    render(<FarmerChatbotModal user={user} onClose={onClose} onOpenFullPage={onOpenFullPage} />);

    expect(screen.getByText(/Laxman Rao's Personal AI/i)).toBeInTheDocument();
    expect(screen.getByText(/Expand to Full Page/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Close/i)).toBeInTheDocument();
  });
});
