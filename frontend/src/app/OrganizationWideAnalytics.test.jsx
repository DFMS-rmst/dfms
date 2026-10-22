import '@testing-library/jest-dom/vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { OrganizationWideAnalytics } from './OrganizationWideAnalytics.jsx';

// Mock recharts to avoid jsdom SVG measurement errors
vi.mock('recharts', async () => {
  const actual = await vi.importActual('recharts');
  return {
    ...actual,
    ResponsiveContainer: ({ children }) => <div className="recharts-responsive-container-mock">{children}</div>,
  };
});

// Mock api
vi.mock('./api.js', () => ({
  api: vi.fn(async (path) => {
    if (path === '/admin/dashboard-stats') {
      return {
        pendingVerifications: {
          total: 5,
          farmerProfiles: 2,
          veterinarianProfiles: 1,
          dairyOwnerProfiles: 1,
          farms: 1,
        },
        mrlStatus: [
          { status: 'ELIGIBLE_FOR_MILK', count: 12, name: 'ELIGIBLE FOR MILK' },
          { status: 'UNDER_WITHDRAWAL', count: 3, name: 'UNDER WITHDRAWAL' },
          { status: 'TREATMENT_ACTIVE', count: 1, name: 'TREATMENT ACTIVE' },
        ],
        amuAndDiseaseTrends: {
          antibioticClasses: [
            { antimicrobialClass: 'Cephalosporins', count: 8, name: 'Cephalosporins' },
            { antimicrobialClass: 'Penicillins', count: 4, name: 'Penicillins' },
          ],
          topDiseases: [
            { canonicalName: 'Bovine Mastitis', count: 6, name: 'Bovine Mastitis' },
            { canonicalName: 'Metritis', count: 3, name: 'Metritis' },
          ],
        },
        dairyEconomy: {
          totalCost: 154200,
          totalQuantityLiters: 3855,
          dailyProcurement: [
            { collectionDate: '2026-03-20', quantityLiters: 1200 },
            { collectionDate: '2026-03-21', quantityLiters: 1350 },
            { collectionDate: '2026-03-22', quantityLiters: 1305 },
          ],
        },
        mlRiskDistribution: [
          { predictedRisk: 'LOW', count: 14, name: 'LOW' },
          { predictedRisk: 'MEDIUM', count: 4, name: 'MEDIUM' },
          { predictedRisk: 'HIGH', count: 2, name: 'HIGH' },
        ],
      };
    }
    return {};
  }),
}));

describe('OrganizationWideAnalytics component', () => {
  it('renders section title, large KPI cards, and chart headings', async () => {
    render(<OrganizationWideAnalytics />);

    // Section title and KPI cards after load
    await waitFor(() => {
      expect(screen.getByText(/Organization wide Analytics/i)).toBeInTheDocument();
      expect(screen.getByText('Pending Verifications')).toBeInTheDocument();
      expect(screen.getByText('5')).toBeInTheDocument();
      expect(screen.getByText('Total Milk Procurement Value')).toBeInTheDocument();
      expect(screen.getByText('₹1,54,200')).toBeInTheDocument();
    });

    // Chart titles
    expect(screen.getByText(/MRL Food Safety Status/i)).toBeInTheDocument();
    expect(screen.getByText(/Antibiotic Usage by Class/i)).toBeInTheDocument();
    expect(screen.getByText(/Top 5 Diagnosed Diseases/i)).toBeInTheDocument();
    expect(screen.getByText(/Daily Safe Milk Procurement/i)).toBeInTheDocument();
    expect(screen.getByText(/Platform-Wide Animal Risk Distribution/i)).toBeInTheDocument();
  });
});
