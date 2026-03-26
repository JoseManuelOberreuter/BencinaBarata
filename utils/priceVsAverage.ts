/**
 * Colores según comparación con el precio promedio del radio (savingVsAveragePerLiter).
 * > 0: más barato que el promedio · < 0: más caro
 */
export function colorForVsAverage(savingVsAveragePerLiter: number): string {
  if (savingVsAveragePerLiter > 0) return '#15803d';
  if (savingVsAveragePerLiter < 0) return '#b91c1c';
  return '#555';
}
