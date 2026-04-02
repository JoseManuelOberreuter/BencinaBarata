import AsyncStorage from '@react-native-async-storage/async-storage';

import { LEGACY_STORAGE_KEYS, STORAGE_KEYS } from '../constants/defaults';
import type { Station } from '../types/station';

export async function readStationsCache(): Promise<{ stations: Station[]; fetchedAt: number } | null> {
  const [raw, ts] = await Promise.all([
    AsyncStorage.getItem(STORAGE_KEYS.stationsCache),
    AsyncStorage.getItem(STORAGE_KEYS.stationsCacheTs),
  ]);
  let resolvedRaw = raw;
  let resolvedTs = ts;

  if (!resolvedRaw || !resolvedTs) {
    const [legacyRaw, legacyTs] = await Promise.all([
      AsyncStorage.getItem(LEGACY_STORAGE_KEYS.stationsCache),
      AsyncStorage.getItem(LEGACY_STORAGE_KEYS.stationsCacheTs),
    ]);

    if (legacyRaw && legacyTs) {
      resolvedRaw = legacyRaw;
      resolvedTs = legacyTs;
      await AsyncStorage.multiSet([
        [STORAGE_KEYS.stationsCache, legacyRaw],
        [STORAGE_KEYS.stationsCacheTs, legacyTs],
      ]);
      await AsyncStorage.multiRemove([
        LEGACY_STORAGE_KEYS.stationsCache,
        LEGACY_STORAGE_KEYS.stationsCacheTs,
      ]);
    }
  }

  if (!resolvedRaw || !resolvedTs) return null;
  const fetchedAt = Number(resolvedTs);
  if (!Number.isFinite(fetchedAt)) return null;
  try {
    const parsed = JSON.parse(resolvedRaw) as unknown;
    if (!Array.isArray(parsed)) return null;
    const stations = (parsed as Station[]).map((s) => ({
      ...s,
      fuelPrices:
        s.fuelPrices && Object.keys(s.fuelPrices).length > 0
          ? s.fuelPrices
          : s.pricePerLiter > 0
            ? { precio: s.pricePerLiter }
            : {},
    }));
    return { stations, fetchedAt };
  } catch {
    return null;
  }
}

export async function writeStationsCache(stations: Station[]): Promise<void> {
  await AsyncStorage.multiSet([
    [STORAGE_KEYS.stationsCache, JSON.stringify(stations)],
    [STORAGE_KEYS.stationsCacheTs, String(Date.now())],
  ]);
  await AsyncStorage.multiRemove([
    LEGACY_STORAGE_KEYS.stationsCache,
    LEGACY_STORAGE_KEYS.stationsCacheTs,
  ]);
}
