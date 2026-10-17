import { Platform } from 'react-native';

/** Resolves the backend base URL without hard-coding a machine address. */
export function getApiBaseUrl(): string {
  const configured = process.env.EXPO_PUBLIC_API_URL?.trim();
  if (configured) return configured.replace(/\/+$/, '');
  // Android emulator reaches the host machine through 10.0.2.2
  if (Platform.OS === 'android') return 'http://10.0.2.2:8000';
  return 'http://127.0.0.1:8000';
}

export const API_V1 = `${getApiBaseUrl()}/api/v1`;
