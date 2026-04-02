import { useCallback, useEffect, useState } from 'react';

import {
  DEFAULT_SEARCH_RADIUS_KM,
  LEGACY_STORAGE_KEYS,
  MAX_SEARCH_RADIUS_KM,
  MIN_SEARCH_RADIUS_KM,
  STORAGE_KEYS,
} from '../constants/defaults';
import { getStoredValue, setStoredValue } from '../utils/storage';

function clampRadius(value: number): number {
  if (!Number.isFinite(value)) return DEFAULT_SEARCH_RADIUS_KM;
  return Math.min(MAX_SEARCH_RADIUS_KM, Math.max(MIN_SEARCH_RADIUS_KM, value));
}

export function useSearchRadius() {
  const [radiusKm, setRadiusKmState] = useState(DEFAULT_SEARCH_RADIUS_KM);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const raw = await getStoredValue(
        STORAGE_KEYS.searchRadiusKm,
        LEGACY_STORAGE_KEYS.searchRadiusKm
      );
      const n = raw != null ? Number(raw.replace(',', '.')) : NaN;
      if (!cancelled && Number.isFinite(n)) {
        setRadiusKmState(clampRadius(n));
      }
      if (!cancelled) setReady(true);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const setRadiusKm = useCallback(async (value: number) => {
    const next = clampRadius(value);
    setRadiusKmState(next);
    await setStoredValue(
      STORAGE_KEYS.searchRadiusKm,
      String(next),
      LEGACY_STORAGE_KEYS.searchRadiusKm
    );
  }, []);

  return { radiusKm, setRadiusKm, ready };
}
