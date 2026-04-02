import { Text } from 'react-native';

import { theme } from '../constants/theme';

export function BrandHeaderTitle() {
  return (
    <Text>
      <Text style={{ color: theme.colors.primary, fontWeight: '800' }}>Bencina</Text>{' '}
      <Text style={{ color: theme.colors.accent, fontWeight: '800' }}>App</Text>
    </Text>
  );
}

