import { StyleSheet, Text, View } from 'react-native';

import { theme } from '../constants/theme';

export function EmptyState({ message }: { message: string }) {
  return (
    <View style={styles.wrap}>
      <Text style={styles.text}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    padding: 24,
  },
  text: {
    fontSize: 15,
    color: theme.colors.muted,
    textAlign: 'center',
  },
});
