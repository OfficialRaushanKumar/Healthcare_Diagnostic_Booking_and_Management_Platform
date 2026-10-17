import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

/**
 * Tokens go to the OS keychain/keystore (Expo SecureStore) on devices.
 * SecureStore does not exist on the web, so the browser build falls back to
 * sessionStorage (cleared when the tab closes). Do not ship web tokens in localStorage.
 */
const web = Platform.OS === 'web';

export async function setItem(key: string, value: string): Promise<void> {
  if (web) { try { sessionStorage.setItem(key, value); } catch { /* storage blocked */ } return; }
  await SecureStore.setItemAsync(key, value);
}
export async function getItem(key: string): Promise<string | null> {
  if (web) { try { return sessionStorage.getItem(key); } catch { return null; } }
  return SecureStore.getItemAsync(key);
}
export async function deleteItem(key: string): Promise<void> {
  if (web) { try { sessionStorage.removeItem(key); } catch { /* noop */ } return; }
  await SecureStore.deleteItemAsync(key);
}
