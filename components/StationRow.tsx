import { memo, useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { RankedStation } from '../types/station';
import { formatCLP, formatKm } from '../utils/format';
import { colorForVsAverage } from '../utils/priceVsAverage';

type Props = {
  item: RankedStation;
  index: number;
  onPress: () => void;
};

export const StationRow = memo(function StationRow({ item, index, onPress }: Props) {
  const badge = index === 0 ? 'Mejor opción' : null;
  const saving = item.savingVsAveragePerLiter;
  const savingLabel =
    saving > 0
      ? `Ahorro vs promedio: ${formatCLP(saving)}/L`
      : saving < 0
        ? `Sobre promedio: ${formatCLP(-saving)}/L`
        : 'Igual al promedio';

  const addr = item.addressLine?.trim();
  const vsAvgColor = colorForVsAverage(saving);
  const priceFuelLine = useMemo(() => {
    const p = formatCLP(item.pricePerLiter);
    const label = item.fuelLabel?.trim();
    return label ? `${p} / L de ${label}` : `${p} / L`;
  }, [item.pricePerLiter, item.fuelLabel]);

  const a11yLabel = useMemo(() => {
    const parts = [item.name, formatKm(item.distanceKm), priceFuelLine, savingLabel];
    if (addr) parts.splice(2, 0, addr);
    return parts.join('. ');
  }, [item.name, addr, priceFuelLine, savingLabel, item.distanceKm]);

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
      accessibilityRole="button"
      accessibilityLabel={a11yLabel}
      accessibilityHint="Ver detalle de la bencinera"
    >
      {badge ? (
        <Text style={styles.badge} accessibilityRole="text">
          {badge}
        </Text>
      ) : null}

      <View style={styles.titleRow}>
        <Text style={styles.name} numberOfLines={2}>
          {item.name}
        </Text>
        <Text style={styles.distance}>{formatKm(item.distanceKm)}</Text>
      </View>

      {addr ? (
        <Text style={styles.address} numberOfLines={2}>
          {addr}
        </Text>
      ) : null}

      <Text style={styles.priceLine}>{priceFuelLine}</Text>
      <Text style={[styles.saving, { color: vsAvgColor }]}>{savingLabel}</Text>
      <Text style={styles.tapHint}>Toca para ver más información</Text>
    </Pressable>
  );
});

const styles = StyleSheet.create({
  card: {
    paddingVertical: 12,
    paddingHorizontal: 14,
    marginHorizontal: 16,
    marginBottom: 10,
    borderRadius: 12,
    backgroundColor: '#f6f7f9',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#e1e4e8',
  },
  cardPressed: {
    opacity: 0.92,
    backgroundColor: '#eef1f4',
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 10,
  },
  badge: {
    alignSelf: 'flex-start',
    marginBottom: 6,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
    overflow: 'hidden',
    backgroundColor: '#e6f4fe',
    color: '#0b5cab',
    fontWeight: '600',
    fontSize: 11,
  },
  name: {
    flex: 1,
    flexShrink: 1,
    minWidth: 0,
    fontSize: 16,
    fontWeight: '600',
    color: '#111',
    lineHeight: 21,
  },
  distance: {
    fontSize: 13,
    fontWeight: '600',
    color: '#555',
    marginTop: 1,
  },
  address: {
    marginTop: 6,
    fontSize: 13,
    color: '#555',
    lineHeight: 18,
  },
  priceLine: {
    marginTop: 8,
    fontSize: 17,
    fontWeight: '700',
    color: '#111',
    letterSpacing: -0.2,
  },
  saving: {
    marginTop: 4,
    fontSize: 12,
    fontWeight: '600',
  },
  tapHint: {
    marginTop: 6,
    fontSize: 11,
    color: '#0b5cab',
    fontWeight: '500',
  },
});
