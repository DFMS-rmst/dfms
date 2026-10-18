import { AppError } from '../../common/errors.js';

const normalized = (value) => (value == null || value === '' ? null : String(value));

export function administrationDeviates(item, input) {
  return (
    Number(item.doseValue) !== Number(input.amount) ||
    normalized(item.doseUnit) !== normalized(input.amountUnit) ||
    normalized(item.route) !== normalized(input.route) ||
    normalized(item.drugProductId) !== normalized(input.drugProductId)
  );
}

export function validateAdministrationEvidence(item, input, now = new Date()) {
  if (!item)
    throw new AppError(
      400,
      'PRESCRIPTION_ITEM_MISMATCH',
      'Prescription item does not belong to this treatment',
    );
  if (input.drugId && input.drugId !== item.drugId)
    throw new AppError(
      400,
      'PRESCRIPTION_ITEM_MISMATCH',
      'Drug does not match the selected prescription item',
    );
  if (input.administeredAt.getTime() > now.getTime() + 5 * 60 * 1000)
    throw new AppError(
      400,
      'FUTURE_ADMINISTRATION_TIME',
      'Administration time cannot be in the future',
    );
  const deviates = administrationDeviates(item, input);
  if (deviates && !input.deviationReason?.trim())
    throw new AppError(
      400,
      'DEVIATION_REASON_REQUIRED',
      'A reason is required when actual administration differs from the prescription',
    );
  return { deviates };
}
