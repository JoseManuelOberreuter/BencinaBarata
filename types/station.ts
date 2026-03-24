export interface Station {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  /** Precio por litro en CLP (mejor precio vehicular disponible en el registro) */
  pricePerLiter: number;
  fuelLabel?: string;
}

export interface RankedStation extends Station {
  distanceKm: number;
  score: number;
  /** Diferencia vs precio promedio del conjunto (CLP/L) */
  savingVsAveragePerLiter: number;
}
