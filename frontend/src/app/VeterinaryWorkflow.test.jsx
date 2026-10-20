import '@testing-library/jest-dom/vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { AdministrationForm } from './VeterinaryWorkflow.jsx';
import { canCompleteTreatment, treatmentRequestIdFromResponse } from './workflowContracts.js';

afterEach(cleanup);

describe('treatment request response contract', () => {
  it('reads the request id returned by the backend for attachment linkage', () => {
    expect(treatmentRequestIdFromResponse({ request: { id: 'request-123' } })).toBe('request-123');
  });

  it('does not invent an id when the response is missing', () => {
    expect(treatmentRequestIdFromResponse(undefined)).toBeNull();
    expect(treatmentRequestIdFromResponse({})).toBeNull();
  });
});

describe('treatment completion UI policy', () => {
  it('blocks completion at zero administrations and permits it after evidence exists', () => {
    expect(canCompleteTreatment({ status: 'ACTIVE', administrations: [] })).toBe(false);
    expect(canCompleteTreatment({ status: 'ACTIVE', administrations: [{ id: 'a1' }] })).toBe(true);
    expect(canCompleteTreatment({ status: 'CANCELLED', administrations: [{ id: 'a1' }] })).toBe(
      false,
    );
  });
});

describe('administration form', () => {
  const product = {
    id: 'product-1',
    productName: 'Approved Test Product',
    formulation: 'Injection',
  };
  const prescriptionItem = {
    id: 'item-1',
    drugId: 'drug-1',
    drugProductId: 'product-1',
    doseValue: '5',
    doseUnit: 'ml',
    route: 'INTRAMUSCULAR',
    frequency: 'ONCE_DAILY',
    drugProduct: product,
    drug: { canonicalName: 'Referenced Medicine', products: [product] },
  };
  const props = {
    treatment: {
      id: 'treatment-1',
      prescriptionId: 'prescription-1',
      status: 'ACTIVE',
      administrations: [],
    },
    caseItem: {
      animal: { name: 'Gauri', tagNumber: 'COW-1' },
      prescriptions: [{ id: 'prescription-1', items: [prescriptionItem] }],
    },
  };

  it('shows prescribed values, approved product, and auto-filled actual values', () => {
    render(<AdministrationForm {...props} onAdminister={vi.fn()} />);
    expect(screen.getByText('Prescription:').parentElement).toHaveTextContent(
      'Referenced Medicine · Approved Test Product · 5 ml · INTRAMUSCULAR',
    );
    expect(screen.getByLabelText('Amount Given')).toHaveValue(5);
    expect(screen.getByLabelText('Dose Unit')).toHaveValue('ml');
    expect(screen.getByLabelText('Administration Route')).toHaveValue('INTRAMUSCULAR');
    expect(screen.getByLabelText('Actual Product')).toHaveValue('product-1');
  });

  it('requires a deviation reason and submits actual traceability fields once', async () => {
    const onAdminister = vi.fn().mockResolvedValue(undefined);
    render(<AdministrationForm {...props} onAdminister={onAdminister} />);
    fireEvent.change(screen.getByLabelText('Administration Route'), { target: { value: 'ORAL' } });
    expect(screen.getByText(/Deviation from prescription/)).toBeInTheDocument();
    fireEvent.change(screen.getByPlaceholderText(/Explain why/), {
      target: { value: 'Actual route recorded by operator' },
    });
    fireEvent.click(screen.getByRole('button', { name: /Record Administration #1/ }));
    await waitFor(() => expect(onAdminister).toHaveBeenCalledTimes(1));
    expect(onAdminister.mock.calls[0][0]).toMatchObject({
      prescriptionItemId: 'item-1',
      drugProductId: 'product-1',
      amount: 5,
      amountUnit: 'ml',
      route: 'ORAL',
      deviationReason: 'Actual route recorded by operator',
      performedByName: null,
    });
  });
});
