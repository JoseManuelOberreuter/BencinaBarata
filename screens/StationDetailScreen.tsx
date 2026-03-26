import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useMemo } from 'react';
import { Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import type { RootStackParamList } from '../types/navigation';
import { formatCLP, formatKm } from '../utils/format';
import { colorForVsAverage } from '../utils/priceVsAverage';

type Props = NativeStackScreenProps<RootStackParamList, 'StationDetail'>;

function sortFuelKeys(keys: string[]): string[] {
  const order = ['93', '95', '97', 'DI', 'GLP'];
  return [...keys].sort((a, b) => {
    const ia = order.indexOf(a);
    const ib = order.indexOf(b);
    if (ia !== -1 && ib !== -1) return ia - ib;
    if (ia !== -1) return -1;
    if (ib !== -1) return 1;
    return a.localeCompare(b, 'es');
  });
}

function openInMaps(lat: number, lon: number): void {
  const q = encodeURIComponent(`${lat},${lon}`);
  const url = `https://www.google.com/maps/search/?api=1&query=${q}`;
  void Linking.openURL(url);
}

export function StationDetailScreen({ route }: Props) {
  const s = route.params.station;
  const saving = s.savingVsAveragePerLiter;
  const savingLabel =
    saving > 0
      ? `Ahorro vs promedio en tu zona: ${formatCLP(saving)}/L`
      : saving < 0
        ? `Sobre el promedio: ${formatCLP(-saving)}/L`
        : 'Igual al promedio de tu zona';

  const vsAvgColor = colorForVsAverage(saving);
  const priceRows = useMemo(() => sortFuelKeys(Object.keys(s.fuelPrices)), [s.fuelPrices]);

  const locationLines = useMemo(() => {
    const parts: string[] = [];
    if (s.comuna) parts.push(s.comuna);
    if (s.region) parts.push(s.region);
    return parts.join(' · ');
  }, [s.comuna, s.region]);

  return (
    <SafeAreaView style={styles.safe} edges={['left', 'right', 'bottom']}>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <Text style={styles.title}>{s.name}</Text>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Ubicación</Text>
          {s.addressLine ? (
            <Text style={styles.body}>{s.addressLine}</Text>
          ) : (
            <Text style={styles.muted}>Dirección no disponible.</Text>
          )}
          {locationLines ? <Text style={styles.sub}>{locationLines}</Text> : null}
          <Pressable
            style={({ pressed }) => [styles.mapBtn, pressed && styles.pressed]}
            onPress={() => openInMaps(s.latitude, s.longitude)}
            accessibilityRole="button"
            accessibilityLabel="Abrir en mapas"
          >
            <Text style={styles.mapBtnText}>Abrir en mapas</Text>
          </Pressable>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Distancia</Text>
          <Text style={styles.body}>{formatKm(s.distanceKm)} desde tu posición</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Precio en tu filtro</Text>
          <Text style={styles.priceBig}>{formatCLP(s.pricePerLiter)} / L</Text>
          {s.fuelLabel ? <Text style={styles.meta}>Combustible: {s.fuelLabel}</Text> : null}
          <Text style={[styles.saving, { color: vsAvgColor }]}>{savingLabel}</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Todos los precios</Text>
          {priceRows.map((key) => (
            <View key={key} style={styles.priceRow}>
              <Text style={styles.fuelKey}>{key}</Text>
              <Text style={styles.fuelVal}>{formatCLP(s.fuelPrices[key] ?? 0)} / L</Text>
            </View>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: '#fff',
  },
  scroll: {
    paddingHorizontal: 20,
    paddingBottom: 32,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111',
    marginBottom: 16,
  },
  section: {
    marginBottom: 22,
    paddingBottom: 18,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#e1e4e8',
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0b5cab',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    marginBottom: 8,
  },
  body: {
    fontSize: 16,
    color: '#222',
    lineHeight: 22,
  },
  sub: {
    marginTop: 6,
    fontSize: 14,
    color: '#666',
  },
  muted: {
    fontSize: 15,
    color: '#888',
    fontStyle: 'italic',
  },
  mapBtn: {
    alignSelf: 'flex-start',
    marginTop: 12,
    backgroundColor: '#0b5cab',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
  },
  mapBtnText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 15,
  },
  pressed: {
    opacity: 0.88,
  },
  priceBig: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111',
  },
  meta: {
    marginTop: 6,
    fontSize: 14,
    color: '#666',
  },
  saving: {
    marginTop: 10,
    fontSize: 14,
    fontWeight: '600',
  },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#f0f0f0',
  },
  fuelKey: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  fuelVal: {
    fontSize: 16,
    color: '#111',
  },
});
