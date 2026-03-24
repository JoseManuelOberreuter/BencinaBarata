/* eslint-env node */
/**
 * Loads env at build time. Use `.env` locally (see `.env.example`).
 * For EAS: set secrets and reference them in `eas.json` env, or use EAS Secrets.
 */
require('dotenv').config();

const androidAdMobAppId =
  process.env.ADMOB_ANDROID_APP_ID ?? 'ca-app-pub-3940256099942544~3347511713';
const iosAdMobAppId =
  process.env.ADMOB_IOS_APP_ID ?? 'ca-app-pub-3940256099942544~1458002511';

module.exports = {
  expo: {
    name: 'BencinaBarata',
    slug: 'BencinaBarata',
    version: '1.0.0',
    orientation: 'portrait',
    icon: './assets/icon.png',
    userInterfaceStyle: 'light',
    splash: {
      image: './assets/splash-icon.png',
      resizeMode: 'contain',
      backgroundColor: '#ffffff',
    },
    ios: {
      supportsTablet: true,
      bundleIdentifier: 'com.bencinabarata.app',
      infoPlist: {
        NSLocationWhenInUseUsageDescription:
          'Usamos tu ubicación para ordenar bencineras por precio y distancia.',
      },
    },
    android: {
      adaptiveIcon: {
        backgroundColor: '#E6F4FE',
        foregroundImage: './assets/android-icon-foreground.png',
        backgroundImage: './assets/android-icon-background.png',
        monochromeImage: './assets/android-icon-monochrome.png',
      },
      predictiveBackGestureEnabled: false,
      package: 'com.bencinabarata.app',
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
      admobBannerAndroid: process.env.ADMOB_BANNER_ANDROID_ID,
      admobBannerIos: process.env.ADMOB_BANNER_IOS_ID,
      eas: {
        projectId: process.env.EAS_PROJECT_ID,
      },
    },
  },
};
