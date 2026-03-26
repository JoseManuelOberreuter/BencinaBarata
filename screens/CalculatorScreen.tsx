import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import type { RootStackParamList } from '../types/navigation';
import { formatCLP } from '../utils/format';
import { theme } from '../constants/theme';

type Props = NativeStackScreenProps<RootStackParamList, 'Calculator'>;

function parsePositiveNumber(raw: string): number | null {
  const n = Number(raw.replace(',', '.'));
  if (!Number.isFinite(n) || n <= 0) return null;
  return n;
}

export function CalculatorScreen({ route }: Props) {
  const refPrice = route.params?.referencePricePerLiter;
  const [kmPerLiter, setKmPerLiter] = useState('');
  const [kmPerDay, setKmPerDay] = useState('');
  const [pricePerLiter, setPricePerLiter] = useState(
    refPrice != null ? String(Math.round(refPrice)) : '',
  );

  useEffect(() => {
    if (refPrice != null) {
      setPricePerLiter(String(Math.round(refPrice)));
    }
  }, [refPrice]);

  const validationError = useMemo(() => {
    const consumption = parsePositiveNumber(kmPerLiter);
    const distance = parsePositiveNumber(kmPerDay);
    const price = parsePositiveNumber(pricePerLiter);
    if (!kmPerLiter.trim() || !kmPerDay.trim() || !pricePerLiter.trim()) {
      return 'Completa todos los campos con valores mayores que cero.';
    }
    if (consumption == null || distance == null || price == null) {
      return 'Los valores deben ser números válidos mayores que cero.';
    }
    return null;
  }, [kmPerDay, kmPerLiter, pricePerLiter]);

  const results = useMemo(() => {
    if (validationError) return null;
    const consumption = parsePositiveNumber(kmPerLiter)!;
    const distance = parsePositiveNumber(kmPerDay)!;
    const price = parsePositiveNumber(pricePerLiter)!;
    const litersPerDay = distance / consumption;
    const daily = litersPerDay * price;
    const monthly = daily * 30;
    return { litersPerDay, daily, monthly };
  }, [kmPerDay, kmPerLiter, pricePerLiter, validationError]);

  return (
    <SafeAreaView style={styles.safe} edges={['bottom', 'left', 'right']}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.intro}>
          <Text style={styles.introTitle}>Calcula tu gasto en combustible</Text>
          <Text style={styles.introBody}>
            Indica el rendimiento de tu auto (km por litro), cuántos kilómetros sueles recorrer al día y
            el precio por litro. Te mostramos cuántos litros gastas al día y un estimado del gasto diario y
            mensual (30 días).
          </Text>
        </View>

        <View style={styles.form}>
        <Text style={styles.label}>Consumo (km/L)</Text>
        <TextInput
          value={kmPerLiter}
          onChangeText={setKmPerLiter}
          keyboardType="decimal-pad"
          placeholder="Ej: 12"
          style={styles.input}
          accessibilityLabel="Consumo en kilómetros por litro"
        />

        <Text style={styles.label}>Distancia diaria (km)</Text>
        <TextInput
          value={kmPerDay}
          onChangeText={setKmPerDay}
          keyboardType="decimal-pad"
          placeholder="Ej: 40"
          style={styles.input}
          accessibilityLabel="Kilómetros recorridos por día"
        />

        <Text style={styles.label}>Precio por litro (CLP)</Text>
        <TextInput
          value={pricePerLiter}
          onChangeText={setPricePerLiter}
          keyboardType="number-pad"
          placeholder="Ej: 1200"
          style={styles.input}
          accessibilityLabel="Precio por litro en pesos chilenos"
        />

        {validationError ? <Text style={styles.error}>{validationError}</Text> : null}

        {results ? (
          <View style={styles.results} accessibilityRole="summary">
            <Text style={styles.resultLine}>
              Litros/día (aprox.): {results.litersPerDay.toFixed(2)} L
            </Text>
            <Text style={styles.resultHighlight}>Gasto diario: {formatCLP(results.daily)}</Text>
            <Text style={styles.resultHighlight}>Gasto mensual (30 días): {formatCLP(results.monthly)}</Text>
          </View>
        ) : null}

        <Text style={styles.note}>
          El gasto mensual asume 30 días con el mismo recorrido y precio.
        </Text>

        {refPrice != null ? (
          <Pressable
            onPress={() => setPricePerLiter(String(Math.round(refPrice)))}
            style={styles.linkBtn}
            accessibilityRole="button"
          >
            <Text style={styles.linkText}>Usar precio de la mejor opción ({formatCLP(refPrice)}/L)</Text>
          </Pressable>
        ) : null}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 24,
  },
  intro: {
    marginHorizontal: 16,
    marginTop: 8,
    marginBottom: 8,
    padding: 14,
    borderRadius: 12,
    backgroundColor: '#EFF6FF',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#BFDBFE',
  },
  introTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: theme.colors.primary,
    marginBottom: 8,
  },
  introBody: {
    fontSize: 14,
    color: theme.colors.muted,
    lineHeight: 20,
  },
  form: {
    paddingHorizontal: 16,
    paddingBottom: 16,
    gap: 4,
  },
  label: {
    marginTop: 12,
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.text,
  },
  input: {
    marginTop: 6,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: theme.colors.border,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
  },
  error: {
    marginTop: 12,
    color: theme.colors.danger,
    fontSize: 14,
  },
  results: {
    marginTop: 20,
    padding: 16,
    borderRadius: 12,
    backgroundColor: theme.colors.surface2,
    gap: 8,
  },
  resultLine: {
    fontSize: 15,
    color: theme.colors.text,
  },
  resultHighlight: {
    fontSize: 17,
    fontWeight: '600',
    color: theme.colors.text,
  },
  note: {
    marginTop: 16,
    fontSize: 12,
    color: theme.colors.muted2,
  },
  linkBtn: {
    marginTop: 12,
    alignSelf: 'flex-start',
  },
  linkText: {
    color: theme.colors.primary,
    fontWeight: '600',
    fontSize: 14,
  },
});
