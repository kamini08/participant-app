import * as SecureStore from 'expo-secure-store';

const ACCESS_TOKEN_KEY = 'participant_access_token';
const REFRESH_TOKEN_KEY = 'participant_refresh_token';
const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL?.trim().replace(/\/+$/, '');

interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

interface ApiOptions {
  method?: string;
  body?: unknown;
  auth?: boolean;
}

export class ApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

function getApiUrl(path: string) {
  if (!API_BASE_URL) {
    throw new Error('Set EXPO_PUBLIC_API_URL in participants-app/.env to your computer’s network address and port 3001.');
  }
  return `${API_BASE_URL}${path.startsWith('/') ? path : `/${path}`}`;
}

async function saveTokens(tokens: AuthTokens) {
  await Promise.all([
    SecureStore.setItemAsync(ACCESS_TOKEN_KEY, tokens.accessToken),
    SecureStore.setItemAsync(REFRESH_TOKEN_KEY, tokens.refreshToken),
  ]);
}

export async function clearAuthTokens() {
  await Promise.all([
    SecureStore.deleteItemAsync(ACCESS_TOKEN_KEY),
    SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY),
  ]);
}

export async function hasAuthTokens() {
  return Boolean(await SecureStore.getItemAsync(ACCESS_TOKEN_KEY));
}

async function sendRequest<T>(path: string, options: ApiOptions, token?: string): Promise<T> {
  const headers = new Headers();
  if (options.body !== undefined) headers.set('Content-Type', 'application/json');
  if (token) headers.set('Authorization', `Bearer ${token}`);

  const response = await fetch(getApiUrl(path), {
    method: options.method || 'GET',
    headers,
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
  });

  if (response.status === 204) return undefined as T;

  const payload = await response.json() as { error?: string; message?: string } & T;
  if (!response.ok) {
    throw new ApiError(payload.error || payload.message || 'The request could not be completed.', response.status);
  }
  return payload;
}

async function refreshAccessToken() {
  const refreshToken = await SecureStore.getItemAsync(REFRESH_TOKEN_KEY);
  if (!refreshToken) return null;

  try {
    const tokens = await sendRequest<AuthTokens>('/api/auth/refresh', {
      method: 'POST',
      body: { refreshToken },
      auth: false,
    });
    await saveTokens(tokens);
    return tokens.accessToken;
  } catch (error) {
    if (error instanceof ApiError && (error.status === 401 || error.status === 403)) {
      await clearAuthTokens();
      return null;
    }
    throw error;
  }
}

export async function apiRequest<T>(path: string, options: ApiOptions = {}): Promise<T> {
  const authenticated = options.auth !== false;
  const accessToken = authenticated ? await SecureStore.getItemAsync(ACCESS_TOKEN_KEY) : null;
  const result = await sendRequest<T>(path, options, accessToken || undefined).catch(async error => {
    if (!authenticated || !(error instanceof ApiError) || error.status !== 401 || path === '/api/auth/refresh') {
      throw error;
    }

    const refreshedToken = await refreshAccessToken();
    if (!refreshedToken) throw error;
    return sendRequest<T>(path, options, refreshedToken);
  });

  return result;
}

export async function storeAuthTokens(tokens: AuthTokens) {
  await saveTokens(tokens);
}
