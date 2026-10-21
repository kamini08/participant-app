import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  SafeAreaView,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { useAuth } from '../context/AuthContext';
import * as ImagePicker from 'expo-image-picker';
import * as MediaLibrary from 'expo-media-library';

interface MedicationDose {
  id: string;
  name: string;
  dosage: string;
  frequency: string;
  time: string;
  taken: boolean;
  videoUri?: string;
  timestamp?: string;
}

export default function MedicationVerificationScreen() {
  const { t } = useAuth();
  const [doses, setDoses] = useState<MedicationDose[]>([]);
  const [recording, setRecording] = useState<string | null>(null);
  const [uploading, setUploading] = useState<string | null>(null);
  const [cameraPermission, setCameraPermission] = useState<boolean | null>(null);
  const [showCamera, setShowCamera] = useState(false);
  const [cameraType, setCameraType] = useState<'front' | 'back'>('front');

  useEffect(() => {
    loadMockDoses();
    requestCameraPermission();
  }, []);

  const requestCameraPermission = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    setCameraPermission(status === 'granted');
    if (status !== 'granted') {
      Alert.alert('Camera Permission Required', 'Please enable camera access to record medication verification videos');
    }
  };

  const loadMockDoses = () => {
    const today = new Date();
    const formatTime = (hours: number, minutes: number) => 
      `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;

    setDoses([
      { id: '1', name: 'Study Drug A', dosage: '50mg', frequency: 'Once daily', time: formatTime(8, 0), taken: true, videoUri: 'mock-video-1', timestamp: '2026-01-21T08:05:00Z' },
      { id: '2', name: 'Study Drug B', dosage: '25mg', frequency: 'Twice daily', time: formatTime(8, 0), taken: true, videoUri: 'mock-video-2', timestamp: '2026-01-21T08:06:00Z' },
      { id: '3', name: 'Study Drug B', dosage: '25mg', frequency: 'Twice daily', time: formatTime(20, 0), taken: false },
      { id: '4', name: 'Supplement C', dosage: '500mg', frequency: 'Once daily', time: formatTime(12, 0), taken: false },
    ]);
  };

  const handleRecordVideo = async (doseId: string) => {
    if (!cameraPermission) {
      await requestCameraPermission();
      if (!cameraPermission) return;
    }

    setRecording(doseId);
    setShowCamera(true);
  };

  const handleVideoRecorded = async (uri: string, doseId: string) => {
    setRecording(null);
    setShowCamera(false);
    setUploading(doseId);

    await new Promise(resolve => setTimeout(resolve, 2000));

    setDoses(prev => prev.map(d => 
      d.id === doseId ? { ...d, taken: true, videoUri: uri, timestamp: new Date().toISOString() } : d
    ));

    setUploading(null);
    Alert.alert(t('videoUploaded'), t('medicationTaken'));
  };

  const handleCancelRecording = () => {
    setRecording(null);
    setShowCamera(false);
  };

  const formatTime = (timeStr: string) => {
    const [hours, minutes] = timeStr.split(':');
    const h = parseInt(hours);
    const ampm = h >= 12 ? 'PM' : 'AM';
    const displayHour = h % 12 || 12;
    return `${displayHour}:${minutes} ${ampm}`;
  };

  const isPastDue = (timeStr: string) => {
    const now = new Date();
    const [hours, minutes] = timeStr.split(':').map(Number);
    const doseTime = new Date();
    doseTime.setHours(hours, minutes, 0, 0);
    return doseTime < now;
  };

  const getNextDose = () => {
    const now = new Date();
    const currentMinutes = now.getHours() * 60 + now.getMinutes();
    
    return doses
      .filter(d => !d.taken)
      .map(d => {
        const [hours, minutes] = d.time.split(':').map(Number);
        const doseMinutes = hours * 60 + minutes;
        return { ...d, doseMinutes, diff: doseMinutes - currentMinutes };
      })
      .filter(d => d.diff > -60)
      .sort((a, b) => a.diff - b.diff)[0];
  };

  const nextDose = getNextDose();

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={styles.title}>{t('medicationVerification')}</Text>
          <Text style={styles.subtitle}>{t('recordMedicationIntake')}</Text>
        </View>

        {nextDose && (
          <View style={styles.nextDoseCard}>
            <Text style={styles.nextDoseLabel}>{t('nextDose')}</Text>
            <Text style={styles.nextDoseName}>{nextDose.name}</Text>
            <Text style={styles.nextDoseDetails}>
              {nextDose.dosage} • {nextDose.frequency}
            </Text>
            <Text style={styles.nextDoseTime}>
              ⏰ {formatTime(nextDose.time)} {isPastDue(nextDose.time) ? '(Past Due)' : ''}
            </Text>
          </View>
        )}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Today's Schedule</Text>
          <View style={styles.dosesList}>
            {doses.map(dose => (
              <View key={dose.id} style={styles.doseCard}>
                <View style={styles.doseInfo}>
                  <View style={[
                    styles.doseStatusIcon,
                    dose.taken ? styles.doseStatusTaken : isPastDue(dose.time) ? styles.doseStatusOverdue : styles.doseStatusPending,
                  ]}>
                    {dose.taken ? '✅' : isPastDue(dose.time) ? '⚠️' : '⏳'}
                  </View>
                  <View style={styles.doseDetails}>
                    <Text style={styles.doseName}>{dose.name}</Text>
                    <Text style={styles.doseMeta}>{dose.dosage} • {dose.frequency}</Text>
                    <Text style={[
                      styles.doseTime,
                      isPastDue(dose.time) && !dose.taken && styles.doseTimeOverdue,
                    ]}>
                      🕐 {formatTime(dose.time)}
                    </Text>
                  </View>
                </View>
                <View style={styles.doseActions}>
                  {dose.taken ? (
                    <TouchableOpacity style={styles.viewVideoButton} onPress={() => Alert.alert('Video Recorded', 'Medication verification video available')}>
                      <Text style={styles.viewVideoText}>📹 View Video</Text>
                    </TouchableOpacity>
                  ) : (
                    <TouchableOpacity
                      style={[
                        styles.recordButton,
                        recording === dose.id && styles.recordButtonRecording,
                        uploading === dose.id && styles.recordButtonUploading,
                      ]}
                      onPress={() => handleRecordVideo(dose.id)}
                      disabled={recording !== null && recording !== dose.id || uploading !== null}
                    >
                      {uploading === dose.id ? (
                        <ActivityIndicator size="small" color="white" />
                      ) : recording === dose.id ? (
                        <Text style={styles.recordButtonTextRecording}>🔴 Recording...</Text>
                      ) : (
                        <Text style={styles.recordButtonText}>{t('takeVideo')}</Text>
                      )}
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            ))}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Instructions</Text>
          <View style={styles.instructionsList}>
            <Text style={styles.instructionItem}>• Record a clear video showing you taking the medication</Text>
            <Text style={styles.instructionItem}>• Ensure good lighting and the medication is visible</Text>
            <Text style={styles.instructionItem}>• State your name, date, and medication name in the video</Text>
            <Text style={styles.instructionItem}>• Videos are encrypted and stored securely</Text>
            <Text style={styles.instructionItem}>• Videos are used only for adherence monitoring</Text>
          </View>
        </View>
      </ScrollView>

      {showCamera && (
        <View style={styles.cameraOverlay}>
          <View style={styles.cameraContainer}>
            <View style={styles.cameraPreview}>
              <Text style={styles.cameraPlaceholder}>📷 Camera Preview</Text>
              <Text style={styles.cameraInstruction}>
                Position medication in frame and press record
              </Text>
            </View>
            <View style={styles.cameraControls}>
              <TouchableOpacity style={styles.cameraSwitch} onPress={() => setCameraType(c => c === 'front' ? 'back' : 'front')}>
                <Text style={styles.cameraSwitchText}>🔄 Switch</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.cameraRecord} onPress={() => handleVideoRecorded('mock-video-uri', recording!)}>
                <View style={[
                  styles.recordCircle,
                  recording && styles.recordCircleRecording,
                ]} />
              </TouchableOpacity>
              <TouchableOpacity style={styles.cameraCancel} onPress={handleCancelRecording}>
                <Text style={styles.cameraCancelText}>✕ Cancel</Text>
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
    animation: 'pulse 1s infinite',
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