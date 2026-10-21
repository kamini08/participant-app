import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Image,
} from 'react-native';
import { useAuth } from '../context/AuthContext';
import { SUPPORTED_LANGUAGES } from '../constants/languages';

export default function LoginScreen({ navigation }: any) {
  const { login, loginWithOtp, verifyOtp, authenticateWithBiometric, t, isLoading, language, setLanguage } = useAuth();
  const [pin, setPin] = useState('');
  const [otp, setOtp] = useState('');
  const [phone, setPhone] = useState('+91 98765 43210');
  const [showOtp, setShowOtp] = useState(false);
  const [showBiometricPrompt, setShowBiometricPrompt] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [resendTimer, setResendTimer] = useState(0);
  const [isAuthenticating, setIsAuthenticating] = useState(false);

  useEffect(() => {
    if (resendTimer > 0) {
      const timer = setInterval(() => setResendTimer(prev => prev - 1), 1000);
      return () => clearInterval(timer);
    }
  }, [resendTimer]);

  const handlePinLogin = async () => {
    if (pin.length < 4) {
      Alert.alert(t('invalidPin'));
      return;
    }
    setIsAuthenticating(true);
    const success = await login(pin);
    if (success) {
      navigation.replace('MainTabs');
    }
    setIsAuthenticating(false);
  };

  const handleSendOtp = async () => {
    setIsAuthenticating(true);
    const success = await loginWithOtp(phone);
    if (success) {
      setShowOtp(true);
      setOtpSent(true);
      setResendTimer(60);
    }
    setIsAuthenticating(false);
  };

  const handleVerifyOtp = async () => {
    if (otp.length !== 6) {
      Alert.alert(t('invalidOtp'));
      return;
    }
    setIsAuthenticating(true);
    const success = await verifyOtp(otp);
    if (success) {
      navigation.replace('MainTabs');
    }
    setIsAuthenticating(false);
  };

  const handleBiometricLogin = async () => {
    setShowBiometricPrompt(true);
    setIsAuthenticating(true);
    const success = await authenticateWithBiometric();
    if (success) {
      navigation.replace('MainTabs');
    }
    setIsAuthenticating(false);
    setShowBiometricPrompt(false);
  };

  const handleResendOtp = async () => {
    if (resendTimer > 0) return;
    setResendTimer(60);
    await loginWithOtp(phone);
  };

  const handleLanguageChange = async (lang: any) => {
    await setLanguage(lang.code);
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <ActivityIndicator size="large" color="#3b82f6" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <View style={styles.header}>
            <View style={styles.logoContainer}>
              <Text style={styles.logo}>🏥</Text>
            </View>
            <Text style={styles.title}>{t('welcome')}</Text>
            <Text style={styles.subtitle}>AIIA Clinical Trial Management System</Text>
          </View>

          <View style={styles.languageSelector}>
            <Text style={styles.languageLabel}>{t('changeLanguage')}</Text>
            <View style={styles.languageOptions}>
              {SUPPORTED_LANGUAGES.map(lang => (
                <TouchableOpacity
                  key={lang.code}
                  style={[
                    styles.languageOption,
                    language === lang.code && styles.languageOptionActive,
                  ]}
                  onPress={() => handleLanguageChange(lang)}
                >
                  <Text style={[
                    styles.languageOptionText,
                    language === lang.code && styles.languageOptionTextActive,
                  ]}>
                    {lang.nativeName}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {!showOtp ? (
            <View style={styles.formContainer}>
              <Text style={styles.sectionTitle}>{t('pin')}</Text>
              <TextInput
                style={styles.input}
                placeholder={t('enterPin')}
                value={pin}
                onChangeText={setPin}
                secureTextEntry
                keyboardType="numeric"
                maxLength={6}
                autoFocus
              />

              <TouchableOpacity
                style={[styles.primaryButton, isAuthenticating && styles.buttonDisabled]}
                onPress={handlePinLogin}
                disabled={isAuthenticating}
              >
                {isAuthenticating ? (
                  <ActivityIndicator size="small" color="white" />
                ) : (
                  <Text style={styles.primaryButtonText}>{t('verifyPin')}</Text>
                )}
              </TouchableOpacity>

              <View style={styles.divider}>
                <Text style={styles.dividerText}>OR</Text>
              </View>

              <TouchableOpacity
                style={styles.secondaryButton}
                onPress={handleSendOtp}
                disabled={isAuthenticating}
              >
                <Text style={styles.secondaryButtonText}>{t('sendOtp')}</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.biometricButton}
                onPress={handleBiometricLogin}
                disabled={isAuthenticating}
              >
                <Text style={styles.biometricButtonText}>
                  {Platform.OS === 'ios' ? '🔐' : '👆'} {t('useFaceId')}
                </Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.formContainer}>
              <Text style={styles.sectionTitle}>{t('enterOtp')}</Text>
              <Text style={styles.otpInfo}>{t('otpSent')}</Text>
              <TextInput
                style={styles.input}
                placeholder={t('enterOtp')}
                value={otp}
                onChangeText={setOtp}
                keyboardType="numeric"
                maxLength={6}
                autoFocus
              />

              <TouchableOpacity
                style={[styles.primaryButton, isAuthenticating && styles.buttonDisabled]}
                onPress={handleVerifyOtp}
                disabled={isAuthenticating}
              >
                {isAuthenticating ? (
                  <ActivityIndicator size="small" color="white" />
                ) : (
                  <Text style={styles.primaryButtonText}>{t('verifyOtp')}</Text>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.resendButton}
                onPress={handleResendOtp}
                disabled={resendTimer > 0}
              >
                <Text style={[
                  styles.resendButtonText,
                  resendTimer > 0 && styles.resendButtonTextDisabled,
                ]}>
                  {resendTimer > 0 ? `${t('resendOtp')} (${resendTimer}s)` : t('resendOtp')}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.backButton}
                onPress={() => { setShowOtp(false); setOtp(''); }}
              >
                <Text style={styles.backButtonText}>{t('login')}</Text>
              </TouchableOpacity>
            </View>
          )}

          <View style={styles.footer}>
            <Text style={styles.footerText}>AIIA CTMS v1.0</Text>
            <Text style={styles.footerText}>All India Institute of Ayurveda</Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {showBiometricPrompt && (
        <View style={styles.biometricModal}>
          <View style={styles.biometricModalContent}>
            <View style={styles.biometricIcon}>🔐</View>
            <Text style={styles.biometricModalTitle}>{t('faceIdPopupTitle')}</Text>
            <Text style={styles.biometricModalMessage}>{t('faceIdPopupMessage')}</Text>
            <TouchableOpacity
              style={styles.biometricModalButton}
              onPress={() => setShowBiometricPrompt(false)}
            >
              <Text style={styles.biometricModalButtonText}>{t('enterPin')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingVertical: 40,
  },
  header: {
    alignItems: 'center',
    marginBottom: 40,
  },
  logoContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#dbeafe',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  logo: {
    fontSize: 48,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
    color: '#64748b',
  },
  languageSelector: {
    marginBottom: 32,
    padding: 16,
    backgroundColor: 'white',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  languageLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 12,
  },
  languageOptions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  languageOption: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    backgroundColor: '#f8fafc',
  },
  languageOptionActive: {
    backgroundColor: '#3b82f6',
    borderColor: '#3b82f6',
  },
  languageOptionText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
  },
  languageOptionTextActive: {
    color: 'white',
  },
  formContainer: {
    width: '100%',
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 24,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 16,
  },
  input: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: '#1e293b',
    marginBottom: 16,
    backgroundColor: '#f9fafb',
  },
  primaryButton: {
    backgroundColor: '#3b82f6',
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
    marginBottom: 12,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  primaryButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 16,
  },
  dividerText: {
    flex: 1,
    textAlign: 'center',
    color: '#9ca3af',
    fontSize: 14,
  },
  secondaryButton: {
    borderWidth: 1,
    borderColor: '#3b82f6',
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
    marginBottom: 12,
  },
  secondaryButtonText: {
    color: '#3b82f6',
    fontSize: 16,
    fontWeight: '600',
  },
  biometricButton: {
    backgroundColor: '#f3f4f6',
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
  },
  biometricButtonText: {
    color: '#374151',
    fontSize: 16,
    fontWeight: '500',
  },
  otpInfo: {
    fontSize: 13,
    color: '#6b7280',
    marginBottom: 16,
    lineHeight: 20,
  },
  resendButton: {
    paddingVertical: 12,
    alignItems: 'center',
  },
  resendButtonText: {
    color: '#3b82f6',
    fontSize: 14,
    fontWeight: '500',
  },
  resendButtonTextDisabled: {
    color: '#9ca3af',
  },
  backButton: {
    paddingVertical: 12,
    alignItems: 'center',
  },
  backButtonText: {
    color: '#6b7280',
    fontSize: 14,
    fontWeight: '500',
  },
  footer: {
    alignItems: 'center',
    paddingTop: 32,
    paddingBottom: 16,
  },
  footerText: {
    fontSize: 12,
    color: '#9ca3af',
  },
  biometricModal: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  biometricModalContent: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 32,
    marginHorizontal: 32,
    alignItems: 'center',
  },
  biometricIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  biometricModalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: 8,
  },
  biometricModalMessage: {
    fontSize: 16,
    color: '#6b7280',
    textAlign: 'center',
    marginBottom: 24,
  },
  biometricModalButton: {
    backgroundColor: '#3b82f6',
    borderRadius: 10,
    paddingHorizontal: 32,
    paddingVertical: 12,
  },
  biometricModalButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
});