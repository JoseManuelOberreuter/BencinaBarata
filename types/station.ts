export interface Station {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  /** Precio por litro en CLP (referencia: preferencia bencina si existe; ver `fuelPrices`) */
  pricePerLiter: number;
  fuelLabel?: string;
  /** Precios por clave de producto según la CNE (ej. 93, 95, 97, DI, GLP). */
  fuelPrices: Record<string, number>;
}

export interface RankedStation extends Station {
  distanceKm: number;
  score: number;
  /** Diferencia vs precio promedio del conjunto (CLP/L) */
  savingVsAveragePerLiter: number;
}
