import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Alert, Platform, Linking } from 'react-native';
import * as LocalAuthentication from 'expo-local-authentication';
import * as SecureStore from 'expo-secure-store';
import { SupportedLanguage, DEFAULT_LANGUAGE, TRANSLATIONS } from '../constants/languages';

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
  pin?: string;
}

export interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  language: SupportedLanguage;
  fontSize: 'small' | 'medium' | 'large' | 'extraLarge';
}

interface AuthContextType extends AuthState {
  login: (pin: string) => Promise<boolean>;
  loginWithOtp: (phone: string) => Promise<boolean>;
  verifyOtp: (otp: string) => Promise<boolean>;
  authenticateWithBiometric: () => Promise<boolean>;
  logout: () => Promise<void>;
  setLanguage: (lang: SupportedLanguage) => void;
  setFontSize: (size: 'small' | 'medium' | 'large' | 'extraLarge') => void;
  toggleBiometric: (enabled: boolean) => Promise<void>;
  toggleFaceId: (enabled: boolean) => Promise<void>;
  toggleTouchId: (enabled: boolean) => Promise<void>;
  changePin: (oldPin: string, newPin: string) => Promise<boolean>;
  t: (key: string) => string;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const STORAGE_KEYS = {
  USER: 'user_data',
  PIN: 'user_pin',
  BIOMETRIC_ENABLED: 'biometric_enabled',
  FACE_ID_ENABLED: 'face_id_enabled',
  TOUCH_ID_ENABLED: 'touch_id_enabled',
  LANGUAGE: 'app_language',
  FONT_SIZE: 'font_size',
};

const MOCK_USER: User = {
  id: '1',
  participantId: 'PT-2026-001',
  name: 'Priya Sharma',
  email: 'priya.sharma@example.com',
  phone: '+91 98765 43210',
  trialId: 'TR-AYUR-001',
  siteId: 'SITE-DEL-001',
  role: 'participant',
  language: 'en',
  fontSize: 'medium',
  biometricEnabled: false,
  faceIdEnabled: false,
  touchIdEnabled: false,
};

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
      const [userData, pin, biometricEnabled, faceIdEnabled, touchIdEnabled, language, fontSize] = await Promise.all([
        SecureStore.getItemAsync(STORAGE_KEYS.USER),
        SecureStore.getItemAsync(STORAGE_KEYS.PIN),
        SecureStore.getItemAsync(STORAGE_KEYS.BIOMETRIC_ENABLED),
        SecureStore.getItemAsync(STORAGE_KEYS.FACE_ID_ENABLED),
        SecureStore.getItemAsync(STORAGE_KEYS.TOUCH_ID_ENABLED),
        SecureStore.getItemAsync(STORAGE_KEYS.LANGUAGE),
        SecureStore.getItemAsync(STORAGE_KEYS.FONT_SIZE),
      ]);

      if (userData) {
        const user = JSON.parse(userData) as User;
        if (pin) user.pin = pin;
        user.biometricEnabled = biometricEnabled === 'true';
        user.faceIdEnabled = faceIdEnabled === 'true';
        user.touchIdEnabled = touchIdEnabled === 'true';
        
        setState({
          user,
          isAuthenticated: true,
          isLoading: false,
          language: (language as SupportedLanguage) || DEFAULT_LANGUAGE,
          fontSize: (fontSize as 'small' | 'medium' | 'large' | 'extraLarge') || 'medium',
        });
      } else {
        setState(prev => ({ ...prev, isLoading: false }));
      }
    } catch (error) {
      console.error('Failed to load auth:', error);
      setState(prev => ({ ...prev, isLoading: false }));
    }
  };

  const login = async (pin: string): Promise<boolean> => {
    try {
      if (pin === '1234' || pin === MOCK_USER.pin) {
        const user = { ...MOCK_USER, pin };
        await Promise.all([
          SecureStore.setItemAsync(STORAGE_KEYS.USER, JSON.stringify(user)),
          SecureStore.setItemAsync(STORAGE_KEYS.PIN, pin),
        ]);
        setState(prev => ({ ...prev, user, isAuthenticated: true }));
        return true;
      }
      Alert.alert(t('invalidPin'), t('tryAgain'));
      return false;
    } catch (error) {
      console.error('Login error:', error);
      Alert.alert(t('somethingWentWrong'), t('tryAgain'));
      return false;
    }
  };

  const loginWithOtp = async (phone: string): Promise<boolean> => {
    try {
      console.log(`Sending OTP to ${phone}`);
      Alert.alert(t('otpSent'), t('enterOtp'));
      return true;
    } catch (error) {
      console.error('OTP send error:', error);
      Alert.alert(t('somethingWentWrong'), t('tryAgain'));
      return false;
    }
  };

  const verifyOtp = async (otp: string): Promise<boolean> => {
    try {
      if (otp === '123456' || otp.length === 6) {
        const user = { ...MOCK_USER };
        await SecureStore.setItemAsync(STORAGE_KEYS.USER, JSON.stringify(user));
        setState(prev => ({ ...prev, user, isAuthenticated: true }));
        return true;
      }
      Alert.alert(t('invalidOtp'), t('tryAgain'));
      return false;
    } catch (error) {
      console.error('OTP verify error:', error);
      Alert.alert(t('somethingWentWrong'), t('tryAgain'));
      return false;
    }
  };

  const authenticateWithBiometric = async (): Promise<boolean> => {
    try {
      const hasHardware = await LocalAuthentication.hasHardwareAsync();
      const isEnrolled = await LocalAuthentication.isEnrolledAsync();
      
      if (!hasHardware || !isEnrolled) {
        Alert.alert(t('faceIdNotAvailable'));
        return false;
      }

      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: t('faceIdPopupMessage'),
        cancelLabel: 'Cancel',
        fallbackLabel: t('enterPin'),
        disableDeviceFallback: false,
      });

      if (result.success) {
        const user = { ...MOCK_USER };
        await SecureStore.setItemAsync(STORAGE_KEYS.USER, JSON.stringify(user));
        setState(prev => ({ ...prev, user, isAuthenticated: true }));
        return true;
      } else {
        Alert.alert(t('faceIdFailed'));
        return false;
      }
    } catch (error) {
      console.error('Biometric auth error:', error);
      Alert.alert(t('faceIdFailed'));
      return false;
    }
  };

  const logout = async () => {
    try {
      await SecureStore.deleteItemAsync(STORAGE_KEYS.USER);
      await SecureStore.deleteItemAsync(STORAGE_KEYS.PIN);
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

  const changePin = async (oldPin: string, newPin: string): Promise<boolean> => {
    try {
      if (state.user?.pin !== oldPin && oldPin !== '1234') {
        Alert.alert(t('invalidPin'));
        return false;
      }
      if (newPin.length < 4) {
        Alert.alert('PIN must be at least 4 digits');
        return false;
      }
      await SecureStore.setItemAsync(STORAGE_KEYS.PIN, newPin);
      if (state.user) {
        const updatedUser = { ...state.user, pin: newPin };
        await SecureStore.setItemAsync(STORAGE_KEYS.USER, JSON.stringify(updatedUser));
        setState(prev => ({ ...prev, user: updatedUser }));
      }
      return true;
    } catch (error) {
      console.error('Change PIN error:', error);
      Alert.alert(t('somethingWentWrong'));
      return false;
    }
  };

  return (
    <AuthContext.Provider
      value={{
        ...state,
        t,
        login,
        loginWithOtp,
        verifyOtp,
        authenticateWithBiometric,
        logout,
        setLanguage,
        setFontSize,
        toggleBiometric,
        toggleFaceId,
        toggleTouchId,
        changePin,
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