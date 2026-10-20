import { describe, expect, it } from 'vitest';
import { normalizeSpecies } from './risk-service.js';

describe('Animal Risk Service', () => {
  it('normalizes various species names correctly to model supported species', () => {
    expect(normalizeSpecies('Cow')).toBe('Cow');
    expect(normalizeSpecies('Cattle')).toBe('Cow');
    expect(normalizeSpecies('Indigenous Cattle')).toBe('Cow');
    expect(normalizeSpecies('Buffalo')).toBe('Buffalo');
    expect(normalizeSpecies('Murrah Buffalo')).toBe('Buffalo');
    expect(normalizeSpecies('Goat')).toBe('Goat');
    expect(normalizeSpecies('Sheep')).toBe('Sheep');
    expect(normalizeSpecies('Chicken')).toBe('Chicken');
    expect(normalizeSpecies('Poultry')).toBe('Chicken');
    expect(normalizeSpecies(null)).toBe('Cow');
    expect(normalizeSpecies('Unknown')).toBe('Cow');
  });
});
