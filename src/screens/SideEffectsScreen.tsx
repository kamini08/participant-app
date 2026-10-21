import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  SafeAreaView,
  StyleSheet,
  TouchableOpacity,
  Alert,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useAuth } from '../context/AuthContext';

interface SideEffect {
  id: string;
  name: string;
  label: string;
  selected: boolean;
  severity: 1 | 2 | 3 | 4 | 5;
}

export default function SideEffectsScreen() {
  const { t } = useAuth();
  const [sideEffects, setSideEffects] = useState<SideEffect[]>([
    { id: '1', name: 'nausea', label: 'Nausea', selected: false, severity: 1 },
    { id: '2', name: 'vomiting', label: 'Vomiting', selected: false, severity: 1 },
    { id: '3', name: 'diarrhea', label: 'Diarrhea', selected: false, severity: 1 },
    { id: '4', name: 'headache', label: 'Headache', selected: false, severity: 1 },
    { id: '5', name: 'fatigue', label: 'Fatigue', selected: false, severity: 1 },
    { id: '6', name: 'dizziness', label: 'Dizziness', selected: false, severity: 1 },
    { id: '7', name: 'lossOfAppetite', label: 'Loss of Appetite', selected: false, severity: 1 },
    { id: '8', name: 'constipation', label: 'Constipation', selected: false, severity: 1 },
  ]);
  const [otherText, setOtherText] = useState('');
  const [otherSelected, setOtherSelected] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [showUrgentModal, setShowUrgentModal] = useState(false);
  const [urgentText, setUrgentText] = useState('');

  const toggleSideEffect = (id: string) => {
    setSideEffects(prev => prev.map(se => 
      se.id === id ? { ...se, selected: !se.selected, severity: !se.selected ? 1 : se.severity } : se
    ));
  };

  const setSeverity = (id: string, severity: 1 | 2 | 3 | 4 | 5) => {
    setSideEffects(prev => prev.map(se => 
      se.id === id ? { ...se, severity, selected: true } : se
    ));
  };

  const handleSubmit = async () => {
    const selected = sideEffects.filter(se => se.selected);
    if (!selected.length && !otherSelected) {
      Alert.alert(t('selectSideEffects'));
      return;
    }
    setSubmitting(true);
    await new Promise(resolve => setTimeout(resolve, 1000));
    Alert.alert('Success', 'Side effects reported successfully');
    setSubmitting(false);
    setSideEffects(prev => prev.map(se => ({ ...se, selected: false, severity: 1 })));
    setOtherText('');
    setOtherSelected(false);
  };

  const handleUrgentConcern = () => {
    setShowUrgentModal(true);
  };

  const handleSubmitUrgent = async () => {
    if (!urgentText.trim()) {
      Alert.alert('Please describe your urgent concern');
      return;
    }
    setSubmitting(true);
    await new Promise(resolve => setTimeout(resolve, 1000));
    Alert.alert('Urgent Concern Reported', 'Your concern has been escalated to the study team immediately');
    setShowUrgentModal(false);
    setUrgentText('');
    setSubmitting(false);
  };

  const getSeverityLabel = (severity: number) => {
    if (severity === 1) return t('mild');
    if (severity <= 3) return t('moderate');
    return t('severe');
  };

  const getSeverityColor = (severity: number) => {
    if (severity === 1) return '#10b981';
    if (severity <= 3) return '#f59e0b';
    return '#ef4444';
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <View style={styles.header}>
            <Text style={styles.title}>{t('sideEffects')}</Text>
            <Text style={styles.subtitle}>{t('selectSideEffects')}</Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t('commonSideEffects')}</Text>
            <View style={styles.sideEffectsGrid}>
              {sideEffects.map(se => (
                <TouchableOpacity
                  key={se.id}
                  style={[
                    styles.sideEffectCard,
                    se.selected && styles.sideEffectCardSelected,
                  ]}
                  onPress={() => toggleSideEffect(se.id)}
                >
                  <View style={styles.sideEffectHeader}>
                    <View style={[
                      styles.checkbox,
                      se.selected && styles.checkboxChecked,
                    ]}>
                      {se.selected && <Text style={styles.checkmark}>✓</Text>}
                    </View>
                    <Text style={[
                      styles.sideEffectName,
                      se.selected && styles.sideEffectNameSelected,
                    ]}>
                      {t(se.name as keyof typeof t)}
                    </Text>
                  </View>
                  {se.selected && (
                    <View style={styles.severitySelector}>
                      <Text style={styles.severityLabel}>{t('severity')}</Text>
                      <View style={styles.severityButtons}>
                        {[1, 2, 3, 4, 5].map(level => (
                          <TouchableOpacity
                            key={level}
                            style={[
                              styles.severityButton,
                              se.severity === level && styles.severityButtonActive,
                              { borderColor: getSeverityColor(level) }
                            ]}
                            onPress={() => setSeverity(se.id, level as 1|2|3|4|5)}
                          >
                            <Text style={[
                              styles.severityButtonText,
                              se.severity === level && styles.severityButtonTextActive,
                              { color: se.severity === level ? getSeverityColor(level) : '#6b7280' }
                            ]}>
                              {level}
                            </Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                      <Text style={[
                        styles.severityDescription,
                        { color: getSeverityColor(se.severity) }
                      ]}>
                        {getSeverityLabel(se.severity)}
                      </Text>
                    </View>
                  )}
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View style={styles.section}>
            <TouchableOpacity
              style={[
                styles.otherCard,
                otherSelected && styles.otherCardSelected,
              ]}
              onPress={() => setOtherSelected(!otherSelected)}
            >
              <View style={styles.otherCardHeader}>
                <View style={[
                  styles.checkbox,
                  otherSelected && styles.checkboxChecked,
                ]}>
                  {otherSelected && <Text style={styles.checkmark}>✓</Text>}
                </View>
                <Text style={[
                  styles.sideEffectName,
                  otherSelected && styles.sideEffectNameSelected,
                ]}>
                  {t('other')}
                </Text>
              </View>
              {otherSelected && (
                <TextInput
                  style={styles.otherInput}
                  placeholder="Describe other side effect..."
                  value={otherText}
                  onChangeText={setOtherText}
                  multiline
                  numberOfLines={3}
                />
              )}
            </TouchableOpacity>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t('urgentConcern')}</Text>
            <TouchableOpacity style={styles.urgentButton} onPress={handleUrgentConcern}>
              <Text style={styles.urgentButtonText}>🚨 {t('urgentConcern')}</Text>
            </TouchableOpacity>
            <Text style={styles.urgentNote}>
              Use this for immediate medical concerns that require urgent attention from the study team.
            </Text>
          </View>

          <TouchableOpacity
            style={[styles.submitButton, submitting && styles.buttonDisabled]}
            onPress={handleSubmit}
            disabled={submitting}
          >
            {submitting ? (
              <ActivityIndicator size="small" color="white" />
            ) : (
              <Text style={styles.submitButtonText}>{t('reportSideEffect')}</Text>
            )}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>

      {showUrgentModal && (
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>🚨 {t('urgentConcern')}</Text>
              <TouchableOpacity onPress={() => { setShowUrgentModal(false); setUrgentText(''); }}>
                <Text style={styles.modalClose}>✕</Text>
              </TouchableOpacity>
            </View>
            <Text style={styles.modalMessage}>
              Describe your urgent medical concern. This will be immediately escalated to the study team.
            </Text>
            <TextInput
              style={styles.modalInput}
              placeholder="Describe your concern..."
              value={urgentText}
              onChangeText={setUrgentText}
              multiline
              numberOfLines={5}
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity style={styles.modalCancelButton} onPress={() => { setShowUrgentModal(false); setUrgentText(''); }}>
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.modalSubmitButton, submitting && styles.buttonDisabled]} onPress={handleSubmitUrgent} disabled={submitting}>
                <Text style={styles.modalSubmitText}>Submit Urgent Concern</Text>
              </TouchableOpacity>
            </View>
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
    paddingHorizontal: 16,
    paddingVertical: 16,
    paddingBottom: 100,
  },
  header: {
    marginBottom: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
    color: '#6b7280',
  },
  section: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: 16,
  },
  sideEffectsGrid: {
    gap: 12,
  },
  sideEffectCard: {
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  sideEffectCardSelected: {
    backgroundColor: '#dbeafe',
    borderColor: '#3b82f6',
  },
  sideEffectHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#d1d5db',
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxChecked: {
    backgroundColor: '#3b82f6',
    borderColor: '#3b82f6',
  },
  checkmark: {
    color: 'white',
    fontSize: 16,
    fontWeight: '700',
  },
  sideEffectName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#1e293b',
    flex: 1,
  },
  sideEffectNameSelected: {
    color: '#3b82f6',
    fontWeight: '600',
  },
  severitySelector: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
  },
  severityLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  severityButtons: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 8,
  },
  severityButton: {
    flex: 1,
    aspectRatio: 1,
    borderRadius: 8,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  severityButtonActive: {
    backgroundColor: 'rgba(0,0,0,0.05)',
  },
  severityButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  severityButtonTextActive: {
    fontWeight: '700',
  },
  severityDescription: {
    fontSize: 12,
    fontWeight: '500',
    textAlign: 'center',
  },
  otherCard: {
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  otherCardSelected: {
    backgroundColor: '#dbeafe',
    borderColor: '#3b82f6',
  },
  otherCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  otherInput: {
    marginTop: 12,
    padding: 12,
    backgroundColor: 'white',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#d1d5db',
    fontSize: 14,
    color: '#1e293b',
  },
  urgentButton: {
    backgroundColor: '#fef2f2',
    borderWidth: 1,
    borderColor: '#fecaca',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginBottom: 8,
  },
  urgentButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ef4444',
  },
  urgentNote: {
    fontSize: 12,
    color: '#6b7280',
    textAlign: 'center',
  },
  submitButton: {
    backgroundColor: '#3b82f6',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  submitButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  modalOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
    paddingHorizontal: 20,
  },
  modalContent: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 24,
    width: '100%',
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1e293b',
  },
  modalClose: {
    fontSize: 24,
    color: '#9ca3af',
  },
  modalMessage: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 16,
    lineHeight: 20,
  },
  modalInput: {
    padding: 12,
    backgroundColor: '#f8fafc',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#d1d5db',
    fontSize: 14,
    color: '#1e293b',
    marginBottom: 16,
    minHeight: 120,
    textAlignVertical: 'top',
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  modalCancelButton: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
  },
  modalCancelText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
  },
  modalSubmitButton: {
    flex: 1,
    backgroundColor: '#ef4444',
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
  },
  modalSubmitText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
});

// Add ActivityIndicator import
import { ActivityIndicator } from 'react-native';