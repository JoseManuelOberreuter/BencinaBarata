import { ActivityIndicator, Image, StyleSheet, Text, View } from 'react-native';

import { theme } from '../constants/theme';

const LOGO_SOURCE = require('../assets/bencina_barata_logo_sin_fondo.png');

export function LoadingState({ message = 'Cargando…' }: { message?: string }) {
  return (
    <View style={styles.wrap} accessibilityRole="progressbar">
      <Image source={LOGO_SOURCE} style={styles.logo} accessibilityLabel="Logo Bencina App" />
      <ActivityIndicator size="large" />
      <Text style={styles.text}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    padding: 24,
    alignItems: 'center',
    gap: 12,
  },
  logo: {
    width: 120,
    height: 120,
    resizeMode: 'contain',
  },
  text: {
    fontSize: 16,
    color: theme.colors.text,
  },
});
