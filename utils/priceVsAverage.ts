/**
 * Colores según comparación con el precio promedio del radio (savingVsAveragePerLiter).
 * > 0: más barato que el promedio · < 0: más caro
 */
export function colorForVsAverage(savingVsAveragePerLiter: number): string {
  if (savingVsAveragePerLiter > 0) return '#22C55E';
  if (savingVsAveragePerLiter < 0) return '#EF4444';
  return '#64748B';
}
