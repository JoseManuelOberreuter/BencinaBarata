import AsyncStorage from '@react-native-async-storage/async-storage';

export async function getStoredValue(primaryKey: string, legacyKey?: string): Promise<string | null> {
  const value = await AsyncStorage.getItem(primaryKey);
  if (value != null || !legacyKey) return value;

  const legacyValue = await AsyncStorage.getItem(legacyKey);
  if (legacyValue == null) return null;

  await AsyncStorage.setItem(primaryKey, legacyValue);
  await AsyncStorage.removeItem(legacyKey);
  return legacyValue;
}

export async function setStoredValue(
  primaryKey: string,
  value: string,
  legacyKey?: string
): Promise<void> {
  await AsyncStorage.setItem(primaryKey, value);

  if (legacyKey && legacyKey !== primaryKey) {
    await AsyncStorage.removeItem(legacyKey);
  }
}
