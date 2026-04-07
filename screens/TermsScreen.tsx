import AsyncStorage from '@react-native-async-storage/async-storage';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useCallback, useEffect } from 'react';
import { BackHandler, Platform } from 'react-native';

import { TermsAgreementShell } from '../components/TermsAgreementShell';
import { STORAGE_KEYS } from '../constants/defaults';
import type { RootStackParamList } from '../types/navigation';

type Props = NativeStackScreenProps<RootStackParamList, 'Terms'>;

export function TermsScreen({ navigation }: Props) {
  useEffect(() => {
    if (Platform.OS !== 'android') return;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => true);
    return () => sub.remove();
  }, []);

  const onAccept = useCallback(() => {
    void (async () => {
      try {
        await AsyncStorage.setItem(STORAGE_KEYS.termsAccepted, '1');
      } finally {
        navigation.reset({
          index: 0,
          routes: [{ name: 'Home' }],
        });
      }
    })();
  }, [navigation]);

  return <TermsAgreementShell onAccept={onAccept} />;
}
