import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  RefreshControl,
  Modal,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { File } from 'expo-file-system';
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
  videoUrl?: string | null;
}

export default function MedicationVerificationScreen() {
  const { t } = useAuth();
  const cameraRef = useRef<CameraView>(null);
  const [cameraPermission, requestCameraPermission] = useCameraPermissions();
  const [doses, setDoses] = useState<MedicationDose[]>([]);
  const [markingDose, setMarkingDose] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [cameraDose, setCameraDose] = useState<MedicationDose | null>(null);
  const [cameraOpen, setCameraOpen] = useState(false);
  const [recording, setRecording] = useState(false);
  const [recordedVideoUri, setRecordedVideoUri] = useState<string | null>(null);

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

  const openCameraAfterConsent = async (dose: MedicationDose) => {
    try {
      await apiRequest(`/api/participant-app/medications/${dose.id}/video-consent`, { method: 'POST' });
      const permission = cameraPermission?.granted ? cameraPermission : await requestCameraPermission();
      if (!permission.granted) {
        Alert.alert('Camera access needed', 'Allow camera access in your device settings to record a medication verification video.');
        return;
      }

      setCameraDose(dose);
      setRecordedVideoUri(null);
      setCameraOpen(true);
    } catch (error) {
      Alert.alert('Could not prepare video recording', error instanceof Error ? error.message : 'Please try again.');
    }
  };

  const requestVideoConsent = (dose: MedicationDose) => {
    if (Platform.OS === 'web') {
      Alert.alert('Use a mobile device', 'Medication video recording is available in the Android and iOS apps.');
      return;
    }
    Alert.alert(
      'Consent to record medication',
      'A short, silent video may show you and your medication. It will be uploaded to private study storage, available to authorised study staff, and automatically deleted after 90 days. You may choose not to record and contact your study team instead.',
      [
        { text: 'Not now', style: 'cancel' },
        { text: 'I agree and continue', onPress: () => void openCameraAfterConsent(dose) },
      ]
    );
  };

  const recordVideo = async () => {
    if (!cameraRef.current || recording) return;
    setRecording(true);
    try {
      const result = await cameraRef.current.recordAsync({
        maxDuration: 30,
        maxFileSize: 45 * 1024 * 1024,
        codec: 'avc1',
      });
      if (!result?.uri) throw new Error('The camera did not return a recorded video.');
      setRecordedVideoUri(result.uri);
    } catch (error) {
      Alert.alert('Could not record video', error instanceof Error ? error.message : 'Please try again.');
    } finally {
      setRecording(false);
    }
  };

  const uploadVideo = async () => {
    if (!cameraDose || !recordedVideoUri) return;
    setMarkingDose(cameraDose.id);
    try {
      const isQuickTime = recordedVideoUri.toLowerCase().split('?')[0].endsWith('.mov');
      const formData = new FormData();
      const videoFile = new File(recordedVideoUri);
      formData.append(
        'video',
        videoFile,
        `medication-${cameraDose.id}.${isQuickTime ? 'mov' : 'mp4'}`
      );
      const result = await apiRequest<{ medication: MedicationDose; demoOnly: boolean }>(
        `/api/participant-app/medications/${cameraDose.id}/video`,
        { method: 'POST', formData }
      );
      setDoses(previous => previous.map(dose => dose.id === cameraDose.id ? result.medication : dose));
      setCameraOpen(false);
      setCameraDose(null);
      setRecordedVideoUri(null);
      Alert.alert(
        result.demoOnly ? 'Demo video uploaded' : 'Video uploaded',
        result.demoOnly
          ? 'The synthetic demo dose remains unchanged and was not marked as taken.'
          : 'Your video was securely uploaded. Your dose was recorded, and the video will be deleted after 90 days.'
      );
    } catch (error) {
      Alert.alert('Could not upload video', error instanceof Error ? error.message : 'Please try again.');
    } finally {
      setMarkingDose(null);
    }
  };

  const closeCamera = () => {
    if (recording) {
      Alert.alert('Recording in progress', 'Stop the recording before closing the camera.');
      return;
    }
    setCameraOpen(false);
    setCameraDose(null);
    setRecordedVideoUri(null);
  };

  const refreshMedications = async () => {
    setRefreshing(true);
    try {
      await loadMedications();
    } finally {
      setRefreshing(false);
    }
  };

  const isTaken = (dose: MedicationDose) => dose.status === 'TAKEN';
  const canMarkTaken = (dose: MedicationDose) => ['PRESCRIBED', 'DISPENSED'].includes(dose.status);
  const isDemoDose = (dose: MedicationDose) => dose.medicationName.startsWith('DEMO ONLY');
  const studyDateKey = (date: Date) => new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString('en-IN', {
      timeZone: 'Asia/Kolkata',
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const today = new Date();
    const tomorrow = new Date(today.getTime() + 24 * 60 * 60 * 1000);
    if (studyDateKey(date) === studyDateKey(today)) return 'Today';
    if (studyDateKey(date) === studyDateKey(tomorrow)) return 'Tomorrow';
    return date.toLocaleDateString('en-IN', {
      timeZone: 'Asia/Kolkata',
      weekday: 'short',
      day: 'numeric',
      month: 'short',
    });
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
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refreshMedications} />}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <Text style={styles.title}>{t('medicationVerification')}</Text>
          <Text style={styles.subtitle}>Today’s study medication schedule. Only record a dose after taking it.</Text>
        </View>

        {nextDose && (
          <View style={styles.nextDoseCard}>
            <Text style={styles.nextDoseLabel}>
              {isDemoDose(nextDose) ? 'DEMO SCHEDULE · NOT A MEDICINE' : 'NEXT DOSE TODAY'}
            </Text>
            <Text style={styles.nextDoseName}>{nextDose.medicationName}</Text>
            <Text style={styles.nextDoseDetails}>
              {nextDose.dosage} • {nextDose.frequency}
            </Text>
            <Text style={styles.nextDoseTime}>
              {formatTime(nextDose.scheduledTime)} {isPastDue(nextDose.scheduledTime) ? '· Past due' : ''}
            </Text>
          </View>
        )}

        <View style={styles.section}>
          <View style={styles.sectionHeading}>
            <View>
              <Text style={styles.sectionTitle}>Today’s schedule</Text>
              <Text style={styles.sectionSubtitle}>
                {doses.length} {doses.length === 1 ? 'dose' : 'doses'} scheduled for today
              </Text>
            </View>
            <View style={styles.todayBadge}>
              <Text style={styles.todayBadgeText}>TODAY</Text>
            </View>
          </View>
          {loading ? (
            <ActivityIndicator size="large" color="#16836b" style={styles.loader} />
          ) : doses.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyIcon}>✓</Text>
              <Text style={styles.emptyTitle}>No doses scheduled today</Text>
              <Text style={styles.emptyMessage}>
                If you expected a medication schedule, please contact your study team.
              </Text>
            </View>
          ) : (
            <View style={styles.dosesList}>
              {doses.map(dose => {
                const taken = isTaken(dose);
                const overdue = isPastDue(dose.scheduledTime) && !taken;
                const demoDose = isDemoDose(dose);
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
                    {demoDose && (
                      <Text style={styles.demoLabel}>TEST DATA ONLY · NOT A PRESCRIPTION</Text>
                    )}
                    <Text style={[
                      styles.doseTime,
                      overdue && styles.doseTimeOverdue,
                    ]}>
                      {formatTime(dose.scheduledTime)}
                    </Text>
                    {taken && dose.actualTime && (
                      <Text style={styles.doseMeta}>Recorded at {formatTime(dose.actualTime)}</Text>
                    )}
                  </View>
                </View>
                <View style={styles.doseActions}>
                  {taken || !canMarkTaken(dose) || (demoDose && dose.videoUrl) ? (
                    <Text style={styles.takenLabel}>
                      {taken
                        ? 'Taken'
                        : demoDose && dose.videoUrl
                          ? 'Demo video uploaded'
                          : demoDose
                            ? 'Demo only'
                            : dose.status.replaceAll('_', ' ').toLowerCase()}
                    </Text>
                  ) : (
                    <TouchableOpacity
                      style={[styles.recordButton, markingDose === dose.id && styles.recordButtonUploading]}
                      onPress={() => requestVideoConsent(dose)}
                      disabled={markingDose !== null}
                    >
                      {markingDose === dose.id ? (
                        <ActivityIndicator size="small" color="white" />
                      ) : (
                        <Text style={styles.recordButtonText}>{demoDose ? 'Test video' : 'Record video'}</Text>
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
            <Text style={styles.instructionItem}>• Record a short video only after you have taken the scheduled dose.</Text>
            <Text style={styles.instructionItem}>• Videos are silent, stored privately, and deleted after 90 days.</Text>
            <Text style={styles.instructionItem}>• You can decline recording and contact your study team.</Text>
          </View>
        </View>
      </ScrollView>

      <Modal
        visible={cameraOpen}
        transparent
        animationType="slide"
        onRequestClose={closeCamera}
      >
        <View style={styles.cameraOverlay}>
          <View style={styles.cameraContainer}>
            <Text style={styles.cameraTitle}>Medication verification</Text>
            <Text style={styles.cameraInstruction}>
              Keep the medicine in view. The recording is silent and limited to 30 seconds.
            </Text>
            {recordedVideoUri ? (
              <View style={styles.recordedNotice}>
                <Text style={styles.recordedTitle}>Video ready to upload</Text>
                <Text style={styles.recordedText}>This private upload is linked to today’s dose.</Text>
              </View>
            ) : (
              <CameraView
                ref={cameraRef}
                style={styles.cameraPreview}
                facing="back"
                mode="video"
                videoQuality="720p"
                videoBitrate={2_500_000}
                mute
                active={cameraOpen}
              />
            )}
            <View style={styles.cameraControls}>
              {recordedVideoUri ? (
                <>
                  <TouchableOpacity
                    style={styles.cameraCancel}
                    onPress={() => setRecordedVideoUri(null)}
                    disabled={markingDose !== null}
                  >
                    <Text style={styles.cameraCancelText}>Record again</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.uploadButton}
                    onPress={() => void uploadVideo()}
                    disabled={markingDose !== null}
                  >
                    {markingDose === cameraDose?.id ? (
                      <ActivityIndicator size="small" color="#ffffff" />
                    ) : (
                      <Text style={styles.cameraCancelText}>Upload securely</Text>
                    )}
                  </TouchableOpacity>
                </>
              ) : recording ? (
                <TouchableOpacity
                  style={[styles.cameraRecord, styles.cameraStop]}
                  onPress={() => cameraRef.current?.stopRecording()}
                >
                  <View style={styles.recordSquare} />
                  <Text style={styles.cameraCancelText}>Stop recording</Text>
                </TouchableOpacity>
              ) : (
                <>
                  <TouchableOpacity style={styles.cameraCancel} onPress={closeCamera}>
                    <Text style={styles.cameraCancelText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.cameraRecord}
                    onPress={() => void recordVideo()}
                  >
                    <View style={styles.recordCircle} />
                    <Text style={styles.cameraCancelText}>Start recording</Text>
                  </TouchableOpacity>
                </>
              )}
            </View>
            <Text style={styles.retentionNote}>Private study storage · automatic deletion after 90 days</Text>
          </View>
        </View>
      </Modal>
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
    marginBottom: 20,
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
    backgroundColor: '#e8f5f0',
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#c8e7dc',
  },
  nextDoseLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#16836b',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  nextDoseName: {
    fontSize: 22,
    fontWeight: '700',
    color: '#174c40',
    marginBottom: 4,
  },
  nextDoseDetails: {
    fontSize: 14,
    color: '#50776d',
    marginBottom: 8,
  },
  nextDoseTime: {
    fontSize: 16,
    fontWeight: '600',
    color: '#174c40',
  },
  sectionHeading: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
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
  },
  sectionSubtitle: {
    color: '#718096',
    fontSize: 13,
    marginTop: 4,
  },
  todayBadge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: '#e8f5f0',
    borderRadius: 20,
  },
  todayBadgeText: {
    color: '#16836b',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.6,
  },
  loader: {
    paddingVertical: 24,
  },
  emptyState: {
    alignItems: 'center',
    backgroundColor: '#f7faf9',
    borderRadius: 12,
    paddingHorizontal: 18,
    paddingVertical: 24,
  },
  emptyIcon: {
    color: '#16836b',
    fontSize: 26,
    fontWeight: '700',
    marginBottom: 8,
  },
  emptyTitle: {
    color: '#23384b',
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 5,
    textAlign: 'center',
  },
  emptyMessage: {
    color: '#64748b',
    fontSize: 13,
    lineHeight: 19,
    textAlign: 'center',
  },
  dosesList: {
    gap: 12,
  },
  doseCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
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
    width: 42,
    height: 42,
    borderRadius: 13,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
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
  demoLabel: {
    color: '#9a3412',
    fontSize: 12,
    fontWeight: '700',
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
    marginLeft: 8,
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
    backgroundColor: '#16836b',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    minWidth: 100,
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
    width: '92%',
    maxWidth: 460,
    backgroundColor: '#ffffff',
    borderRadius: 16,
    overflow: 'hidden',
    paddingTop: 20,
  },
  cameraTitle: {
    color: '#17324d',
    fontSize: 20,
    fontWeight: '800',
    paddingHorizontal: 20,
    marginBottom: 5,
  },
  cameraPreview: {
    height: 360,
    backgroundColor: '#0f172a',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 16,
  },
  cameraInstruction: {
    fontSize: 14,
    color: '#64748b',
    lineHeight: 20,
    paddingHorizontal: 20,
  },
  cameraControls: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
    gap: 12,
  },
  cameraRecord: {
    minHeight: 46,
    minWidth: 140,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: '#16836b',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
  },
  cameraStop: {
    backgroundColor: '#b42318',
    flexDirection: 'row',
    gap: 10,
    flex: 1,
  },
  recordSquare: {
    width: 16,
    height: 16,
    borderRadius: 3,
    backgroundColor: '#ffffff',
  },
  recordCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#ffffff',
  },
  takenLabel: {
    color: '#15803d',
    fontSize: 13,
    fontWeight: '700',
  },
  cameraCancel: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#64748b',
    borderRadius: 12,
    minHeight: 44,
    justifyContent: 'center',
  },
  uploadButton: {
    backgroundColor: '#16836b',
    borderRadius: 12,
    minHeight: 44,
    paddingHorizontal: 16,
    justifyContent: 'center',
    alignItems: 'center',
    minWidth: 150,
  },
  cameraCancelText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  recordedNotice: {
    marginHorizontal: 20,
    marginTop: 18,
    minHeight: 220,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f0f7f4',
    borderRadius: 14,
    padding: 20,
  },
  recordedTitle: {
    color: '#174c40',
    fontSize: 17,
    fontWeight: '800',
    marginBottom: 6,
  },
  recordedText: {
    color: '#50776d',
    fontSize: 13,
    lineHeight: 19,
    textAlign: 'center',
  },
  retentionNote: {
    color: '#718096',
    fontSize: 11,
    textAlign: 'center',
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
});