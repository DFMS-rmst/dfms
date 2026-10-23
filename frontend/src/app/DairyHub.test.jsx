import '@testing-library/jest-dom/vitest';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { DairyHub } from './DairyHub.jsx';

// Mock the API module
vi.mock('./api.js', () => ({
  api: vi.fn((path) => {
    if (path === '/dairy/areas')
      return Promise.resolve({ areas: ['Kolhapur Center', 'Karveer Route'] });
    if (path.startsWith('/dairy/analytics')) {
      return Promise.resolve({
        summary: {
          today: {
            salesCount: 4,
            salesLiters: 160,
            salesRevenue: 8960,
            intakeLiters: 280,
            intakeCost: 11760,
            netProfit: -2800,
          },
          month: {
            salesCount: 45,
            salesLiters: 2400,
            salesRevenue: 134400,
            intakeLiters: 3800,
            intakeCost: 159600,
            netProfit: -25200,
          },
          allTime: {
            amuComplianceRate: 98.4,
            activeSupplyingFarmersCount: 12,
            currentStockLiters: 2450,
            avgFat: 4.25,
            avgSnf: 8.65,
          },
        },
        dailyTrends: [
          {
            date: '2026-10-23',
            dayLabel: 'Friday',
            intakeLiters: 280,
            salesLiters: 160,
            intakeCost: 11760,
            salesRevenue: 8960,
            avgFat: 4.2,
            avgSnf: 8.6,
          },
        ],
        topFarmers: [
          {
            farmerIdNumber: 'FMR-101',
            farmerName: 'Ramesh Patil',
            villageArea: 'Sarnobatwadi',
            totalLiters: 450,
            avgFat: 4.3,
            avgSnf: 8.7,
            totalPayout: 18900,
          },
        ],
        areaContributions: [{ area: 'Sarnobatwadi Route 1', totalLiters: 1200, percentage: 65 }],
      });
    }
    if (path === '/dairy/enrollments') {
      return Promise.resolve({
        enrollments: [
          {
            id: 'dfe_1',
            farmerIdNumber: 'FMR-101',
            farmerName: 'Ramesh Patil',
            farmName: 'Patil Dairy',
            phone: '9822112233',
            villageArea: 'Sarnobatwadi',
            milkType: 'COW',
            expectedDailyQuantity: 25,
            agreedRatePerLiter: 42,
            baseFatPercentage: 4.2,
            baseSnfPercentage: 8.6,
            paymentMethod: 'BANK_TRANSFER',
            status: 'ACTIVE',
          },
          {
            id: 'dfe_2',
            farmerIdNumber: 'FMR-102',
            farmerName: 'Anil Deshmukh',
            farmName: 'Deshmukh Farm',
            phone: '9822998877',
            villageArea: 'Karveer',
            milkType: 'BUFFALO',
            expectedDailyQuantity: 30,
            agreedRatePerLiter: 54,
            status: 'PENDING_APPROVAL',
            joinRequestNotes: 'Looking to supply buffalo milk daily.',
          },
        ],
      });
    }
    if (path === '/dairy/farmers') return Promise.resolve({ farmers: [] });
    if (path === '/dairy/inventory/intakes') {
      return Promise.resolve({
        intakes: [
          {
            id: 'intake_1',
            farmerIdNumber: 'FMR-101',
            farmerName: 'Ramesh Patil',
            collectionDate: new Date().toISOString().split('T')[0],
            shift: 'MORNING',
            milkType: 'COW',
            quantityLiters: 25,
            ratePerLiter: 42,
            totalCost: 1050,
            paymentStatus: 'PENDING',
          },
        ],
      });
    }
    if (path === '/dairy/inventory/sales') {
      return Promise.resolve({
        sales: [
          {
            id: 'sale_1',
            invoiceNumber: 'INV-20261023-101',
            buyerName: 'Kolhapur Sweet Mart',
            buyerType: 'COMMERCIAL_SHOP',
            milkType: 'COW',
            quantityLiters: 50,
            pricePerLiter: 58,
            totalAmount: 2900,
            paymentStatus: 'PENDING',
            saleDate: new Date().toISOString().split('T')[0],
          },
        ],
      });
    }
    if (path === '/dairy/inventory/tanks') {
      return Promise.resolve({ tanks: [], summary: {} });
    }
    return Promise.resolve({});
  }),
}));

describe('Redesigned Dairy Operations Hub', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders all 5 strict sections and command center header', async () => {
    render(
      <DairyHub
        initialTab="all"
        user={{ id: 'usr_dairy_1', fullName: 'Dairy Owner' }}
        workspace={{ kind: 'DAIRY' }}
      />,
    );

    // Header Branding
    expect(screen.getByText('Dairy Operations Command Center')).toBeInTheDocument();

    // Section 1: Quick Operations (POS)
    expect(screen.getByRole('heading', { name: /1\. Quick Operations/i })).toBeInTheDocument();
    expect(screen.getByText(/Fast Milk Intake: Scan QR Pass/i)).toBeInTheDocument();
    expect(screen.getByText(/Fast Milk Intake: Manual Search/i)).toBeInTheDocument();

    // Section 2: Today's Overview (KPIs)
    expect(screen.getByRole('heading', { name: /2\. Today's Overview/i })).toBeInTheDocument();
    expect(screen.getByText(/Today's Total Intake/i)).toBeInTheDocument();
    expect(screen.getByText(/Today's Payout Liability/i)).toBeInTheDocument();
    expect(screen.getByText(/Today's Sales & Revenue/i)).toBeInTheDocument();
    expect(screen.getByText(/Average Quality \(Pooled Milk\)/i)).toBeInTheDocument();

    // Section 3: Farmer Network & Enrollments
    expect(
      screen.getByRole('heading', { name: /3\. Farmer Network & Enrollments/i }),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Pending Requests/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Active Directory/i })).toBeInTheDocument();

    // Section 4: Financials & Payouts
    expect(screen.getByRole('heading', { name: /4\. Financials & Payouts/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Pending Farmer Payouts/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Sales Receivables/i })).toBeInTheDocument();

    // Section 5: Analytics & Compliance (wait for async load)
    expect(
      await screen.findByRole('heading', { name: /5\. Analytics & Compliance/i }),
    ).toBeInTheDocument();
    expect(screen.getByText(/Safety & Eligibility Alerts/i)).toBeInTheDocument();
    expect(screen.getByText(/Milk Volume Trends/i)).toBeInTheDocument();
  });
});
