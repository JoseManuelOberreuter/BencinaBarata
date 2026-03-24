import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

export function LoadingState({ message = 'Cargando…' }: { message?: string }) {
  return (
    <View style={styles.wrap} accessibilityRole="progressbar">
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
  text: {
    fontSize: 16,
    color: '#333',
  },
});
