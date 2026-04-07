import AsyncStorage from '@react-native-async-storage/async-storage';
import { NavigationContainer, DefaultTheme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useEffect, useState } from 'react';
import { Platform, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import mobileAds from 'react-native-google-mobile-ads';

import { BrandHeaderTitle } from './components/BrandHeaderTitle';
import { CalculatorScreen } from './screens/CalculatorScreen';
import { HomeScreen } from './screens/HomeScreen';
import { StationDetailScreen } from './screens/StationDetailScreen';
import { TermsScreen } from './screens/TermsScreen';
import { STORAGE_KEYS } from './constants/defaults';
import type { RootStackParamList } from './types/navigation';
import { theme } from './constants/theme';

const Stack = createNativeStackNavigator<RootStackParamList>();

const appTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    background: theme.colors.background,
    primary: theme.colors.primary,
    text: theme.colors.text,
    card: theme.colors.surface,
  },
};

type TermsBootstrap = 'loading' | { accepted: boolean };

export default function App() {
  const [termsBootstrap, setTermsBootstrap] = useState<TermsBootstrap>('loading');

  useEffect(() => {
    if (Platform.OS !== 'web') {
      void mobileAds().initialize();
    }
  }, []);

  useEffect(() => {
    void (async () => {
      try {
        const v = await AsyncStorage.getItem(STORAGE_KEYS.termsAccepted);
        setTermsBootstrap({ accepted: v === '1' });
      } catch {
        setTermsBootstrap({ accepted: false });
      }
    })();
  }, []);

  if (termsBootstrap === 'loading') {
    return (
      <SafeAreaProvider>
        <View style={{ flex: 1, backgroundColor: theme.colors.background }} />
      </SafeAreaProvider>
    );
  }

  return (
    <SafeAreaProvider>
      <NavigationContainer theme={appTheme}>
        <Stack.Navigator
          initialRouteName={termsBootstrap.accepted ? 'Home' : 'Terms'}
          screenOptions={{
            headerShadowVisible: false,
            headerTitleStyle: { fontWeight: '600', color: theme.colors.text },
          }}
        >
          <Stack.Screen
            name="Terms"
            component={TermsScreen}
            options={{
              headerShown: false,
              gestureEnabled: false,
              animation: 'fade',
            }}
          />
          <Stack.Screen
            name="Home"
            component={HomeScreen}
            options={{ headerTitle: () => <BrandHeaderTitle /> }}
          />
          <Stack.Screen
            name="Calculator"
            component={CalculatorScreen}
            options={{ title: 'Calculadora de gasto' }}
          />
          <Stack.Screen
            name="StationDetail"
            component={StationDetailScreen}
            options={{ title: 'Detalle' }}
          />
        </Stack.Navigator>
      </NavigationContainer>
    </SafeAreaProvider>
  );
}
