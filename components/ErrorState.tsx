import { StyleSheet, Text, View } from 'react-native';

export function ErrorState({ title, message }: { title: string; message: string }) {
  return (
    <View style={styles.wrap} accessibilityRole="alert">
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.message}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    padding: 24,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
    color: '#111',
  },
  message: {
    fontSize: 15,
    color: '#444',
    lineHeight: 22,
  },
});
