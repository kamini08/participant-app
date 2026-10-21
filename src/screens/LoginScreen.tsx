import React, { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SUPPORTED_LANGUAGES } from '../constants/languages';
import { useAuth } from '../context/AuthContext';

export default function LoginScreen() {
  const { language, login, setLanguage, t } = useAuth();
  const [participantId, setParticipantId] = useState('');
  const [pin, setPin] = useState('');
  const [isAuthenticating, setIsAuthenticating] = useState(false);

  const handleLogin = async () => {
    if (!participantId.trim() || pin.length !== 4) return;
    setIsAuthenticating(true);
    await login(participantId, pin);
    setIsAuthenticating(false);
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
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
              {SUPPORTED_LANGUAGES.map(option => (
                <TouchableOpacity
                  key={option.code}
                  style={[styles.languageOption, language === option.code && styles.languageOptionActive]}
                  onPress={() => setLanguage(option.code)}
                >
                  <Text style={[
                    styles.languageOptionText,
                    language === option.code && styles.languageOptionTextActive,
                  ]}>
                    {option.nativeName}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View style={styles.formContainer}>
            <Text style={styles.sectionTitle}>Participant sign in</Text>
            <Text style={styles.helpText}>
              Use the participant code and PIN provided by your study team.
            </Text>
            <TextInput
              style={styles.input}
              placeholder="Participant code"
              value={participantId}
              onChangeText={setParticipantId}
              autoCapitalize="characters"
              autoCorrect={false}
              accessibilityLabel="Participant code"
            />
            <TextInput
              style={styles.input}
              placeholder={t('enterPin')}
              value={pin}
              onChangeText={setPin}
              secureTextEntry
              keyboardType="numeric"
              maxLength={4}
              accessibilityLabel={t('enterPin')}
            />
            <TouchableOpacity
              accessibilityRole="button"
              style={[styles.primaryButton, isAuthenticating && styles.buttonDisabled]}
              onPress={handleLogin}
              disabled={isAuthenticating || !participantId.trim() || pin.length !== 4}
            >
              {isAuthenticating ? (
                <ActivityIndicator size="small" color="#ffffff" />
              ) : (
                <Text style={styles.primaryButtonText}>Sign in securely</Text>
              )}
            </TouchableOpacity>
          </View>

          <View style={styles.footer}>
            <Text style={styles.footerText}>AIIA CTMS · Participant portal</Text>
            <Text style={styles.footerText}>All India Institute of Ayurveda</Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f4f7fb',
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingVertical: 32,
  },
  header: {
    alignItems: 'center',
    marginBottom: 28,
  },
  logoContainer: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: '#e0f2ed',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  logo: {
    fontSize: 38,
  },
  title: {
    fontSize: 26,
    fontWeight: '700',
    color: '#17324d',
    marginBottom: 4,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 15,
    color: '#64748b',
    textAlign: 'center',
  },
  languageSelector: {
    marginBottom: 18,
    padding: 16,
    backgroundColor: '#ffffff',
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
    paddingHorizontal: 13,
    paddingVertical: 9,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    backgroundColor: '#f8fafc',
  },
  languageOptionActive: {
    backgroundColor: '#16836b',
    borderColor: '#16836b',
  },
  languageOptionText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
  },
  languageOptionTextActive: {
    color: '#ffffff',
  },
  formContainer: {
    width: '100%',
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 22,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  sectionTitle: {
    fontSize: 19,
    fontWeight: '700',
    color: '#17324d',
    marginBottom: 7,
  },
  helpText: {
    color: '#64748b',
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 18,
  },
  input: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 10,
    paddingHorizontal: 15,
    paddingVertical: 14,
    fontSize: 16,
    color: '#1e293b',
    marginBottom: 13,
    backgroundColor: '#f9fafb',
  },
  primaryButton: {
    backgroundColor: '#16836b',
    borderRadius: 10,
    paddingVertical: 15,
    alignItems: 'center',
    marginTop: 4,
  },
  buttonDisabled: {
    opacity: 0.55,
  },
  primaryButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
  },
  footer: {
    alignItems: 'center',
    paddingTop: 24,
  },
  footerText: {
    fontSize: 12,
    color: '#94a3b8',
    marginBottom: 3,
  },
});
