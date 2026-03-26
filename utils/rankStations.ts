import { MAX_SEARCH_RADIUS_KM, MIN_SEARCH_RADIUS_KM } from '../constants/defaults';
import type { FuelFilterId } from '../types/fuelFilter';
import type { Station, RankedStation } from '../types/station';
import { resolvePriceForFuelFilter } from './fuelFilter';
import { haversineKm } from './distance';
import { averagePrice } from './score';

function fuelPricesForStation(s: Station): Record<string, number> {
  if (s.fuelPrices && Object.keys(s.fuelPrices).length > 0) return s.fuelPrices;
  return s.pricePerLiter > 0 ? { precio: s.pricePerLiter } : {};
}

/**
 * Estaciones a hasta `searchRadiusKm` del usuario, con el combustible `fuelFilter`,
 * ordenadas de **menor a mayor precio** (más barata primero).
 */
export function rankStationsNearUser(
  stations: Station[],
  userLat: number,
  userLon: number,
  searchRadiusKm: number,
  fuelFilter: FuelFilterId,
): { ranked: RankedStation[]; avgInRadius: number } {
  const maxR = Math.min(
    MAX_SEARCH_RADIUS_KM,
    Math.max(MIN_SEARCH_RADIUS_KM, searchRadiusKm),
  );

  const withDistance = stations
    .map((s) => ({
      station: s,
      distanceKm: haversineKm(userLat, userLon, s.latitude, s.longitude),
    }))
    .filter((x) => x.distanceKm <= maxR);

  type Resolved = { station: Station; distanceKm: number; price: number; label: string };

  const resolved: Resolved[] = [];
  for (const { station, distanceKm } of withDistance) {
    const fp = fuelPricesForStation(station);
    const r = resolvePriceForFuelFilter(fp, fuelFilter);
    if (r == null) continue;
    resolved.push({ station, distanceKm, price: r.price, label: r.label });
  }

  const avg =
    resolved.length > 0 ? resolved.reduce((acc, x) => acc + x.price, 0) / resolved.length : 0;

  const ranked: RankedStation[] = resolved
    .map(({ station, distanceKm, price, label }) => ({
      ...station,
      pricePerLiter: price,
      fuelLabel: label,
      distanceKm,
      score: price,
      savingVsAveragePerLiter: avg > 0 ? avg - price : 0,
    }))
    .sort((a, b) => a.pricePerLiter - b.pricePerLiter);

  return { ranked, avgInRadius: avg };
}
