import { useCallback, useEffect, useState } from 'react';

import { LEGACY_STORAGE_KEYS, STORAGE_KEYS } from '../constants/defaults';
import type { FuelFilterId } from '../types/fuelFilter';
import { DEFAULT_FUEL_FILTER, FUEL_FILTER_OPTIONS } from '../types/fuelFilter';
import { getStoredValue, setStoredValue } from '../utils/storage';

function isFuelFilterId(v: string): v is FuelFilterId {
  return FUEL_FILTER_OPTIONS.some((o) => o.id === v);
}

export function useFuelFilter() {
  const [fuelFilter, setFuelFilterState] = useState<FuelFilterId>(DEFAULT_FUEL_FILTER);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const raw = await getStoredValue(STORAGE_KEYS.fuelFilter, LEGACY_STORAGE_KEYS.fuelFilter);
      if (!cancelled && (raw === 'any' || raw === 'parafina')) {
        await setStoredValue(
          STORAGE_KEYS.fuelFilter,
          DEFAULT_FUEL_FILTER,
          LEGACY_STORAGE_KEYS.fuelFilter
        );
        setFuelFilterState(DEFAULT_FUEL_FILTER);
      } else if (!cancelled && raw != null && isFuelFilterId(raw)) {
        setFuelFilterState(raw);
      }
      if (!cancelled) setReady(true);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const setFuelFilter = useCallback(async (value: FuelFilterId) => {
    setFuelFilterState(value);
    await setStoredValue(STORAGE_KEYS.fuelFilter, value, LEGACY_STORAGE_KEYS.fuelFilter);
  }, []);

  return { fuelFilter, setFuelFilter, ready };
}
