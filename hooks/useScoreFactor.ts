import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useEffect, useState } from 'react';

import { DEFAULT_SCORE_FACTOR, STORAGE_KEYS } from '../constants/defaults';

export function useScoreFactor() {
  const [factor, setFactorState] = useState(DEFAULT_SCORE_FACTOR);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const raw = await AsyncStorage.getItem(STORAGE_KEYS.scoreFactor);
      const n = raw != null ? Number(raw) : NaN;
      if (!cancelled && Number.isFinite(n) && n >= 0) {
        setFactorState(n);
      }
      if (!cancelled) setReady(true);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const setFactor = useCallback(async (value: number) => {
    setFactorState(value);
    await AsyncStorage.setItem(STORAGE_KEYS.scoreFactor, String(value));
  }, []);

  return { factor, setFactor, ready };
}
