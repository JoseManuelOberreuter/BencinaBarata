/** Máximo radio de búsqueda que el usuario puede elegir (km). */
export const MAX_SEARCH_RADIUS_KM = 80;

/** Valor inicial del radio de búsqueda (km). */
export const DEFAULT_SEARCH_RADIUS_KM = 5;

export const MIN_SEARCH_RADIUS_KM = 1;

/** Máximo de filas en la lista previa (sin GPS), ordenada por precio. */
export const PREVIEW_MAX_RESULTS = 20;

/** @deprecated Solo compatibilidad; el ranking ya no usa factor. */
export const DEFAULT_SCORE_FACTOR = 12;

export const STORAGE_KEYS = {
  searchRadiusKm: '@bencina-app/search_radius_km',
  fuelFilter: '@bencina-app/fuel_filter',
  /** Antiguo factor de score; ya no se usa en la UI. */
  scoreFactor: '@bencina-app/score_factor',
  stationsCache: '@bencina-app/stations_cache_v1',
  stationsCacheTs: '@bencina-app/stations_cache_ts_v1',
  /** Primera aceptación de términos y condiciones. */
  termsAccepted: '@bencina-app/terms_accepted_v1',
} as const;

export const LEGACY_STORAGE_KEYS = {
  searchRadiusKm: '@bencinabarata/search_radius_km',
  fuelFilter: '@bencinabarata/fuel_filter',
  scoreFactor: '@bencinabarata/score_factor',
  stationsCache: '@bencinabarata/stations_cache_v1',
  stationsCacheTs: '@bencinabarata/stations_cache_ts_v1',
} as const;
