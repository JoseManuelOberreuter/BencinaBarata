/** Combustible elegido para ordenar y filtrar estaciones en el radio. */
export type FuelFilterId = '93' | '95' | '97' | 'diesel' | 'glp';

export const DEFAULT_FUEL_FILTER: FuelFilterId = '93';

export const FUEL_FILTER_OPTIONS: { id: FuelFilterId; label: string }[] = [
  { id: '93', label: '93' },
  { id: '95', label: '95' },
  { id: '97', label: '97' },
  { id: 'diesel', label: 'Diésel' },
  { id: 'glp', label: 'GLP' },
];
