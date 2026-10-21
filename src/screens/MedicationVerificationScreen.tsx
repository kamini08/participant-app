import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../context/AuthContext';
import { apiRequest } from '../services/api';

interface MedicationDose {
  id: string;
  medicationName: string;
  dosage: string;
  frequency: string;
  scheduledTime: string;
  actualTime: string | null;
  status: string;
}

export default function MedicationVerificationScreen() {
  const { t } = useAuth();
  const [doses, setDoses] = useState<MedicationDose[]>([]);
  const [markingDose, setMarkingDose] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void loadMedications();
  }, []);

  const loadMedications = async () => {
    try {
      const { medications } = await apiRequest<{ medications: MedicationDose[] }>('/api/participant-app/medications');
      setDoses(medications);
    } catch (error) {
      console.error('Failed to load participant medication schedule:', error);
      Alert.alert('Could not load medication schedule', error instanceof Error ? error.message : 'Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleMarkTaken = async (doseId: string) => {
    setMarkingDose(doseId);
    try {
      const { medication } = await apiRequest<{ medication: MedicationDose }>(
        `/api/participant-app/medications/${doseId}/take`,
        { method: 'POST' }
      );
      setDoses(prev => prev.map(dose => dose.id === doseId ? medication : dose));
    } catch (error) {
      Alert.alert('Could not update medication', error instanceof Error ? error.message : 'Please try again.');
    } finally {
      setMarkingDose(null);
    }
  };

  const isTaken = (dose: MedicationDose) => dose.status === 'TAKEN';
  const canMarkTaken = (dose: MedicationDose) => ['PRESCRIBED', 'DISPENSED'].includes(dose.status);
  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' });
  };

  const isPastDue = (dateString: string) => new Date(dateString) < new Date();

  const getNextDose = () => {
    return doses
      .filter(dose => !isTaken(dose) && ['PRESCRIBED', 'DISPENSED'].includes(dose.status))
      .sort((a, b) => new Date(a.scheduledTime).getTime() - new Date(b.scheduledTime).getTime())[0];
  };

  const nextDose = getNextDose();

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={styles.title}>{t('medicationVerification')}</Text>
          <Text style={styles.subtitle}>View your study medication schedule and record doses taken.</Text>
        </View>

        {nextDose && (
          <View style={styles.nextDoseCard}>
            <Text style={styles.nextDoseLabel}>{t('nextDose')}</Text>
            <Text style={styles.nextDoseName}>{nextDose.medicationName}</Text>
            <Text style={styles.nextDoseDetails}>
              {nextDose.dosage} • {nextDose.frequency}
            </Text>
            <Text style={styles.nextDoseTime}>
              ⏰ {formatTime(nextDose.scheduledTime)} {isPastDue(nextDose.scheduledTime) ? '(Past Due)' : ''}
            </Text>
          </View>
        )}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Today's Schedule</Text>
          {loading ? (
            <ActivityIndicator size="large" color="#16836b" />
          ) : doses.length === 0 ? (
            <Text style={styles.instructionItem}>No medication doses are scheduled for today.</Text>
          ) : (
            <View style={styles.dosesList}>
              {doses.map(dose => {
                const taken = isTaken(dose);
                const overdue = isPastDue(dose.scheduledTime) && !taken;
                return (
              <View key={dose.id} style={styles.doseCard}>
                <View style={styles.doseInfo}>
                  <View style={[
                    styles.doseStatusIcon,
                    taken ? styles.doseStatusTaken : overdue ? styles.doseStatusOverdue : styles.doseStatusPending,
                  ]}>
                    {taken ? '✅' : overdue ? '⚠️' : '⏳'}
                  </View>
                  <View style={styles.doseDetails}>
                    <Text style={styles.doseName}>{dose.medicationName}</Text>
                    <Text style={styles.doseMeta}>{dose.dosage} • {dose.frequency}</Text>
                    <Text style={[
                      styles.doseTime,
                      overdue && styles.doseTimeOverdue,
                    ]}>
                      🕐 {formatTime(dose.scheduledTime)}
                    </Text>
                    {taken && dose.actualTime && (
                      <Text style={styles.doseMeta}>Recorded at {formatTime(dose.actualTime)}</Text>
                    )}
                  </View>
                </View>
                <View style={styles.doseActions}>
                  {taken || !canMarkTaken(dose) ? (
                    <Text style={styles.takenLabel}>
                      {taken ? 'Taken' : dose.status.replaceAll('_', ' ').toLowerCase()}
                    </Text>
                  ) : (
                    <TouchableOpacity
                      style={[styles.recordButton, markingDose === dose.id && styles.recordButtonUploading]}
                      onPress={() => handleMarkTaken(dose.id)}
                      disabled={markingDose !== null}
                    >
                      {markingDose === dose.id ? (
                        <ActivityIndicator size="small" color="white" />
                      ) : (
                        <Text style={styles.recordButtonText}>Mark taken</Text>
                      )}
                    </TouchableOpacity>
                  )}
                </View>
              </View>
                );
              })}
            </View>
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Instructions</Text>
          <View style={styles.instructionsList}>
            <Text style={styles.instructionItem}>• Only mark a dose taken after you have taken it.</Text>
            <Text style={styles.instructionItem}>• Your confirmation is saved to your study record.</Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
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
  nextDoseCard: {
    backgroundColor: '#dbeafe',
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#bfdbfe',
  },
  nextDoseLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#3b82f6',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  nextDoseName: {
    fontSize: 22,
    fontWeight: '700',
    color: '#1e40af',
    marginBottom: 4,
  },
  nextDoseDetails: {
    fontSize: 14,
    color: '#3b82f6',
    marginBottom: 8,
  },
  nextDoseTime: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e40af',
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
  dosesList: {
    gap: 12,
  },
  doseCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  doseInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  doseStatusIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
    fontSize: 24,
  },
  doseStatusTaken: {
    backgroundColor: '#dcfce7',
  },
  doseStatusPending: {
    backgroundColor: '#fef3c7',
  },
  doseStatusOverdue: {
    backgroundColor: '#fee2e2',
  },
  doseDetails: {
    flex: 1,
  },
  doseName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 2,
  },
  doseMeta: {
    fontSize: 13,
    color: '#6b7280',
    marginBottom: 4,
  },
  doseTime: {
    fontSize: 13,
    fontWeight: '500',
    color: '#374151',
  },
  doseTimeOverdue: {
    color: '#ef4444',
  },
  doseActions: {
    marginLeft: 12,
  },
  viewVideoButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#e0e7ff',
    borderRadius: 8,
  },
  viewVideoText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#3b82f6',
  },
  recordButton: {
    backgroundColor: '#ef4444',
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 10,
    minWidth: 120,
    alignItems: 'center',
  },
  recordButtonRecording: {
    backgroundColor: '#dc2626',
  },
  recordButtonUploading: {
    backgroundColor: '#f59e0b',
  },
  recordButtonText: {
    color: 'white',
    fontSize: 13,
    fontWeight: '600',
  },
  recordButtonTextRecording: {
    color: 'white',
    fontSize: 13,
    fontWeight: '600',
  },
  instructionsList: {
    gap: 8,
  },
  instructionItem: {
    fontSize: 14,
    color: '#374151',
    lineHeight: 20,
  },
  cameraOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  cameraContainer: {
    width: '100%',
    maxWidth: 400,
    backgroundColor: '#1e293b',
    borderRadius: 16,
    overflow: 'hidden',
  },
  cameraPreview: {
    aspectRatio: 16 / 9,
    backgroundColor: '#0f172a',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cameraPlaceholder: {
    fontSize: 48,
    marginBottom: 8,
  },
  cameraInstruction: {
    fontSize: 14,
    color: '#9ca3af',
    textAlign: 'center',
    paddingHorizontal: 20,
  },
  cameraControls: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    padding: 20,
    gap: 20,
  },
  cameraSwitch: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#374151',
    borderRadius: 10,
  },
  cameraSwitchText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  cameraRecord: {
    padding: 4,
  },
  recordCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#ef4444',
    borderWidth: 4,
    borderColor: '#fff',
  },
  recordCircleRecording: {
    backgroundColor: '#dc2626',
    opacity: 0.85,
  },
  takenLabel: {
    color: '#15803d',
    fontSize: 13,
    fontWeight: '700',
  },
  cameraCancel: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#374151',
    borderRadius: 10,
  },
  cameraCancelText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
});