import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Linking,
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

export default function EmergencyReportScreen() {
  const [details, setDetails] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const callEmergencyServices = async () => {
    try {
      await Linking.openURL('tel:112');
    } catch (error) {
      console.error('Could not open the phone dialer for emergency services:', error);
      Alert.alert('Unable to start a call', 'Please call 112 or your local emergency number directly.');
    }
  };

  const submitReport = async () => {
    const description = details.trim();
    if (!description) {
      Alert.alert('Describe what happened', 'Add a short description so your study team can follow up.');
      return;
    }

    setSubmitting(true);
    try {
      await apiRequest('/api/participant-app/side-effects', {
        method: 'POST',
        body: { reports: [], urgentDetails: description },
      });
      setDetails('');
      Alert.alert(
        'Report sent to your study team',
        'Your coordinator and study doctor have been notified in the study system. This report does not contact emergency services.'
      );
    } catch (error) {
      Alert.alert('Could not send your report', error instanceof Error ? error.message : 'Please try again.');
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
          <View accessibilityRole="alert" style={styles.emergencyNotice}>
            <Text style={styles.noticeTitle}>Need immediate medical help?</Text>
            <Text style={styles.noticeText}>
              Do not wait for a reply in this app. Call emergency services now or go to the nearest emergency department.
            </Text>
            <TouchableOpacity
              accessibilityRole="button"
              onPress={() => void callEmergencyServices()}
              style={styles.callButton}
            >
              <Text style={styles.callButtonText}>Call 112</Text>
              <Text style={styles.callButtonHint}>India emergency number · or your local number</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.header}>
            <Text style={styles.title}>Report an urgent concern</Text>
            <Text style={styles.subtitle}>
              Send a message to your study coordinator and study doctor for follow-up.
            </Text>
          </View>

          <View style={styles.formCard}>
            <Text style={styles.label}>What is happening?</Text>
            <TextInput
              accessibilityLabel="Describe your urgent concern"
              accessibilityHint="This report is sent to your study team and does not contact emergency services."
              style={styles.input}
              placeholder="Describe your concern and when it started"
              placeholderTextColor="#82909d"
              value={details}
              onChangeText={setDetails}
              maxLength={4000}
              multiline
              textAlignVertical="top"
            />
            <Text style={styles.helperText}>
              Your report is sent to the study team through the study system. It is not monitored as an emergency hotline.
            </Text>
            <TouchableOpacity
              accessibilityRole="button"
              onPress={() => void submitReport()}
              disabled={submitting}
              style={[styles.submitButton, submitting && styles.submitDisabled]}
            >
              {submitting ? (
                <ActivityIndicator color="#ffffff" />
              ) : (
                <Text style={styles.submitText}>Send urgent report</Text>
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
    backgroundColor: '#f7f8fa',
  },
  keyboardView: {
    flex: 1,
  },
  content: {
    padding: 18,
    paddingBottom: 28,
  },
  emergencyNotice: {
    backgroundColor: '#fff4f2',
    borderColor: '#c53e36',
    borderWidth: 2,
    borderRadius: 16,
    padding: 18,
    marginBottom: 22,
  },
  noticeTitle: {
    color: '#8e211d',
    fontSize: 19,
    fontWeight: '800',
    marginBottom: 7,
  },
  noticeText: {
    color: '#672d2b',
    fontSize: 15,
    lineHeight: 22,
  },
  callButton: {
    minHeight: 58,
    marginTop: 16,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: '#b42318',
    alignItems: 'center',
    justifyContent: 'center',
  },
  callButtonText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '800',
  },
  callButtonHint: {
    color: '#ffe2df',
    fontSize: 12,
    marginTop: 2,
  },
  header: {
    marginBottom: 18,
  },
  title: {
    color: '#17324d',
    fontSize: 25,
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
    borderRadius: 16,
    padding: 18,
  },
  label: {
    color: '#25384b',
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 9,
  },
  input: {
    minHeight: 138,
    borderColor: '#d8e0e7',
    borderWidth: 1,
    borderRadius: 12,
    padding: 13,
    color: '#1e293b',
    fontSize: 16,
    backgroundColor: '#fbfcfd',
  },
  helperText: {
    color: '#64748b',
    fontSize: 13,
    lineHeight: 19,
    marginTop: 10,
  },
  submitButton: {
    minHeight: 52,
    marginTop: 20,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#b42318',
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
