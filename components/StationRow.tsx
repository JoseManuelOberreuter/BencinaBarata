import { memo } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import type { RankedStation } from '../types/station';
import { formatCLP, formatKm } from '../utils/format';

type Props = {
  item: RankedStation;
  index: number;
};

export const StationRow = memo(function StationRow({ item, index }: Props) {
  const badge = index === 0 ? 'Mejor opción' : null;
  const saving = item.savingVsAveragePerLiter;
  const savingLabel =
    saving > 0
      ? `Ahorro vs promedio: ${formatCLP(saving)}/L`
      : saving < 0
        ? `Sobre promedio: ${formatCLP(-saving)}/L`
        : 'Igual al promedio';

  return (
    <View style={styles.card} accessibilityLabel={`${item.name}, ${formatKm(item.distanceKm)}`}>
      {badge ? (
        <Text style={styles.badge} accessibilityRole="text">
          {badge}
        </Text>
      ) : null}
      <Text style={styles.name}>{item.name}</Text>
      <Text style={styles.line}>{formatKm(item.distanceKm)}</Text>
      <Text style={styles.price}>{formatCLP(item.pricePerLiter)} / L</Text>
      {item.fuelLabel ? <Text style={styles.meta}>Combustible: {item.fuelLabel}</Text> : null}
      <Text style={styles.saving}>{savingLabel}</Text>
    </View>
  );
});

const styles = StyleSheet.create({
  card: {
    padding: 16,
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 12,
    backgroundColor: '#f6f7f9',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#e1e4e8',
  },
  badge: {
    alignSelf: 'flex-start',
    marginBottom: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: '#e6f4fe',
    color: '#0b5cab',
    fontWeight: '600',
    fontSize: 12,
  },
  name: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111',
    marginBottom: 4,
  },
  line: {
    fontSize: 14,
    color: '#444',
  },
  price: {
    marginTop: 6,
    fontSize: 17,
    fontWeight: '600',
    color: '#111',
  },
  meta: {
    marginTop: 4,
    fontSize: 13,
    color: '#666',
  },
  saving: {
    marginTop: 8,
    fontSize: 13,
    color: '#333',
  },
});
