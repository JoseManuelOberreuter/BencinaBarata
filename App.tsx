import { NavigationContainer, DefaultTheme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useEffect } from 'react';
import { Platform } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import mobileAds from 'react-native-google-mobile-ads';

import { CalculatorScreen } from './screens/CalculatorScreen';
import { HomeScreen } from './screens/HomeScreen';
import { StationDetailScreen } from './screens/StationDetailScreen';
import type { RootStackParamList } from './types/navigation';

const Stack = createNativeStackNavigator<RootStackParamList>();

const theme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    background: '#ffffff',
    primary: '#0b5cab',
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
      <NavigationContainer theme={theme}>
        <Stack.Navigator
          initialRouteName="Home"
          screenOptions={{
            headerShadowVisible: false,
            headerTitleStyle: { fontWeight: '600' },
          }}
        >
          <Stack.Screen name="Home" component={HomeScreen} options={{ title: 'BencinaBarata' }} />
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
