import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Alert } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { SupportedLanguage, DEFAULT_LANGUAGE, TRANSLATIONS } from '../constants/languages';
import { apiRequest, clearAuthTokens, hasAuthTokens, storeAuthTokens } from '../services/api';

export interface User {
  id: string;
  participantId: string;
  name: string;
  email: string;
  phone: string;
  trialId: string;
  siteId: string;
  role: 'participant';
  language: SupportedLanguage;
  fontSize: 'small' | 'medium' | 'large' | 'extraLarge';
  biometricEnabled: boolean;
  faceIdEnabled: boolean;
  touchIdEnabled: boolean;
}

export interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  language: SupportedLanguage;
  fontSize: 'small' | 'medium' | 'large' | 'extraLarge';
}

interface AuthContextType extends AuthState {
  login: (participantId: string, pin: string) => Promise<boolean>;
  logout: () => Promise<void>;
  setLanguage: (lang: SupportedLanguage) => void;
  setFontSize: (size: 'small' | 'medium' | 'large' | 'extraLarge') => void;
  toggleBiometric: (enabled: boolean) => Promise<void>;
  toggleFaceId: (enabled: boolean) => Promise<void>;
  toggleTouchId: (enabled: boolean) => Promise<void>;
  t: (key: string) => string;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const STORAGE_KEYS = {
  USER: 'user_data',
  LEGACY_PIN: 'user_pin',
  BIOMETRIC_ENABLED: 'biometric_enabled',
  FACE_ID_ENABLED: 'face_id_enabled',
  TOUCH_ID_ENABLED: 'touch_id_enabled',
  LANGUAGE: 'app_language',
  FONT_SIZE: 'font_size',
};

interface ParticipantProfile {
  id: string;
  participantId: string;
  trialId: string;
  siteId: string;
  user: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    phone?: string | null;
    language: string;
    fontSize: string;
  };
}

function mapParticipant(profile: ParticipantProfile, preferences: {
  language: SupportedLanguage;
  fontSize: User['fontSize'];
  biometricEnabled: boolean;
  faceIdEnabled: boolean;
  touchIdEnabled: boolean;
}): User {
  return {
    id: profile.user.id,
    participantId: profile.participantId,
    name: `${profile.user.firstName} ${profile.user.lastName}`.trim(),
    email: profile.user.email,
    phone: profile.user.phone || '',
    trialId: profile.trialId,
    siteId: profile.siteId,
    role: 'participant',
    ...preferences,
  };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({
    user: null,
    isAuthenticated: false,
    isLoading: true,
    language: DEFAULT_LANGUAGE,
    fontSize: 'medium',
  });

  const t = (key: string) => TRANSLATIONS[state.language]?.[key] || TRANSLATIONS[DEFAULT_LANGUAGE][key] || key;

  useEffect(() => {
    loadStoredAuth();
  }, []);

  const loadStoredAuth = async () => {
    try {
      await SecureStore.deleteItemAsync(STORAGE_KEYS.LEGACY_PIN);
      const [hasToken, biometricEnabled, faceIdEnabled, touchIdEnabled, language, fontSize] = await Promise.all([
        hasAuthTokens(),
        SecureStore.getItemAsync(STORAGE_KEYS.BIOMETRIC_ENABLED),
        SecureStore.getItemAsync(STORAGE_KEYS.FACE_ID_ENABLED),
        SecureStore.getItemAsync(STORAGE_KEYS.TOUCH_ID_ENABLED),
        SecureStore.getItemAsync(STORAGE_KEYS.LANGUAGE),
        SecureStore.getItemAsync(STORAGE_KEYS.FONT_SIZE),
      ]);

      const selectedLanguage = (language as SupportedLanguage) || DEFAULT_LANGUAGE;
      const selectedFontSize = (fontSize as User['fontSize']) || 'medium';
      const preferences = {
        language: selectedLanguage,
        fontSize: selectedFontSize,
        biometricEnabled: biometricEnabled === 'true',
        faceIdEnabled: faceIdEnabled === 'true',
        touchIdEnabled: touchIdEnabled === 'true',
      };

      if (hasToken) {
        const { participant } = await apiRequest<{ participant: ParticipantProfile }>('/api/participant-app/me');
        const user = mapParticipant(participant, preferences);
        await SecureStore.setItemAsync(STORAGE_KEYS.USER, JSON.stringify(user));
        setState({
          user,
          isAuthenticated: true,
          isLoading: false,
          language: selectedLanguage,
          fontSize: selectedFontSize,
        });
      } else {
        await SecureStore.deleteItemAsync(STORAGE_KEYS.USER);
        setState({ user: null, isAuthenticated: false, isLoading: false, language: selectedLanguage, fontSize: selectedFontSize });
      }
    } catch (error) {
      console.error('Failed to load auth:', error);
      Alert.alert('Unable to connect', error instanceof Error ? error.message : 'Please check the API connection and try again.');
      setState(prev => ({ ...prev, isLoading: false }));
    }
  };

  const login = async (participantId: string, pin: string): Promise<boolean> => {
    try {
      const session = await apiRequest<{
        user: { role: string };
        accessToken: string;
        refreshToken: string;
      }>('/api/auth/pin-login', {
        method: 'POST',
        auth: false,
        body: { participantId: participantId.trim(), pin },
      });

      if (session.user.role !== 'PARTICIPANT') {
        throw new Error('This account is not registered as a participant.');
      }

      await storeAuthTokens(session);
      const { participant } = await apiRequest<{ participant: ParticipantProfile }>('/api/participant-app/me');
      const user = mapParticipant(participant, {
        language: state.language,
        fontSize: state.fontSize,
        biometricEnabled: false,
        faceIdEnabled: false,
        touchIdEnabled: false,
      });
      await SecureStore.setItemAsync(STORAGE_KEYS.USER, JSON.stringify(user));
      setState(prev => ({ ...prev, user, isAuthenticated: true }));
      return true;
    } catch (error) {
      console.error('Login error:', error);
      await clearAuthTokens();
      Alert.alert('Unable to sign in', error instanceof Error ? error.message : t('tryAgain'));
      return false;
    }
  };

  const logout = async () => {
    try {
      await clearAuthTokens();
      await SecureStore.deleteItemAsync(STORAGE_KEYS.USER);
      setState(prev => ({ ...prev, user: null, isAuthenticated: false }));
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const setLanguage = async (lang: SupportedLanguage) => {
    try {
      await SecureStore.setItemAsync(STORAGE_KEYS.LANGUAGE, lang);
      setState(prev => ({ ...prev, language: lang }));
      if (state.user) {
        const updatedUser = { ...state.user, language: lang };
        await SecureStore.setItemAsync(STORAGE_KEYS.USER, JSON.stringify(updatedUser));
        setState(prev => ({ ...prev, user: updatedUser }));
      }
    } catch (error) {
      console.error('Set language error:', error);
    }
  };

  const setFontSize = async (size: 'small' | 'medium' | 'large' | 'extraLarge') => {
    try {
      await SecureStore.setItemAsync(STORAGE_KEYS.FONT_SIZE, size);
      setState(prev => ({ ...prev, fontSize: size }));
      if (state.user) {
        const updatedUser = { ...state.user, fontSize: size };
        await SecureStore.setItemAsync(STORAGE_KEYS.USER, JSON.stringify(updatedUser));
        setState(prev => ({ ...prev, user: updatedUser }));
      }
    } catch (error) {
      console.error('Set font size error:', error);
    }
  };

  const toggleBiometric = async (enabled: boolean) => {
    try {
      await SecureStore.setItemAsync(STORAGE_KEYS.BIOMETRIC_ENABLED, enabled.toString());
      if (state.user) {
        const updatedUser = { ...state.user, biometricEnabled: enabled };
        await SecureStore.setItemAsync(STORAGE_KEYS.USER, JSON.stringify(updatedUser));
        setState(prev => ({ ...prev, user: updatedUser }));
      }
    } catch (error) {
      console.error('Toggle biometric error:', error);
    }
  };

  const toggleFaceId = async (enabled: boolean) => {
    try {
      await SecureStore.setItemAsync(STORAGE_KEYS.FACE_ID_ENABLED, enabled.toString());
      if (state.user) {
        const updatedUser = { ...state.user, faceIdEnabled: enabled };
        await SecureStore.setItemAsync(STORAGE_KEYS.USER, JSON.stringify(updatedUser));
        setState(prev => ({ ...prev, user: updatedUser }));
      }
    } catch (error) {
      console.error('Toggle Face ID error:', error);
    }
  };

  const toggleTouchId = async (enabled: boolean) => {
    try {
      await SecureStore.setItemAsync(STORAGE_KEYS.TOUCH_ID_ENABLED, enabled.toString());
      if (state.user) {
        const updatedUser = { ...state.user, touchIdEnabled: enabled };
        await SecureStore.setItemAsync(STORAGE_KEYS.USER, JSON.stringify(updatedUser));
        setState(prev => ({ ...prev, user: updatedUser }));
      }
    } catch (error) {
      console.error('Toggle Touch ID error:', error);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        ...state,
        t,
        login,
        logout,
        setLanguage,
        setFontSize,
        toggleBiometric,
        toggleFaceId,
        toggleTouchId,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}