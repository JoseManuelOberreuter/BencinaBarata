import { Platform, StyleSheet, View } from 'react-native';
import { BannerAd, BannerAdSize, TestIds } from 'react-native-google-mobile-ads';

import { getAdMobBannerUnitId } from '../constants/config';

function resolveUnitId(): string {
  if (__DEV__) return TestIds.BANNER;
  const { android, ios } = getAdMobBannerUnitId();
  const id = Platform.select({
    ios: ios,
    android: android,
    default: undefined,
  });
  return id ?? TestIds.BANNER;
}

export function AdBanner() {
  if (Platform.OS === 'web') return null;

  return (
    <View style={styles.wrap}>
      <BannerAd unitId={resolveUnitId()} size={BannerAdSize.BANNER} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    paddingVertical: 8,
    backgroundColor: '#fff',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#e1e4e8',
  },
});
