import Constants from 'expo-constants';

type Extra = {
  cneApiToken?: string;
  /** GET que devuelve el mismo JSON que https://api.cne.cl/api/v4/estaciones (token solo en el servidor). */
  cneStationsUrl?: string;
  admobBannerAndroid?: string;
  admobBannerIos?: string;
};

export function getCneApiToken(): string {
  const extra = Constants.expoConfig?.extra as Extra | undefined;
  return extra?.cneApiToken?.trim() ?? '';
}

/** Si está definido, `fetchStations` usa esta URL y no envía Bearer desde la app. */
export function getCneStationsUrl(): string {
  const extra = Constants.expoConfig?.extra as Extra | undefined;
  return extra?.cneStationsUrl?.trim() ?? '';
}

export function hasCneDataSource(): boolean {
  return getCneStationsUrl().length > 0 || getCneApiToken().length > 0;
}

export function getAdMobBannerUnitId(): { android?: string; ios?: string } {
  const extra = Constants.expoConfig?.extra as Extra | undefined;
  return {
    android: extra?.admobBannerAndroid,
    ios: extra?.admobBannerIos,
  };
}
