import '@testing-library/jest-dom/vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { CoreEngine, EligibilityCard } from './CoreEngine.jsx';

const apiMock = vi.hoisted(() => vi.fn());
vi.mock('./api.js', () => ({ api: apiMock }));

afterEach(() => {
  cleanup();
  apiMock.mockReset();
});

const check = (status, overrides = {}) => ({
  id: `check-${status}`,
  status,
  evaluatedAt: '2026-09-23T10:00:00.000Z',
  eligibilityDate: null,
  explanation: { blockers: [] },
  animal: {
    id: 'animal-1',
    tagNumber: 'COW-102',
    species: { canonicalName: 'Cattle' },
    farm: { name: 'Demo Farm' },
  },
  treatmentEvaluations: [],
  ...overrides,
});

describe('farmer milk eligibility explanation', () => {
  it.each([
    ['TREATMENT_ACTIVE', 'Not currently eligible'],
    ['UNDER_WITHDRAWAL', 'Under withdrawal'],
    ['ELIGIBLE_FOR_MILK', 'Rule-based milk eligibility: Eligible'],
    ['RULE_NOT_FOUND', 'Rule not found'],
    ['REVIEW_REQUIRED', 'Review required'],
  ])('renders %s without a blank screen', (status, title) => {
    render(<EligibilityCard check={check(status)} />);
    expect(screen.getByText(title)).toBeInTheDocument();
    expect(screen.getByText(/not a laboratory residue test/i)).toBeInTheDocument();
  });

  it('explains missing product/rule and shows withdrawal end and provenance', () => {
    render(
      <EligibilityCard
        check={check('UNDER_WITHDRAWAL', {
          eligibilityDate: '2026-09-25T10:00:00.000Z',
          treatmentEvaluations: [
            {
              id: 'e1',
              status: 'UNDER_WITHDRAWAL',
              route: 'INTRAMUSCULAR',
              lastAdministrationAt: '2026-09-22T10:00:00.000Z',
              treatmentCompletedAt: '2026-09-23T10:00:00.000Z',
              withdrawalEndsAt: '2026-09-25T10:00:00.000Z',
              drug: { canonicalName: 'Referenced Medicine' },
              drugProduct: null,
              withdrawalRule: {
                durationValue: '48',
                durationUnit: 'HOUR',
                jurisdiction: 'INDIA',
                verificationStatus: 'VERIFIED',
                source: { organization: 'Authority', title: 'Reviewed label' },
              },
            },
          ],
        })}
      />,
    );
    expect(screen.getByText(/Product not identified/)).toBeInTheDocument();
    expect(screen.getByText(/Withdrawal until/)).toBeInTheDocument();
    expect(screen.getByText(/Authority — Reviewed label/)).toBeInTheDocument();
  });

  it('renders non-lactating applicability without certificate action', () => {
    render(
      <EligibilityCard
        check={check('REVIEW_REQUIRED', {
          explanation: {
            question:
              'Milk eligibility is not applicable because this animal is not recorded as lactating.',
            blockers: ['ANIMAL_NOT_LACTATING'],
          },
        })}
        canIssue
        onIssue={() => {}}
      />,
    );
    expect(screen.getByText('Milk eligibility not applicable')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Generate Certificate' })).not.toBeInTheDocument();
  });

  it('renders loading and API error states without blanking the page', async () => {
    apiMock.mockImplementation(() => new Promise(() => {}));
    const { unmount } = render(
      <CoreEngine farms={[{ id: 'farm-1', name: 'Farm' }]} isAdmin={false} />,
    );
    expect(screen.getByText(/Loading current AMU and milk eligibility/)).toBeInTheDocument();
    unmount();
    apiMock.mockRejectedValue(new Error('Eligibility service unavailable'));
    render(<CoreEngine farms={[{ id: 'farm-1', name: 'Farm' }]} isAdmin={false} />);
    expect(await screen.findByText('Eligibility service unavailable')).toBeInTheDocument();
  });
});
