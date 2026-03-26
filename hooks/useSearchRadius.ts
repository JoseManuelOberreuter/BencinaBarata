import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useEffect, useState } from 'react';

import {
  DEFAULT_SEARCH_RADIUS_KM,
  MAX_SEARCH_RADIUS_KM,
  MIN_SEARCH_RADIUS_KM,
  STORAGE_KEYS,
} from '../constants/defaults';

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
      const raw = await AsyncStorage.getItem(STORAGE_KEYS.searchRadiusKm);
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
    await AsyncStorage.setItem(STORAGE_KEYS.searchRadiusKm, String(next));
  }, []);

  return { radiusKm, setRadiusKm, ready };
}
