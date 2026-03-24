/** Peso de la distancia (km) en el score: score = precio + distanciaKm * factor */
export const DEFAULT_SCORE_FACTOR = 12;

/** Solo se consideran estaciones dentro de este radio (km) para ordenar y promedios */
export const MAX_RADIUS_KM = 80;

export const STORAGE_KEYS = {
  scoreFactor: '@bencinabarata/score_factor',
  stationsCache: '@bencinabarata/stations_cache_v1',
  stationsCacheTs: '@bencinabarata/stations_cache_ts_v1',
} as const;
