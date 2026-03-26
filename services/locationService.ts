import * as Location from 'expo-location';
import type { LocationObject } from 'expo-location';
import { Accuracy } from 'expo-location';
import { Platform } from 'react-native';

export type LocationResult =
  | { status: 'ready'; latitude: number; longitude: number }
  | { status: 'error'; message: string };

const EMULATOR_HINT =
  'Emulador: ⋯ Extended controls → Location → GPS ON → SET LOCATION; luego refresca. Si sigue igual: `adb emu geo fix <longitud> <latitud>` (ej. adb emu geo fix -70.593 -33.455).';

function debugLog(message: string, payload?: unknown): void {
  if (!__DEV__) return;
  if (payload === undefined) {
    console.log(`[location] ${message}`);
    return;
  }
  console.log(`[location] ${message}`, payload);
}

/** En emulador, tras `adb emu geo fix`, la última posición puede ser “vieja” >10 min para el reloj del sistema; 10m era demasiado estricto. */
const LAST_KNOWN_MAX_AGE_MS = 60 * 60 * 1000; // 1 h
const LAST_KNOWN_FALLBACK_MAX_AGE_MS = 24 * 60 * 60 * 1000; // 24 h (p. ej. AVD que no refresca el timestamp)

async function resolveCoordinates(): Promise<{ latitude: number; longitude: number } | null> {
  const withAccuracy = (accuracy: Accuracy) =>
    Location.getCurrentPositionAsync({
      accuracy,
      mayShowUserSettingsDialog: true,
    });

  const attempts: Array<{ name: string; run: () => Promise<LocationObject> }> = [
    {
      name: 'lastKnown:maxAge1h',
      run: async () => {
        const last = await Location.getLastKnownPositionAsync({
          maxAge: LAST_KNOWN_MAX_AGE_MS,
        });
        if (last) return last;
        throw new Error('no last known');
      },
    },
    {
      name: 'lastKnown:maxAge24h',
      run: async () => {
        const last = await Location.getLastKnownPositionAsync({
          maxAge: LAST_KNOWN_FALLBACK_MAX_AGE_MS,
        });
        if (last) return last;
        throw new Error('no last known');
      },
    },
    { name: 'current:Lowest', run: () => withAccuracy(Accuracy.Lowest) },
    { name: 'current:Low', run: () => withAccuracy(Accuracy.Low) },
    { name: 'current:Balanced', run: () => withAccuracy(Accuracy.Balanced) },
  ];

  for (const attempt of attempts) {
    try {
      debugLog(`Trying ${attempt.name}`);
      const pos = await attempt.run();
      debugLog(`Success ${attempt.name}`, {
        latitude: pos.coords.latitude,
        longitude: pos.coords.longitude,
        accuracy: pos.coords.accuracy,
      });
      return { latitude: pos.coords.latitude, longitude: pos.coords.longitude };
    } catch (error) {
      debugLog(`Failed ${attempt.name}`, error instanceof Error ? error.message : String(error));
    }
  }
  debugLog('All getCurrent/lastKnown strategies failed');
  return null;
}

/** En algunos AVD, getCurrentPositionAsync falla pero el primer update de watch sí llega. */
async function watchFirstFix(timeoutMs: number): Promise<{ latitude: number; longitude: number } | null> {
  let resolveFirst!: (value: { latitude: number; longitude: number }) => void;
  const firstFix = new Promise<{ latitude: number; longitude: number }>((resolve) => {
    resolveFirst = resolve;
  });

  let firstConsumed = false;
  const subscription = await Location.watchPositionAsync(
    {
      accuracy: Accuracy.Lowest,
      mayShowUserSettingsDialog: false,
      timeInterval: 500,
    },
    (pos) => {
      if (firstConsumed) return;
      firstConsumed = true;
      debugLog('watchFirstFix: first update', {
        latitude: pos.coords.latitude,
        longitude: pos.coords.longitude,
      });
      resolveFirst({ latitude: pos.coords.latitude, longitude: pos.coords.longitude });
    },
    (err) => {
      debugLog('watchFirstFix: error callback', err);
    },
  );

  try {
    const result = await Promise.race([
      firstFix,
      new Promise<null>((resolve) => {
        setTimeout(() => {
          debugLog(`watchFirstFix: timeout ${timeoutMs}ms`);
          resolve(null);
        }, timeoutMs);
      }),
    ]);
    return result;
  } finally {
    try {
      subscription.remove();
    } catch {
      // ignore
    }
  }
}

export async function getCurrentLocation(): Promise<LocationResult> {
  debugLog('Requesting foreground permission');
  const perm = await Location.requestForegroundPermissionsAsync();
  debugLog('Permission response', perm);
  if (perm.status !== 'granted') {
    return {
      status: 'error',
      message: 'No se otorgó permiso de ubicación. Actívalo en ajustes para ver distancias.',
    };
  }

  const servicesOk = await Location.hasServicesEnabledAsync();
  debugLog('Services enabled', servicesOk);
  try {
    const providers = await Location.getProviderStatusAsync();
    debugLog('Provider status', providers);
  } catch (e) {
    debugLog('getProviderStatusAsync failed', e instanceof Error ? e.message : String(e));
  }
  if (!servicesOk) {
    return {
      status: 'error',
      message: 'La ubicación está desactivada en el dispositivo. Actívala en Ajustes → Ubicación.',
    };
  }

  if (Platform.OS === 'android') {
    try {
      debugLog('Trying enableNetworkProviderAsync');
      await Location.enableNetworkProviderAsync();
      debugLog('enableNetworkProviderAsync accepted');
    } catch {
      debugLog('enableNetworkProviderAsync cancelled/rejected');
    }
  }

  try {
    let coords = await resolveCoordinates();
    if (!coords) {
      debugLog('Trying watchFirstFix (15s)');
      coords = await watchFirstFix(15_000);
    }
    if (coords) {
      debugLog('Resolved coordinates', coords);
      return { status: 'ready', ...coords };
    }
    return {
      status: 'error',
      message: `No se pudo obtener la ubicación. ${EMULATOR_HINT}`,
    };
  } catch {
    return {
      status: 'error',
      message: `No se pudo obtener la ubicación. ${EMULATOR_HINT}`,
    };
  }
}
