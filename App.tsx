import AsyncStorage from '@react-native-async-storage/async-storage';
import { NavigationContainer, DefaultTheme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useCallback, useEffect, useState } from 'react';
import { Platform, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import mobileAds from 'react-native-google-mobile-ads';

import { BrandHeaderTitle } from './components/BrandHeaderTitle';
import { TermsModal } from './components/TermsModal';
import { CalculatorScreen } from './screens/CalculatorScreen';
import { HomeScreen } from './screens/HomeScreen';
import { StationDetailScreen } from './screens/StationDetailScreen';
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

type TermsGate = 'loading' | 'show' | 'done';

export default function App() {
  const [termsGate, setTermsGate] = useState<TermsGate>('loading');

  useEffect(() => {
    if (Platform.OS !== 'web') {
      void mobileAds().initialize();
    }
  }, []);

  useEffect(() => {
    void (async () => {
      try {
        const v = await AsyncStorage.getItem(STORAGE_KEYS.termsAccepted);
        setTermsGate(v === '1' ? 'done' : 'show');
      } catch {
        setTermsGate('show');
      }
    })();
  }, []);

  const handleAcceptTerms = useCallback(() => {
    void (async () => {
      try {
        await AsyncStorage.setItem(STORAGE_KEYS.termsAccepted, '1');
      } finally {
        setTermsGate('done');
      }
    })();
  }, []);

  if (termsGate === 'loading') {
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
          initialRouteName="Home"
          screenOptions={{
            headerShadowVisible: false,
            headerTitleStyle: { fontWeight: '600', color: theme.colors.text },
          }}
        >
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
      <TermsModal visible={termsGate === 'show'} onAccept={handleAcceptTerms} />
    </SafeAreaProvider>
  );
}
