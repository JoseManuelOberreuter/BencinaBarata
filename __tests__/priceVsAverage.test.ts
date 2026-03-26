import { colorForVsAverage } from '../utils/priceVsAverage';

describe('colorForVsAverage', () => {
  it('returns green when cheaper than average', () => {
    expect(colorForVsAverage(50)).toBe('#15803d');
  });

  it('returns red when more expensive than average', () => {
    expect(colorForVsAverage(-30)).toBe('#b91c1c');
  });

  it('returns neutral gray when equal to average', () => {
    expect(colorForVsAverage(0)).toBe('#555');
  });
});
