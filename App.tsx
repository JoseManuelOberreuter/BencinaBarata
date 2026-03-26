import { NavigationContainer, DefaultTheme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useEffect } from 'react';
import { Platform } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import mobileAds from 'react-native-google-mobile-ads';

import { CalculatorScreen } from './screens/CalculatorScreen';
import { HomeScreen } from './screens/HomeScreen';
import { StationDetailScreen } from './screens/StationDetailScreen';
import { BrandHeaderTitle } from './components/BrandHeaderTitle';
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

export default function App() {
  useEffect(() => {
    if (Platform.OS !== 'web') {
      void mobileAds().initialize();
    }
  }, []);

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
    </SafeAreaProvider>
  );
}
