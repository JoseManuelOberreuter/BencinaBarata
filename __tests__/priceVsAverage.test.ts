import { colorForVsAverage } from '../utils/priceVsAverage';

describe('colorForVsAverage', () => {
  it('returns green when cheaper than average', () => {
    expect(colorForVsAverage(50)).toBe('#22C55E');
  });

  it('returns red when more expensive than average', () => {
    expect(colorForVsAverage(-30)).toBe('#EF4444');
  });

  it('returns neutral gray when equal to average', () => {
    expect(colorForVsAverage(0)).toBe('#64748B');
  });
});
