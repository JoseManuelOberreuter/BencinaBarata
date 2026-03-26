import { memo, useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import type { Station } from '../types/station';
import { formatCLP } from '../utils/format';
import { theme } from '../constants/theme';

export type PreviewListItem = Station & {
  pricePerLiter: number;
  fuelLabel?: string;
};

type Props = {
  item: PreviewListItem;
  index: number;
};

/**
 * Fila sin GPS: muestra precio del combustible filtrado; distancia y ahorro pendientes.
 * Sin navegación al detalle hasta que exista ubicación (ver `gpsReady` en Home).
 */
export const StationRowPreview = memo(function StationRowPreview({ item, index }: Props) {
  const badge = index === 0 ? 'Mejor precio (sin GPS)' : null;

  const addr = item.addressLine?.trim();
  const priceFuelLine = useMemo(() => {
    const p = formatCLP(item.pricePerLiter);
    const label = item.fuelLabel?.trim();
    return label ? `${p} / L de ${label}` : `${p} / L`;
  }, [item.pricePerLiter, item.fuelLabel]);

  const a11yLabel = useMemo(() => {
    return [item.name, 'Distancia pendiente de GPS', priceFuelLine].join('. ');
  }, [item.name, priceFuelLine]);

  return (
    <View
      style={styles.card}
      accessibilityRole="text"
      accessibilityLabel={a11yLabel}
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
        <Text style={styles.distanceMuted}>GPS pendiente</Text>
      </View>

      {addr ? (
        <Text style={styles.address} numberOfLines={2}>
          {addr}
        </Text>
      ) : null}

      <Text style={styles.priceLine}>{priceFuelLine}</Text>
      <Text style={styles.savingPlaceholder}>
        Calculando ahorro cuando llegue tu ubicación…
      </Text>
      <Text style={styles.tapHint}>Activa ubicación para ver distancias y abrir el detalle</Text>
    </View>
  );
});

const styles = StyleSheet.create({
  card: {
    paddingVertical: 12,
    paddingHorizontal: 14,
    marginHorizontal: 16,
    marginBottom: 10,
    borderRadius: 12,
    backgroundColor: theme.colors.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: theme.colors.border,
    opacity: 0.95,
  },
  badge: {
    alignSelf: 'flex-start',
    marginBottom: 6,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
    overflow: 'hidden',
    backgroundColor: theme.colors.surface2,
    color: theme.colors.muted,
    fontWeight: '600',
    fontSize: 11,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 10,
  },
  name: {
    flex: 1,
    flexShrink: 1,
    minWidth: 0,
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text,
    lineHeight: 21,
  },
  distanceMuted: {
    fontSize: 13,
    fontWeight: '600',
    color: theme.colors.muted2,
    marginTop: 1,
  },
  address: {
    marginTop: 6,
    fontSize: 13,
    color: theme.colors.muted,
    lineHeight: 18,
  },
  priceLine: {
    marginTop: 8,
    fontSize: 17,
    fontWeight: '700',
    color: theme.colors.text,
    letterSpacing: -0.2,
  },
  savingPlaceholder: {
    marginTop: 4,
    fontSize: 12,
    fontWeight: '500',
    color: theme.colors.muted2,
    fontStyle: 'italic',
  },
  tapHint: {
    marginTop: 6,
    fontSize: 11,
    color: theme.colors.muted2,
    fontWeight: '500',
  },
});
