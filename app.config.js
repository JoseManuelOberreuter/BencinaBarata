/* eslint-env node */
/**
 * Loads env at build time. Use `.env` locally (see `.env.example`).
 * For EAS: set secrets and reference them in `eas.json` env, or use EAS Secrets.
 */
require('dotenv').config();

/** Proyecto EAS @josemanuel147/bencina-app (creado con eas build / eas init). */
const EAS_PROJECT_ID_DEFAULT = '77e807ab-d5b7-4624-8dbf-73f422bcdea8';

/**
 * `EAS_PROJECT_ID` en `.env` puede sobreescribir (p. ej. otro entorno). Si no está, usa el de arriba.
 */
const easProjectId =
  process.env.EAS_PROJECT_ID && process.env.EAS_PROJECT_ID.trim()
    ? process.env.EAS_PROJECT_ID.trim()
    : EAS_PROJECT_ID_DEFAULT;

const androidAdMobAppId =
  (process.env.ADMOB_ANDROID_APP_ID || '').trim() ||
  'ca-app-pub-3940256099942544~3347511713';
const iosAdMobAppId =
  (process.env.ADMOB_IOS_APP_ID || '').trim() ||
  'ca-app-pub-3940256099942544~1458002511';

module.exports = {
  expo: {
    name: 'Bencina App',
    slug: 'bencina-app',
    version: '1.0.1',
    orientation: 'portrait',
    scheme: 'bencina-app',
    icon: './assets/icon.png',
    userInterfaceStyle: 'light',
    splash: {
      image: './assets/splash-icon.png',
      resizeMode: 'contain',
      backgroundColor: '#ffffff',
    },
    ios: {
      supportsTablet: true,
      bundleIdentifier: 'com.bencinaapp.app',
      infoPlist: {
        NSLocationWhenInUseUsageDescription:
          'Usamos tu ubicación para ordenar bencineras por precio y distancia.',
      },
    },
    android: {
      /** Evita que el teclado tape el botón Aplicar al editar el radio (comportamiento típico en Android). */
      softwareKeyboardLayoutMode: 'resize',
      adaptiveIcon: {
        backgroundColor: '#E6F4FE',
        foregroundImage: './assets/android-icon-foreground.png',
        backgroundImage: './assets/android-icon-background.png',
        monochromeImage: './assets/android-icon-monochrome.png',
      },
      versionCode: 2,
      predictiveBackGestureEnabled: false,
      package: 'com.bencinaapp.app',
      permissions: ['ACCESS_COARSE_LOCATION', 'ACCESS_FINE_LOCATION'],
    },
    web: {
      favicon: './assets/favicon.png',
    },
    plugins: [
      [
        'expo-location',
        {
          locationWhenInUsePermission:
            'Permite acceder a tu ubicación para calcular distancias a bencineras.',
        },
      ],
      [
        'react-native-google-mobile-ads',
        {
          androidAppId: androidAdMobAppId,
          iosAppId: iosAdMobAppId,
        },
      ],
    ],
    extra: {
      cneApiToken: process.env.CNE_API_TOKEN ?? '',
      /** Proxy HTTPS (Worker, Functions, etc.) que llama a la CNE con el Bearer en el servidor. */
      cneStationsUrl: process.env.CNE_STATIONS_URL ?? '',
      admobBannerAndroid: process.env.ADMOB_BANNER_ANDROID_ID,
      admobBannerIos: process.env.ADMOB_BANNER_IOS_ID,
      eas: {
        projectId: easProjectId,
      },
    },
  },
};
