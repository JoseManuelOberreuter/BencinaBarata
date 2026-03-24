import type { RankedStation, Station } from '../types/station';
import { haversineKm } from './distance';
import { averagePrice, computeScore } from './score';

export function rankStationsNearUser(
  stations: Station[],
  userLat: number,
  userLon: number,
  factor: number,
  maxRadiusKm: number,
): { ranked: RankedStation[]; avgInRadius: number } {
  const withDistance = stations
    .map((s) => ({
      station: s,
      distanceKm: haversineKm(userLat, userLon, s.latitude, s.longitude),
    }))
    .filter((x) => x.distanceKm <= maxRadiusKm);

  const avg = averagePrice(withDistance.map((x) => x.station));
  const ranked: RankedStation[] = withDistance
    .map(({ station, distanceKm }) => {
      const score = computeScore(station.pricePerLiter, distanceKm, factor);
      const savingVsAveragePerLiter = avg > 0 ? avg - station.pricePerLiter : 0;
      return {
        ...station,
        distanceKm,
        score,
        savingVsAveragePerLiter,
      };
    })
    .sort((a, b) => a.score - b.score);

  return { ranked, avgInRadius: avg };
}
