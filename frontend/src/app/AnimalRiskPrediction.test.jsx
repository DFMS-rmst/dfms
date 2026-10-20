import { describe, expect, it } from 'vitest';
import { validateAnimalRiskForm } from './AnimalRiskPrediction.jsx';

describe('AnimalRiskPrediction Validation', () => {
  it('validates species biological limits and logical treatment rules', () => {
    // Valid Cow data
    const validData = {
      species: 'Cow',
      age_years: 5,
      weight_kg: 450,
      treatments_last_30d: 1,
      treatments_last_90d: 2,
      days_since_last_treatment: 10,
      unique_antimicrobial_classes_90d: 1,
      max_repeated_class_count_90d: 1,
      mean_treatment_interval_days: 20,
      total_antimicrobial_days_90d: 5,
      recurrent_condition_events_90d: 0,
      no_response_events_90d: 0,
      partial_response_events_90d: 0,
    };
    expect(validateAnimalRiskForm(validData)).toEqual([]);

    // Age exceeding lifespan
    const excessiveAge = { ...validData, age_years: 30 };
    expect(validateAnimalRiskForm(excessiveAge).some((msg) => msg.includes('lifespan'))).toBe(true);

    // 30d treatments exceeding 90d treatments
    const invalidTreatments = { ...validData, treatments_last_30d: 5, treatments_last_90d: 2 };
    expect(
      validateAnimalRiskForm(invalidTreatments).some((msg) =>
        msg.includes('cannot exceed treatments in 90d'),
      ),
    ).toBe(true);

    // Days since last treatment conflict with 30d treatment count
    const recencyConflict = { ...validData, treatments_last_30d: 2, days_since_last_treatment: 45 };
    expect(
      validateAnimalRiskForm(recencyConflict).some((msg) => msg.includes('must be ≤ 30')),
    ).toBe(true);
  });
});
