import { averagePrice, computeScore } from '../utils/score';

describe('computeScore', () => {
  it('combines price and distance with factor', () => {
    expect(computeScore(1000, 2, 10)).toBe(1020);
  });
});

describe('averagePrice', () => {
  it('returns average of prices', () => {
    expect(averagePrice([{ pricePerLiter: 1000 }, { pricePerLiter: 1200 }])).toBe(1100);
  });

  it('returns 0 for empty list', () => {
    expect(averagePrice([])).toBe(0);
  });
});
