import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { apiRequest } from '../services/api';

type Severity = 'Mild' | 'Moderate' | 'Severe';

const severityValue: Record<Severity, number> = {
  Mild: 1,
  Moderate: 3,
  Severe: 5,
};

export default function SymptomTrackerScreen() {
  const [description, setDescription] = useState('');
  const [severity, setSeverity] = useState<Severity | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const submitSymptom = async () => {
    const symptom = description.trim();
    if (!symptom || !severity) {
      Alert.alert('A little more information', 'Please describe your symptom and choose a severity.');
      return;
    }

    setSubmitting(true);
    try {
      if (severity === 'Severe') {
        await apiRequest('/api/participant-app/side-effects', {
          method: 'POST',
          body: { reports: [], urgentDetails: symptom },
        });
        Alert.alert(
          'Symptom submitted',
          'Thank you. Your coordinator has been notified of this severe symptom.'
        );
      } else {
        await apiRequest('/api/participant-app/side-effects', {
          method: 'POST',
          body: { reports: [{ term: symptom, severity: severityValue[severity] }] },
        });
        Alert.alert('Symptom submitted', 'Thank you for sharing how you are feeling.');
      }
      setDescription('');
      setSeverity(null);
    } catch (error) {
      Alert.alert('Could not submit symptom', error instanceof Error ? error.message : 'Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View accessibilityRole="alert" style={styles.disclaimer}>
            <Text style={styles.disclaimerTitle}>Important</Text>
            <Text style={styles.disclaimerText}>
              This is for non-urgent symptoms only. If you are having a medical emergency, please contact your doctor immediately.
            </Text>
          </View>

          <View style={styles.header}>
            <Text style={styles.title}>Symptom tracker</Text>
            <Text style={styles.subtitle}>Let your study team know how you are feeling.</Text>
          </View>

          <View style={styles.formCard}>
            <Text style={styles.label}>Symptom Description</Text>
            <TextInput
              accessibilityLabel="Symptom Description"
              style={styles.input}
              placeholder="Tell us what you are experiencing"
              placeholderTextColor="#82909d"
              value={description}
              onChangeText={setDescription}
              maxLength={4000}
              multiline
              textAlignVertical="top"
            />

            <Text style={[styles.label, styles.severityHeading]}>Severity</Text>
            <View style={styles.severityChoices}>
              {(['Mild', 'Moderate', 'Severe'] as const).map(option => {
                const selected = severity === option;
                return (
                  <TouchableOpacity
                    key={option}
                    accessibilityRole="button"
                    accessibilityState={{ selected }}
                    onPress={() => setSeverity(option)}
                    style={[
                      styles.severityButton,
                      selected && styles.severitySelected,
                      option === 'Severe' && selected && styles.severeSelected,
                    ]}
                  >
                    <Text
                      style={[
                        styles.severityText,
                        selected && styles.severityTextSelected,
                        option === 'Severe' && selected && styles.severeTextSelected,
                      ]}
                    >
                      {option}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <TouchableOpacity
              accessibilityRole="button"
              onPress={submitSymptom}
              disabled={submitting}
              style={[styles.submitButton, submitting && styles.submitDisabled]}
            >
              {submitting ? (
                <ActivityIndicator color="#ffffff" />
              ) : (
                <Text style={styles.submitText}>Submit Symptom</Text>
              )}
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f8f7',
  },
  keyboardView: {
    flex: 1,
  },
  content: {
    padding: 18,
    paddingBottom: 28,
  },
  disclaimer: {
    backgroundColor: '#fff8f7',
    borderColor: '#c53e36',
    borderWidth: 2,
    borderRadius: 14,
    padding: 16,
    marginBottom: 22,
  },
  disclaimerTitle: {
    color: '#9f2d28',
    fontSize: 15,
    fontWeight: '800',
    marginBottom: 5,
  },
  disclaimerText: {
    color: '#672d2b',
    fontSize: 14,
    lineHeight: 21,
  },
  header: {
    marginBottom: 18,
  },
  title: {
    color: '#17324d',
    fontSize: 26,
    fontWeight: '800',
  },
  subtitle: {
    color: '#64748b',
    fontSize: 15,
    lineHeight: 22,
    marginTop: 5,
  },
  formCard: {
    backgroundColor: '#ffffff',
    borderColor: '#e2e8f0',
    borderWidth: 1,
    borderRadius: 18,
    padding: 18,
  },
  label: {
    color: '#25384b',
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 9,
  },
  input: {
    minHeight: 132,
    borderColor: '#d8e0e7',
    borderWidth: 1,
    borderRadius: 12,
    padding: 13,
    color: '#1e293b',
    fontSize: 16,
    backgroundColor: '#fbfcfd',
  },
  severityHeading: {
    marginTop: 22,
  },
  severityChoices: {
    flexDirection: 'row',
    gap: 9,
  },
  severityButton: {
    flex: 1,
    minHeight: 48,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 11,
    borderWidth: 1,
    borderColor: '#d8e0e7',
    backgroundColor: '#ffffff',
  },
  severitySelected: {
    borderColor: '#16836b',
    backgroundColor: '#e9f5f1',
  },
  severeSelected: {
    borderColor: '#c53e36',
    backgroundColor: '#fff1ef',
  },
  severityText: {
    color: '#526170',
    fontSize: 14,
    fontWeight: '700',
  },
  severityTextSelected: {
    color: '#16705d',
  },
  severeTextSelected: {
    color: '#9f2d28',
  },
  submitButton: {
    minHeight: 52,
    marginTop: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#16836b',
  },
  submitDisabled: {
    opacity: 0.65,
  },
  submitText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '800',
  },
});
