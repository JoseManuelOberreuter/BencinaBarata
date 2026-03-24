import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useCallback, useEffect, useLayoutEffect, useMemo, useState } from 'react';
import {
  FlatList,
  Pressable,
  RefreshControl,
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
import { MAX_RADIUS_KM } from '../constants/defaults';
import { getCneApiToken } from '../constants/config';
import { useScoreFactor } from '../hooks/useScoreFactor';
import { fetchStations } from '../services/cneClient';
import { getCurrentLocation } from '../services/locationService';
import { readStationsCache, writeStationsCache } from '../services/stationsCache';
import type { RootStackParamList } from '../types/navigation';
import type { RankedStation, Station } from '../types/station';
import { rankStationsNearUser } from '../utils/rankStations';

type Props = NativeStackScreenProps<RootStackParamList, 'Home'>;

export function HomeScreen({ navigation }: Props) {
  const { factor, setFactor, ready: factorReady } = useScoreFactor();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [stations, setStations] = useState<Station[]>([]);
  const [userLat, setUserLat] = useState<number | null>(null);
  const [userLon, setUserLon] = useState<number | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [stale, setStale] = useState(false);
  const [staleAt, setStaleAt] = useState<number | null>(null);
  const [factorInput, setFactorInput] = useState('');

  const ranked = useMemo((): RankedStation[] => {
    if (userLat == null || userLon == null || stations.length === 0) return [];
    return rankStationsNearUser(stations, userLat, userLon, factor, MAX_RADIUS_KM).ranked;
  }, [stations, userLat, userLon, factor]);

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
    setFactorInput(String(factor));
  }, [factor]);

  const load = useCallback(
    async (isRefresh: boolean) => {
      if (isRefresh) setRefreshing(true);
      else setLoading(true);
      setFetchError(null);
      setLocationError(null);

      const token = getCneApiToken();
      if (!token) {
        setFetchError('Falta CNE_API_TOKEN en .env (ver .env.example).');
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
              const list = await fetchStations(token);
              await writeStationsCache(list);
              return { list, stale: false as const };
            } catch (e) {
              const cached = await readStationsCache();
              if (cached) {
                return { list: cached.stations, stale: true as const, at: cached.fetchedAt };
              }
              throw e;
            }
          })(),
        ]);

        setStations(stationsResult.list);
        setStale(stationsResult.stale);
        setStaleAt(stationsResult.stale ? stationsResult.at : Date.now());

        if (loc.status === 'ready') {
          setUserLat(loc.latitude);
          setUserLon(loc.longitude);
        } else {
          setUserLat(null);
          setUserLon(null);
          setLocationError(loc.message);
        }
      } catch (e) {
        setFetchError(e instanceof Error ? e.message : 'No pudimos cargar los precios.');
        setStations([]);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [],
  );

  useEffect(() => {
    if (!factorReady) return;
    void load(false);
  }, [factorReady, load]);

  const onRefresh = useCallback(() => {
    void load(true);
  }, [load]);

  const applyFactor = useCallback(async () => {
    const n = Number(factorInput.replace(',', '.'));
    if (!Number.isFinite(n) || n < 0) return;
    await setFactor(n);
  }, [factorInput, setFactor]);

  const keyExtractor = useCallback((item: RankedStation) => item.id, []);

  const renderItem = useCallback(
    ({ item, index }: { item: RankedStation; index: number }) => (
      <StationRow item={item} index={index} />
    ),
    [],
  );

  const listHeader = useMemo(() => {
    if (!stale || staleAt == null) return null;
    const mins = Math.round((Date.now() - staleAt) / 60000);
    return (
      <View style={styles.staleBanner}>
        <Text style={styles.staleText}>
          Sin conexión a la CNE: mostrando datos guardados (hace {mins} min).
        </Text>
      </View>
    );
  }, [stale, staleAt]);

  if (!factorReady || loading) {
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
        <Text style={styles.label}>Peso de la distancia (factor)</Text>
        <View style={styles.row}>
          <TextInput
            value={factorInput}
            onChangeText={setFactorInput}
            keyboardType="decimal-pad"
            style={styles.input}
            accessibilityLabel="Factor de distancia para el puntaje"
          />
          <Pressable style={styles.applyBtn} onPress={() => void applyFactor()}>
            <Text style={styles.applyBtnText}>Aplicar</Text>
          </Pressable>
        </View>
        <Text style={styles.hint}>Score = precio (CLP/L) + distancia (km) × factor</Text>
      </View>

      {locationError ? (
        <ErrorState title="Ubicación" message={locationError} />
      ) : null}

      {listHeader}

      {!locationError && !loading && ranked.length === 0 ? (
        <EmptyState
          message={
            stations.length === 0
              ? 'No hay estaciones disponibles con los datos actuales.'
              : 'No hay estaciones con precio dentro del radio configurado. Prueba aumentar el radio o revisa los datos de la CNE.'
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
