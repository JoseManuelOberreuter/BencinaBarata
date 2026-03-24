import * as Location from 'expo-location';

export type LocationResult =
  | { status: 'ready'; latitude: number; longitude: number }
  | { status: 'error'; message: string };

export async function getCurrentLocation(): Promise<LocationResult> {
  const perm = await Location.requestForegroundPermissionsAsync();
  if (perm.status !== 'granted') {
    return {
      status: 'error',
      message: 'No se otorgó permiso de ubicación. Actívalo en ajustes para ver distancias.',
    };
  }

  try {
    const pos = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.Balanced,
    });
    return {
      status: 'ready',
      latitude: pos.coords.latitude,
      longitude: pos.coords.longitude,
    };
  } catch {
    return {
      status: 'error',
      message: 'No se pudo obtener la ubicación. Comprueba el GPS y vuelve a intentar.',
    };
  }
}
