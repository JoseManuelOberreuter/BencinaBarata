import type { FuelFilterId } from '../types/fuelFilter';

export type ResolvedFuelPrice = { price: number; label: string };

function norm(k: string): string {
  return k.trim();
}

/** Claves habituales en la API CNE v4 y alias frecuentes. */
const DIESEL_KEYS = ['di', 'diesel', 'díesel', 'diesel b', 'diesel b5', 'petroleo'];
const GLP_KEYS = ['glp', 'gas licuado', 'gas licuado vehicular'];

function matchesDiesel(key: string): boolean {
  const k = norm(key).toLowerCase();
  if (DIESEL_KEYS.some((d) => k === d)) return true;
  return /diesel|diésel|petr[oó]leo\s*diesel/i.test(k);
}

function matchesGlp(key: string): boolean {
  const k = norm(key).toLowerCase();
  if (GLP_KEYS.some((g) => k === g)) return true;
  return /\bglp\b|gas\s*licu/i.test(k);
}

/**
 * Precio y etiqueta para el combustible seleccionado, o null si la estación no lo publica.
 */
export function resolvePriceForFuelFilter(
  fuelPrices: Record<string, number>,
  filter: FuelFilterId,
): ResolvedFuelPrice | null {
  const entries = Object.entries(fuelPrices).filter(([, p]) => Number.isFinite(p) && p > 0);
  if (entries.length === 0) return null;

  if (filter === '93' || filter === '95' || filter === '97') {
    const want = filter;
    const exact = entries.find(([k]) => norm(k) === want);
    if (exact) return { price: exact[1], label: exact[0] };
    const re = new RegExp(`(^|[^0-9])${want}([^0-9]|$)`);
    const loose = entries.find(([k]) => re.test(norm(k)));
    return loose ? { price: loose[1], label: loose[0] } : null;
  }

  if (filter === 'diesel') {
    const byKey = entries.find(([k]) => matchesDiesel(k));
    return byKey ? { price: byKey[1], label: byKey[0] } : null;
  }

  if (filter === 'glp') {
    const byKey = entries.find(([k]) => matchesGlp(k));
    return byKey ? { price: byKey[1], label: byKey[0] } : null;
  }

  return null;
}
