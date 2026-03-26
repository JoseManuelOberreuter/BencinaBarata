import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useCallback, useEffect, useLayoutEffect, useMemo, useState } from 'react';
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
import { MAX_SEARCH_RADIUS_KM, MIN_SEARCH_RADIUS_KM } from '../constants/defaults';
import { getCneApiToken, getCneStationsUrl, hasCneDataSource } from '../constants/config';
import { useFuelFilter } from '../hooks/useFuelFilter';
import { useSearchRadius } from '../hooks/useSearchRadius';
import { fetchStations } from '../services/cneClient';
import { getCurrentLocation } from '../services/locationService';
import { readStationsCache, writeStationsCache } from '../services/stationsCache';
import type { RootStackParamList } from '../types/navigation';
import { FUEL_FILTER_OPTIONS } from '../types/fuelFilter';
import type { RankedStation, Station } from '../types/station';
import { haversineKm } from '../utils/distance';
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

export function HomeScreen({ navigation }: Props) {
  const { radiusKm, setRadiusKm, ready: radiusReady } = useSearchRadius();
  const { fuelFilter, setFuelFilter, ready: fuelReady } = useFuelFilter();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [stations, setStations] = useState<Station[]>([]);
  const [userLat, setUserLat] = useState<number | null>(null);
  const [userLon, setUserLon] = useState<number | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [stale, setStale] = useState(false);
  const [staleAt, setStaleAt] = useState<number | null>(null);
  /** Si la petición a la CNE falló y usamos caché, aquí va el mensaje del error (red, token, etc.). */
  const [lastCneFetchError, setLastCneFetchError] = useState<string | null>(null);
  const [radiusInput, setRadiusInput] = useState('');

  const ranked = useMemo((): RankedStation[] => {
    if (userLat == null || userLon == null || stations.length === 0) return [];
    return rankStationsNearUser(stations, userLat, userLon, radiusKm, fuelFilter).ranked;
  }, [stations, userLat, userLon, radiusKm, fuelFilter]);

  const countStationsInRadius = useMemo(() => {
    if (userLat == null || userLon == null) return 0;
    const maxR = Math.min(
      MAX_SEARCH_RADIUS_KM,
      Math.max(MIN_SEARCH_RADIUS_KM, radiusKm),
    );
    return stations.filter(
      (s) => haversineKm(userLat, userLon, s.latitude, s.longitude) <= maxR,
    ).length;
  }, [stations, userLat, userLon, radiusKm]);

  useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <Pressable
          onPress={() =>
            navigation.navigate('Calculator', {
              referencePricePerLiter: ranked[0]?.pricePerLiter,
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
  }, [navigation, ranked]);

  useEffect(() => {
    setRadiusInput(String(radiusKm));
  }, [radiusKm]);

  const load = useCallback(
    async (isRefresh: boolean) => {
      if (isRefresh) setRefreshing(true);
      else setLoading(true);
      setFetchError(null);
      setLocationError(null);

      const token = getCneApiToken();
      const proxyUrl = getCneStationsUrl();
      debugLog('load:start', {
        isRefresh,
        hasToken: token.length > 0,
        hasProxy: proxyUrl.length > 0,
      });
      if (!hasCneDataSource()) {
        debugLog('load:missing-cne-source');
        setFetchError(
          'Falta CNE_STATIONS_URL (proxy) o CNE_API_TOKEN en .env — ver .env.example.',
        );
        setStations([]);
        setLoading(false);
        setRefreshing(false);
        return;
      }

      try {
        const [loc, stationsResult] = await Promise.all([
          getCurrentLocation(),
          (async () => {
            try {
              const list = await fetchStations();
              await writeStationsCache(list);
              return { list, stale: false as const, cneFetchError: null as string | null };
            } catch (e) {
              const msg = e instanceof Error ? e.message : String(e);
              debugLog('load:cne-fetch-failed', msg);
              const cached = await readStationsCache();
              if (cached) {
                return {
                  list: cached.stations,
                  stale: true as const,
                  at: cached.fetchedAt,
                  cneFetchError: msg,
                };
              }
              throw e;
            }
          })(),
        ]);

        setStations(stationsResult.list);
        setStale(stationsResult.stale);
        setStaleAt(stationsResult.stale ? stationsResult.at : Date.now());
        setLastCneFetchError(stationsResult.stale ? stationsResult.cneFetchError : null);
        debugLog('load:stations-result', {
          count: stationsResult.list.length,
          stale: stationsResult.stale,
        });

        if (loc.status === 'ready') {
          debugLog('load:location-ready', { latitude: loc.latitude, longitude: loc.longitude });
          setUserLat(loc.latitude);
          setUserLon(loc.longitude);
        } else {
          debugLog('load:location-error', loc.message);
          setUserLat(null);
          setUserLon(null);
          setLocationError(loc.message);
        }
      } catch (e) {
        debugLog('load:fetch-error', e instanceof Error ? e.message : String(e));
        setFetchError(e instanceof Error ? e.message : 'No pudimos cargar los precios.');
        setStations([]);
      } finally {
        debugLog('load:end');
        setLoading(false);
        setRefreshing(false);
      }
    },
    [],
  );

  useEffect(() => {
    if (!radiusReady) return;
    void load(false);
  }, [radiusReady, load]);

  const onRefresh = useCallback(() => {
    void load(true);
  }, [load]);

  const applyRadius = useCallback(async () => {
    const n = Number(radiusInput.replace(',', '.'));
    if (!Number.isFinite(n) || n <= 0) return;
    await setRadiusKm(n);
  }, [radiusInput, setRadiusKm]);

  /** La API puede repetir `codigo` en más de una fila; el índice garantiza clave única en la lista. */
  const keyExtractor = useCallback((item: RankedStation, index: number) => `${item.id}-${index}`, []);

  const renderItem = useCallback(
    ({ item, index }: { item: RankedStation; index: number }) => (
      <StationRow
        item={item}
        index={index}
        onPress={() => navigation.navigate('StationDetail', { station: item })}
      />
    ),
    [navigation],
  );

  const listHeader = useMemo(() => {
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

  if (!radiusReady || !fuelReady || loading) {
    return (
      <SafeAreaView style={styles.safe} edges={['left', 'right']}>
        <LoadingState message="Obteniendo ubicación y precios…" />
      </SafeAreaView>
    );
  }

  if (fetchError) {
    return (
      <SafeAreaView style={styles.safe} edges={['left', 'right', 'bottom']}>
        <ErrorState title="No se pudieron cargar datos" message={fetchError} />
        <Pressable style={styles.retry} onPress={() => void load(false)}>
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

      {locationError ? (
        <ErrorState title="Ubicación" message={locationError} />
      ) : null}

      {listHeader}

      {!locationError && !loading && ranked.length === 0 ? (
        <EmptyState
          message={
            stations.length === 0
              ? stale && lastCneFetchError
                ? `No pudimos contactar a la CNE: ${lastCneFetchError} La caché no tiene estaciones; revisa red y token, o reintenta más tarde.`
                : stale
                  ? 'Sin conexión a la CNE y la caché está vacía. Comprueba internet y desliza hacia abajo para reintentar.'
                  : 'No hay estaciones disponibles con los datos actuales.'
              : countStationsInRadius === 0
                ? `No hay estaciones dentro de ${radiusKm} km. Prueba un radio mayor (hasta ${MAX_SEARCH_RADIUS_KM} km).`
                : `Ninguna estación en tu radio publica ${
                    FUEL_FILTER_OPTIONS.find((o) => o.id === fuelFilter)?.label ?? 'ese combustible'
                  }. Prueba otro tipo de combustible o aumenta el radio.`
          }
        />
      ) : null}

      {!locationError && ranked.length > 0 ? (
        <FlatList
          style={styles.list}
          data={ranked}
          keyExtractor={keyExtractor}
          renderItem={renderItem}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          contentContainerStyle={styles.listContent}
          initialNumToRender={12}
          windowSize={5}
          removeClippedSubviews
        />
      ) : null}

      <AdBanner />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: '#fff',
  },
  controls: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#e1e4e8',
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#111',
    marginBottom: 10,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#222',
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
    borderColor: '#ccc',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
  },
  applyBtn: {
    backgroundColor: '#0b5cab',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 8,
  },
  applyBtnText: {
    color: '#fff',
    fontWeight: '600',
  },
  hint: {
    marginTop: 8,
    fontSize: 12,
    color: '#666',
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
    backgroundColor: '#eef1f4',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#d8dde2',
  },
  chipSelected: {
    backgroundColor: '#e6f4fe',
    borderColor: '#0b5cab',
  },
  chipText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
  },
  chipTextSelected: {
    color: '#0b5cab',
    fontWeight: '600',
  },
  staleBanner: {
    backgroundColor: '#fff8e6',
    padding: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#f0e0b2',
  },
  staleText: {
    fontSize: 13,
    color: '#6a4b00',
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
    color: '#0b5cab',
    fontWeight: '600',
    fontSize: 16,
  },
  retry: {
    margin: 16,
    alignSelf: 'center',
    backgroundColor: '#0b5cab',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryText: {
    color: '#fff',
    fontWeight: '600',
  },
});
