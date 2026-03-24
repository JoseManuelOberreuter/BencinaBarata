import type { Station } from '../types/station';
import { haversineKm } from './distance';

export function computeScore(
  pricePerLiter: number,
  distanceKm: number,
  distanceWeight: number,
): number {
  return pricePerLiter + distanceKm * distanceWeight;
}

export function averagePrice(stations: Pick<Station, 'pricePerLiter'>[]): number {
  if (stations.length === 0) return 0;
  const sum = stations.reduce((acc, s) => acc + s.pricePerLiter, 0);
  return sum / stations.length;
}
