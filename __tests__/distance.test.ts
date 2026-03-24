import { haversineKm } from '../utils/distance';

describe('haversineKm', () => {
  it('returns ~0 for same point', () => {
    expect(haversineKm(-33.45, -70.65, -33.45, -70.65)).toBeCloseTo(0, 5);
  });

  it('returns plausible distance between two points in Chile (km)', () => {
    const km = haversineKm(-33.4489, -70.6693, -33.4372, -70.6506);
    expect(km).toBeGreaterThan(1);
    expect(km).toBeLessThan(50);
  });
});
