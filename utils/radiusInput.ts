/**
 * Extrae el primer número del texto (p. ej. "2 k", "2km", " 1,5 ") para el radio en km.
 */
export function parseRadiusKmFromInput(raw: string): number | null {
  const m = raw.match(/(\d+(?:[.,]\d+)?|[.,]\d+)/);
  if (!m) return null;
  const n = Number(m[1].replace(',', '.'));
  if (!Number.isFinite(n) || n <= 0) return null;
  return n;
}
