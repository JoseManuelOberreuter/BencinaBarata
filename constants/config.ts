import Constants from 'expo-constants';

type Extra = {
  cneApiToken?: string;
  admobBannerAndroid?: string;
  admobBannerIos?: string;
};

export function getCneApiToken(): string {
  const extra = Constants.expoConfig?.extra as Extra | undefined;
  return extra?.cneApiToken?.trim() ?? '';
}

export function getAdMobBannerUnitId(): { android?: string; ios?: string } {
  const extra = Constants.expoConfig?.extra as Extra | undefined;
  return {
    android: extra?.admobBannerAndroid,
    ios: extra?.admobBannerIos,
  };
}
