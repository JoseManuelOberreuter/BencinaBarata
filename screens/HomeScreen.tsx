import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useCallback, useEffect, useLayoutEffect, useMemo, useState } from 'react';
import Constants from 'expo-constants';
import {
  FlatList,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AdBanner } from '../components/AdBanner';
import { EmptyState } from '../components/EmptyState';
import { ErrorState } from '../components/ErrorState';
import { LoadingState } from '../components/LoadingState';
import { StationRow } from '../components/StationRow';
import type { PreviewListItem } from '../components/StationRowPreview';
import { StationRowPreview } from '../components/StationRowPreview';
import {
  MAX_SEARCH_RADIUS_KM,
  MIN_SEARCH_RADIUS_KM,
  PREVIEW_MAX_RESULTS,
} from '../constants/defaults';
import { theme } from '../constants/theme';
import { hasCneDataSource } from '../constants/config';
import { useFuelFilter } from '../hooks/useFuelFilter';
import { useSearchRadius } from '../hooks/useSearchRadius';
import { fetchStations } from '../services/cneClient';
import { getCurrentLocation } from '../services/locationService';
import { readStationsCache, writeStationsCache } from '../services/stationsCache';
import type { RootStackParamList } from '../types/navigation';
import { FUEL_FILTER_OPTIONS } from '../types/fuelFilter';
import type { RankedStation, Station } from '../types/station';
import { haversineKm } from '../utils/distance';
import { resolvePriceForFuelFilter } from '../utils/fuelFilter';
import { rankStationsNearUser } from '../utils/rankStations';

type Props = NativeStackScreenProps<RootStackParamList, 'Home'>;

function debugLog(message: string, payload?: unknown): void {
  if (!__DEV__) return;
  if (payload === undefined) {
    console.log(`[home] ${message}`);
    return;
  }
  console.log(`[home] ${message}`, payload);
}

function fuelPricesForStation(s: Station): Record<string, number> {
  if (s.fuelPrices && Object.keys(s.fuelPrices).length > 0) return s.fuelPrices;
  return s.pricePerLiter > 0 ? { precio: s.pricePerLiter } : {};
}

export function HomeScreen({ navigation }: Props) {
  const appVersion = Constants.expoConfig?.version ?? '1.0.0';
  const { radiusKm, setRadiusKm, ready: radiusReady } = useSearchRadius();
  const { fuelFilter, setFuelFilter, ready: fuelReady } = useFuelFilter();
  const [stationsLoading, setStationsLoading] = useState(false);
  const [locationLoading, setLocationLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [stations, setStations] = useState<Station[]>([]);
  const [userLat, setUserLat] = useState<number | null>(null);
  const [userLon, setUserLon] = useState<number | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [stale, setStale] = useState(false);
  const [staleAt, setStaleAt] = useState<number | null>(null);
  const [lastCneFetchError, setLastCneFetchError] = useState<string | null>(null);
  const [radiusInput, setRadiusInput] = useState('');

  const gpsReady = userLat != null && userLon != null;

  const ranked = useMemo((): RankedStation[] => {
    if (!gpsReady || stations.length === 0) return [];
    return rankStationsNearUser(stations, userLat!, userLon!, radiusKm, fuelFilter).ranked;
  }, [stations, userLat, userLon, radiusKm, fuelFilter, gpsReady]);

  const previewRanked = useMemo((): PreviewListItem[] => {
    if (stations.length === 0) return [];
    const rows: PreviewListItem[] = [];
    for (const s of stations) {
      const fp = fuelPricesForStation(s);
      const r = resolvePriceForFuelFilter(fp, fuelFilter);
      if (r == null) continue;
      rows.push({
        ...s,
        pricePerLiter: r.price,
        fuelLabel: r.label,
      });
    }
    rows.sort((a, b) => a.pricePerLiter - b.pricePerLiter);
    return rows.slice(0, PREVIEW_MAX_RESULTS);
  }, [stations, fuelFilter]);

  const referencePriceForCalculator = useMemo(() => {
    if (gpsReady) return ranked[0]?.pricePerLiter;
    return previewRanked[0]?.pricePerLiter;
  }, [gpsReady, ranked, previewRanked]);

  const countStationsInRadius = useMemo(() => {
    if (!gpsReady) return 0;
    const maxR = Math.min(
      MAX_SEARCH_RADIUS_KM,
      Math.max(MIN_SEARCH_RADIUS_KM, radiusKm),
    );
    return stations.filter(
      (s) => haversineKm(userLat!, userLon!, s.latitude, s.longitude) <= maxR,
    ).length;
  }, [stations, userLat, userLon, radiusKm, gpsReady]);

  useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <Pressable
          onPress={() =>
            navigation.navigate('Calculator', {
              referencePricePerLiter: referencePriceForCalculator,
            })
          }
          accessibilityRole="button"
          accessibilityLabel="Abrir calculadora de gasto"
          style={styles.headerBtn}
        >
          <Text style={styles.headerBtnText}>Calculadora</Text>
        </Pressable>
      ),
    });
  }, [navigation, referencePriceForCalculator]);

  useEffect(() => {
    setRadiusInput(String(radiusKm));
  }, [radiusKm]);

  useEffect(() => {
    if (!radiusReady || !fuelReady) return;
    let cancelled = false;

    async function init() {
      if (!hasCneDataSource()) {
        debugLog('init:missing-cne-source');
        setFetchError(
          'Falta CNE_STATIONS_URL (proxy) o CNE_API_TOKEN en .env — ver .env.example.',
        );
        setStations([]);
        return;
      }

      setFetchError(null);

      const cached = await readStationsCache();
      if (cancelled) return;
      if (cached?.stations.length) {
        setStations(cached.stations);
        setStaleAt(cached.fetchedAt);
        setStale(false);
        setLastCneFetchError(null);
      }
      setStationsLoading(!cached?.stations.length);

      setLocationLoading(true);
      setLocationError(null);
      void getCurrentLocation().then((loc) => {
        if (cancelled) return;
        setLocationLoading(false);
        if (loc.status === 'ready') {
          debugLog('init:location-ready', { latitude: loc.latitude, longitude: loc.longitude });
          setUserLat(loc.latitude);
          setUserLon(loc.longitude);
        } else {
          debugLog('init:location-error', loc.message);
          setUserLat(null);
          setUserLon(null);
          setLocationError(loc.message);
        }
      });

      try {
        const list = await fetchStations();
        if (cancelled) return;
        await writeStationsCache(list);
        setStations(list);
        setStale(false);
        setStaleAt(Date.now());
        setLastCneFetchError(null);
        debugLog('init:stations-ok', { count: list.length });
      } catch (e) {
        if (cancelled) return;
        const msg = e instanceof Error ? e.message : String(e);
        debugLog('init:cne-fetch-failed', msg);
        const cached2 = await readStationsCache();
        if (cached2?.stations.length) {
          setStations(cached2.stations);
          setStale(true);
          setStaleAt(cached2.fetchedAt);
          setLastCneFetchError(msg);
        } else {
          setFetchError(msg);
          setStations([]);
        }
      } finally {
        if (!cancelled) setStationsLoading(false);
      }
    }

    void init();
    return () => {
      cancelled = true;
    };
  }, [radiusReady, fuelReady]);

  const onRefresh = useCallback(async () => {
    if (!hasCneDataSource()) return;
    setRefreshing(true);
    setLocationLoading(true);
    setLocationError(null);

    const locPromise = getCurrentLocation();

    try {
      const list = await fetchStations();
      await writeStationsCache(list);
      setStations(list);
      setStale(false);
      setStaleAt(Date.now());
      setLastCneFetchError(null);
      setFetchError(null);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      const cached = await readStationsCache();
      if (cached?.stations.length) {
        setStations(cached.stations);
        setStale(true);
        setStaleAt(cached.fetchedAt);
        setLastCneFetchError(msg);
      } else {
        setFetchError(msg);
      }
    }

    const loc = await locPromise;
    setLocationLoading(false);
    if (loc.status === 'ready') {
      setUserLat(loc.latitude);
      setUserLon(loc.longitude);
    } else {
      setUserLat(null);
      setUserLon(null);
      setLocationError(loc.message);
    }

    setRefreshing(false);
  }, []);

  const applyRadius = useCallback(async () => {
    const n = Number(radiusInput.replace(',', '.'));
    if (!Number.isFinite(n) || n <= 0) return;
    await setRadiusKm(n);
  }, [radiusInput, setRadiusKm]);

  const keyExtractorRanked = useCallback(
    (item: RankedStation, index: number) => `${item.id}-${index}`,
    [],
  );

  const keyExtractorPreview = useCallback(
    (item: PreviewListItem, index: number) => `${item.id}-preview-${index}`,
    [],
  );

  const renderItemRanked = useCallback(
    ({ item, index }: { item: RankedStation; index: number }) => (
      <StationRow
        item={item}
        index={index}
        onPress={() => navigation.navigate('StationDetail', { station: item })}
      />
    ),
    [navigation],
  );

  const renderItemPreview = useCallback(
    ({ item, index }: { item: PreviewListItem; index: number }) => (
      <StationRowPreview item={item} index={index} />
    ),
    [],
  );

  const staleBanner = useMemo(() => {
    if (!stale || staleAt == null) return null;
    const mins = Math.round((Date.now() - staleAt) / 60000);
    const detail = lastCneFetchError?.trim();
    return (
      <View style={styles.staleBanner}>
        <Text style={styles.staleText}>
          No se pudo actualizar desde la CNE: datos guardados (hace {mins} min).
          {detail ? `\n${detail}` : ''}
        </Text>
      </View>
    );
  }, [stale, staleAt, lastCneFetchError]);

  const progressStage = useMemo(() => {
    const stationsOk = stations.length > 0 && !stationsLoading;
    if (stationsOk && !locationLoading && gpsReady) return 2;
    if (stationsOk && locationLoading) return 1;
    if (stationsOk && !gpsReady && !locationLoading) return 1;
    return 0;
  }, [stations.length, stationsLoading, locationLoading, gpsReady]);

  const loadProgressBanner = useMemo(() => {
    if (!radiusReady || !fuelReady) return null;
    if (stations.length === 0) return null;
    const pct = progressStage >= 2 ? 100 : progressStage >= 1 ? 50 : 0;
    return (
      <View style={styles.progressWrap}>
        <View style={styles.progressTrack}>
          <View style={[styles.progressFill, { width: `${pct}%` }]} />
        </View>
        <Text style={styles.progressHint}>
          {progressStage >= 2
            ? 'Listo: precios y ubicación.'
            : stationsLoading
              ? 'Descargando precios…'
              : locationLoading
                ? 'Buscando ubicación para estimar distancias…'
                : locationError
                  ? 'Sin ubicación: mostrando mejores precios (sin distancia).'
                  : 'Preparando…'}
        </Text>
      </View>
    );
  }, [
    radiusReady,
    fuelReady,
    stations.length,
    stationsLoading,
    locationLoading,
    locationError,
    progressStage,
  ]);

  const emptyMessage = useMemo(() => {
    if (stations.length === 0) {
      if (stale && lastCneFetchError) {
        return `No pudimos contactar a la CNE: ${lastCneFetchError} La caché no tiene estaciones; revisa red y token, o reintenta más tarde.`;
      }
      if (stale) {
        return 'Sin conexión a la CNE y la caché está vacía. Comprueba internet y desliza hacia abajo para reintentar.';
      }
      return 'No hay estaciones disponibles con los datos actuales.';
    }
    if (gpsReady) {
      if (countStationsInRadius === 0) {
        return `No hay estaciones dentro de ${radiusKm} km. Prueba un radio mayor (hasta ${MAX_SEARCH_RADIUS_KM} km).`;
      }
      return `Ninguna estación en tu radio publica ${
        FUEL_FILTER_OPTIONS.find((o) => o.id === fuelFilter)?.label ?? 'ese combustible'
      }. Prueba otro tipo de combustible o aumenta el radio.`;
    }
    if (previewRanked.length === 0) {
      return `Ninguna estación publica ${
        FUEL_FILTER_OPTIONS.find((o) => o.id === fuelFilter)?.label ?? 'ese combustible'
      } en los datos actuales. Prueba otro tipo de combustible.`;
    }
    return '';
  }, [
    stations.length,
    stale,
    lastCneFetchError,
    gpsReady,
    countStationsInRadius,
    radiusKm,
    fuelFilter,
    previewRanked.length,
  ]);

  const showEmpty =
    (stations.length === 0 && !stationsLoading) ||
    (gpsReady && ranked.length === 0 && stations.length > 0) ||
    (!gpsReady && previewRanked.length === 0 && stations.length > 0);

  const showRankedList = gpsReady && ranked.length > 0;
  const showPreviewList = !gpsReady && previewRanked.length > 0;

  const showFullScreenLoading =
    !radiusReady || !fuelReady || (stations.length === 0 && stationsLoading && !fetchError);

  if (showFullScreenLoading) {
    return (
      <SafeAreaView style={styles.safe} edges={['left', 'right']}>
        <LoadingState
          message={
            stationsLoading
              ? 'Cargando precios desde la CNE…'
              : 'Preparando la app…'
          }
        />
      </SafeAreaView>
    );
  }

  if (fetchError && stations.length === 0) {
    return (
      <SafeAreaView style={styles.safe} edges={['left', 'right', 'bottom']}>
        <ErrorState title="No se pudieron cargar datos" message={fetchError} />
        <Pressable
          style={styles.retry}
          onPress={() => {
            setFetchError(null);
            setStationsLoading(true);
            void (async () => {
              try {
                const list = await fetchStations();
                await writeStationsCache(list);
                setStations(list);
                setStale(false);
                setStaleAt(Date.now());
                setLastCneFetchError(null);
                setFetchError(null);
              } catch (e) {
                setFetchError(e instanceof Error ? e.message : 'No pudimos cargar los precios.');
              } finally {
                setStationsLoading(false);
              }
            })();
          }}
        >
          <Text style={styles.retryText}>Reintentar</Text>
        </Pressable>
        <AdBanner />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['left', 'right']}>
      <View style={styles.controls}>
        <Text style={styles.label}>Radio (km)</Text>
        <View style={styles.row}>
          <TextInput
            value={radiusInput}
            onChangeText={setRadiusInput}
            keyboardType="decimal-pad"
            style={styles.input}
            accessibilityLabel="Radio máximo en kilómetros para listar bencineras"
          />
          <Pressable style={styles.applyBtn} onPress={() => void applyRadius()}>
            <Text style={styles.applyBtnText}>Aplicar</Text>
          </Pressable>
        </View>
        <Text style={styles.label}>Combustible</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.chipsScroll}
          contentContainerStyle={styles.chipsRow}
        >
          {FUEL_FILTER_OPTIONS.map((opt) => {
            const selected = fuelFilter === opt.id;
            return (
              <Pressable
                key={opt.id}
                onPress={() => void setFuelFilter(opt.id)}
                style={[styles.chip, selected && styles.chipSelected]}
                accessibilityRole="button"
                accessibilityState={{ selected }}
                accessibilityLabel={`Filtrar por ${opt.label}`}
              >
                <Text style={[styles.chipText, selected && styles.chipTextSelected]}>{opt.label}</Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      {loadProgressBanner}

      {locationError && stations.length > 0 ? (
        <View style={styles.locationBanner}>
          <Text style={styles.locationBannerText}>{locationError}</Text>
        </View>
      ) : null}

      {staleBanner}

      {showEmpty ? <EmptyState message={emptyMessage} /> : null}

      {showRankedList ? (
        <FlatList
          style={styles.list}
          data={ranked}
          keyExtractor={keyExtractorRanked}
          renderItem={renderItemRanked}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          contentContainerStyle={styles.listContent}
          initialNumToRender={12}
          windowSize={5}
          removeClippedSubviews
        />
      ) : null}

      {showPreviewList ? (
        <FlatList
          style={styles.list}
          data={previewRanked}
          keyExtractor={keyExtractorPreview}
          renderItem={renderItemPreview}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          contentContainerStyle={styles.listContent}
          initialNumToRender={12}
          windowSize={5}
          removeClippedSubviews
          ListHeaderComponent={
            !gpsReady && previewRanked.length > 0 ? (
              <Text style={styles.previewListHint}>
                Orden por menor precio del combustible elegido. Activa ubicación para distancias y
                detalle.
              </Text>
            ) : null
          }
        />
      ) : null}

      <Text style={styles.versionTag}>v{appVersion}</Text>
      <AdBanner />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  controls: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: theme.colors.border,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: 6,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  input: {
    flex: 1,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: theme.colors.border,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
  },
  applyBtn: {
    backgroundColor: theme.colors.primary,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 8,
  },
  applyBtnText: {
    color: theme.colors.surface,
    fontWeight: '600',
  },
  chipsScroll: {
    marginTop: 4,
    marginBottom: 2,
    maxHeight: 44,
  },
  chipsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 4,
    paddingRight: 8,
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: theme.colors.surface2,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: theme.colors.border,
  },
  chipSelected: {
    backgroundColor: theme.colors.primaryTint,
    borderColor: theme.colors.primary,
  },
  chipText: {
    fontSize: 14,
    fontWeight: '500',
    color: theme.colors.text,
  },
  chipTextSelected: {
    color: theme.colors.primary,
    fontWeight: '600',
  },
  progressWrap: {
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 6,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: theme.colors.border,
    gap: 6,
  },
  progressTrack: {
    height: 4,
    borderRadius: 2,
    backgroundColor: theme.colors.surface2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: theme.colors.primary,
    borderRadius: 2,
  },
  progressHint: {
    fontSize: 12,
    color: theme.colors.muted2,
  },
  locationBanner: {
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#FDE68A',
  },
  locationBannerText: {
    fontSize: 13,
    color: theme.colors.text,
    lineHeight: 18,
  },
  previewListHint: {
    fontSize: 13,
    color: theme.colors.muted2,
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 4,
    lineHeight: 18,
  },
  staleBanner: {
    backgroundColor: '#EFF6FF',
    padding: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#BFDBFE',
  },
  staleText: {
    fontSize: 13,
    color: theme.colors.primaryDark,
    textAlign: 'center',
  },
  list: {
    flex: 1,
  },
  listContent: {
    paddingTop: 8,
    paddingBottom: 24,
  },
  headerBtn: {
    marginRight: 12,
    paddingVertical: 6,
    paddingHorizontal: 4,
  },
  headerBtnText: {
    color: theme.colors.primary,
    fontWeight: '600',
    fontSize: 16,
  },
  retry: {
    margin: 16,
    alignSelf: 'center',
    backgroundColor: theme.colors.primary,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryText: {
    color: theme.colors.surface,
    fontWeight: '600',
  },
  versionTag: {
    alignSelf: 'flex-end',
    paddingHorizontal: 12,
    paddingTop: 4,
    fontSize: 10,
    color: theme.colors.muted2,
  },
});
