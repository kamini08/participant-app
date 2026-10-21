import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
  Alert,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../context/AuthContext';
import { apiRequest } from '../services/api';

interface DashboardScreenProps {
  navigation: {
    navigate: (route: string, params?: unknown) => void;
  };
}

interface Visit {
  id: string;
  title: string;
  type: string;
  date: string;
  scheduledAt: string;
  time: string;
  location: string;
  status: 'scheduled' | 'completed' | 'missed' | 'in-progress';
  instructions?: string;
}

interface Notification {
  id: string;
  title: string;
  message: string;
  type: 'pending' | 'completed' | 'urgent' | 'info';
  timestamp: string;
  read: boolean;
}

interface Survey {
  id: string;
  title: string;
  type: 'daily' | 'weekly' | 'side-effect' | 'energy' | 'other';
  status: 'pending' | 'completed' | 'missed';
  dueDate: string;
}

interface ParticipantDashboardResponse {
  visits: Array<{
    id: string;
    visitNumber: number;
    visitType: string;
    scheduledDate: string;
    status: string;
    notes: string | null;
    Site?: { name: string; address: string } | null;
  }>;
  surveys: Array<{
    id: string;
    surveyType: string;
    status: string;
    scheduledDate: string;
  }>;
  notifications: Array<{
    id: string;
    title: string;
    message: string;
    type: string;
    priority: string;
    sentAt: string;
    read: boolean;
  }>;
}

export default function DashboardScreen({ navigation }: DashboardScreenProps) {
  const { user, t } = useAuth();
  const [visits, setVisits] = useState<Visit[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [surveys, setSurveys] = useState<Survey[]>([]);
  const [showAllNotifications, setShowAllNotifications] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    void loadDashboard();
  }, []);

  useEffect(() => {
    setUnreadCount(notifications.filter(n => !n.read).length);
  }, [notifications]);

  const loadDashboard = async () => {
    try {
      const data = await apiRequest<ParticipantDashboardResponse>('/api/participant-app/dashboard');

      setVisits(data.visits.map<Visit>(visit => ({
        id: visit.id,
        title: `${visit.visitNumber ? `Visit ${visit.visitNumber} - ` : ''}${String(visit.visitType).replaceAll('_', ' ')}`,
        type: String(visit.visitType).replaceAll('_', ' '),
        date: dateKey(visit.scheduledDate),
        scheduledAt: visit.scheduledDate,
        time: new Date(visit.scheduledDate).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }),
        location: visit.Site?.name || visit.Site?.address || 'Study site',
        status: visit.status === 'COMPLETED' ? 'completed' : visit.status === 'MISSED' || visit.status === 'CANCELLED' ? 'missed' : visit.status === 'IN_PROGRESS' || visit.status === 'CHECKED_IN' ? 'in-progress' : 'scheduled',
        instructions: visit.notes || undefined,
      })));
      setSurveys(data.surveys.map<Survey>(survey => ({
        id: survey.id,
        title: survey.surveyType === 'DAILY' ? t('dailySurvey')
          : survey.surveyType === 'WEEKLY' ? t('weeklySurvey')
            : survey.surveyType === 'SIDE_EFFECT' ? t('sideEffectSurvey')
              : survey.surveyType === 'ENERGY_LEVEL' ? t('energyLevelSurvey')
                : String(survey.surveyType).replaceAll('_', ' '),
        type: survey.surveyType === 'DAILY' ? 'daily'
          : survey.surveyType === 'WEEKLY' ? 'weekly'
            : survey.surveyType === 'SIDE_EFFECT' ? 'side-effect'
              : survey.surveyType === 'ENERGY_LEVEL' ? 'energy' : 'other',
        status: survey.status === 'COMPLETED' ? 'completed'
          : survey.status === 'MISSED' || survey.status === 'EXEMPT' ? 'missed' : 'pending',
        dueDate: dateKey(survey.scheduledDate),
      })));
      setNotifications(data.notifications.map<Notification>(notification => ({
        id: notification.id,
        title: notification.title,
        message: notification.message,
        type: notification.priority === 'URGENT' || notification.type === 'SAFETY_ALERT' ? 'urgent' : notification.type === 'SURVEY_DUE' || notification.type === 'MEDICATION_DUE' ? 'pending' : 'info',
        timestamp: notification.sentAt,
        read: notification.read,
      })));
    } catch (error) {
      console.error('Failed to load participant dashboard:', error);
      Alert.alert('Could not load your dashboard', error instanceof Error ? error.message : 'Please try again.');
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await loadDashboard();
    } finally {
      setRefreshing(false);
    }
  };

  const handleVisitPress = (visit: Visit) => {
    Alert.alert(
      visit.title,
      `${formatDate(visit.date)} at ${visit.time}\n${visit.location}${visit.instructions ? `\n\n${visit.instructions}` : ''}`
    );
  };

  const handleSurveyPress = (survey: Survey) => {
    navigation.navigate('SurveyScreen', { survey });
  };

  const handleNotificationPress = async (notification: Notification) => {
    if (!notification.read) {
      try {
        await apiRequest(`/api/participant-app/notifications/${notification.id}/read`, { method: 'POST' });
        setNotifications(prev => prev.map(item => item.id === notification.id ? { ...item, read: true } : item));
      } catch (error) {
        Alert.alert('Could not update notification', error instanceof Error ? error.message : 'Please try again.');
        return;
      }
    }

    if (notification.type === 'pending') {
      const content = `${notification.title} ${notification.message}`.toLowerCase();
      if (content.includes('survey')) {
        navigation.navigate('Surveys');
      } else if (content.includes('medication')) {
        navigation.navigate('MedicationVerification');
      }
    }
  };

  const handleViewAllNotifications = () => {
    setShowAllNotifications(prev => !prev);
  };

  const getStatusColor = (status: Visit['status']) => {
    switch (status) {
      case 'scheduled': return '#3b82f6';
      case 'completed': return '#10b981';
      case 'missed': return '#ef4444';
      case 'in-progress': return '#f59e0b';
    }
  };

  const getNotificationIcon = (type: Notification['type']) => {
    switch (type) {
      case 'pending': return '⏳';
      case 'completed': return '✅';
      case 'urgent': return '🚨';
      case 'info': return 'ℹ️';
    }
  };

  const getNotificationColor = (type: Notification['type']) => {
    switch (type) {
      case 'pending': return '#f59e0b';
      case 'completed': return '#10b981';
      case 'urgent': return '#ef4444';
      case 'info': return '#3b82f6';
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' });
  };

  const dateKey = (value: string) => {
    const date = new Date(value);
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  };
  const today = dateKey(new Date().toISOString());
  const todayVisits = visits.filter(v => v.date === today);
  const upcomingVisits = visits.filter(v => v.date !== today);
  const pendingSurveys = surveys.filter(s => s.status === 'pending');
  const nextAppointment = [...visits]
    .filter(visit => visit.status === 'scheduled' || visit.status === 'in-progress')
    .sort((a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime())[0];
  const pendingNotifications = notifications.filter(n => !n.read);
  const displayedNotifications = showAllNotifications ? notifications : pendingNotifications.slice(0, 3);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <View style={styles.userInfo}>
            <Text style={styles.greeting}>Good morning,</Text>
            <Text style={styles.userName}>{user?.name || 'Participant'}</Text>
          </View>
          <View style={styles.headerActions}>
            <TouchableOpacity style={styles.notificationButton} onPress={handleViewAllNotifications}>
              <Text style={styles.notificationIcon}>🔔</Text>
              {unreadCount > 0 && (
                <View style={styles.notificationBadge}>
                  <Text style={styles.notificationBadgeText}>{unreadCount > 9 ? '9+' : unreadCount}</Text>
                </View>
              )}
            </TouchableOpacity>
          </View>
        </View>

        {unreadCount > 0 && (
          <View style={styles.notificationBar}>
            <Text style={styles.notificationBarText}>
              {unreadCount} {unreadCount === 1 ? 'new notification' : 'new notifications'}
            </Text>
            <TouchableOpacity onPress={handleViewAllNotifications}>
              <Text style={styles.notificationBarAction}>{t('notificationsTitle')}</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.featureCards}>
          <TouchableOpacity
            accessibilityRole="button"
            style={[styles.featureCard, styles.appointmentFeature]}
            onPress={() => nextAppointment && handleVisitPress(nextAppointment)}
          >
            <Text style={styles.featureEyebrow}>YOUR NEXT APPOINTMENT</Text>
            <Text style={styles.featureTitle}>
              {nextAppointment ? nextAppointment.title : 'No appointment scheduled'}
            </Text>
            <Text style={styles.featureDetail}>
              {nextAppointment
                ? `${formatDate(nextAppointment.date)} · ${nextAppointment.time}`
                : 'Your care team will let you know when one is planned.'}
            </Text>
            {nextAppointment?.location ? (
              <Text style={styles.featureDetail}>{nextAppointment.location}</Text>
            ) : null}
          </TouchableOpacity>
          <TouchableOpacity
            accessibilityRole="button"
            style={[styles.featureCard, styles.tasksFeature]}
            onPress={() => navigation.navigate('Surveys')}
          >
            <Text style={styles.featureEyebrow}>PENDING TASKS</Text>
            <Text style={styles.featureTitle}>
              {pendingSurveys.length === 0
                ? 'You’re all caught up'
                : `${pendingSurveys.length} ${pendingSurveys.length === 1 ? 'Survey' : 'Surveys'} to Complete`}
            </Text>
            <Text style={styles.featureDetail}>
              {pendingSurveys.length === 0 ? 'No tasks need your attention right now.' : 'Tap to continue your questionnaire.'}
            </Text>
          </TouchableOpacity>
        </View>

        {(pendingNotifications.length > 0 || showAllNotifications) && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>🔔 {showAllNotifications ? t('notificationsTitle') : t('pendingTasks')}</Text>
              {notifications.length > 3 && (
                <TouchableOpacity onPress={handleViewAllNotifications}>
                  <Text style={styles.notificationBarAction}>{showAllNotifications ? 'Show pending' : t('notificationsTitle')}</Text>
                </TouchableOpacity>
              )}
            </View>
            {displayedNotifications.length > 0 ? (
              <View style={styles.listContent}>
                {displayedNotifications.map(item => (
                  <TouchableOpacity key={item.id} style={styles.notificationCard} onPress={() => handleNotificationPress(item)}>
                    <View style={styles.notificationCardLeft}>
                      <Text style={styles.notificationIconLarge}>{getNotificationIcon(item.type)}</Text>
                    </View>
                    <View style={styles.notificationCardContent}>
                      <Text style={styles.notificationCardTitle}>{item.title}</Text>
                      <Text style={styles.notificationCardMessage}>{item.message}</Text>
                      <Text style={styles.notificationCardTime}>{formatDate(item.timestamp)}</Text>
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            ) : (
              <Text style={styles.emptyStateMessage}>No notifications yet.</Text>
            )}
          </View>
        )}

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>📅 {t('todayVisits')}</Text>
          </View>
          {todayVisits.length > 0 ? (
            <View style={styles.listContent}>
              {todayVisits.map(item => (
                <TouchableOpacity key={item.id} style={styles.visitCard} onPress={() => handleVisitPress(item)}>
                  <View style={styles.visitCardLeft}>
                    <View style={[styles.statusDot, { backgroundColor: getStatusColor(item.status) }]} />
                  </View>
                  <View style={styles.visitCardContent}>
                    <Text style={styles.visitCardTitle}>{item.title}</Text>
                    <Text style={styles.visitCardMeta}>🕐 {item.time} • 📍 {item.location}</Text>
                    <View style={styles.visitCardStatus}>
                      <Text style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) }]}>
                        {item.status}
                      </Text>
                    </View>
                  </View>
                  <View style={styles.visitCardRight}>
                    <Text style={styles.chevron}>›</Text>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          ) : (
            <View style={styles.emptyState}>
              <Text style={styles.emptyStateText}>📅</Text>
              <Text style={styles.emptyStateMessage}>{t('noVisitsToday')}</Text>
            </View>
          )}
        </View>

        {upcomingVisits.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>📆 {t('upcomingVisits')}</Text>
            </View>
            <View style={styles.listContent}>
              {upcomingVisits.map(item => (
                <TouchableOpacity key={item.id} style={styles.visitCard} onPress={() => handleVisitPress(item)}>
                  <View style={styles.visitCardLeft}>
                    <View style={[styles.statusDot, { backgroundColor: getStatusColor(item.status) }]} />
                  </View>
                  <View style={styles.visitCardContent}>
                    <Text style={styles.visitCardTitle}>{item.title}</Text>
                    <Text style={styles.visitCardMeta}>📅 {formatDate(item.date)} • 🕐 {item.time}</Text>
                    <View style={styles.visitCardStatus}>
                      <Text style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) }]}>
                        {item.status}
                      </Text>
                    </View>
                  </View>
                  <View style={styles.visitCardRight}>
                    <Text style={styles.chevron}>›</Text>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>📋 {t('surveys')}</Text>
          </View>
          <View style={styles.listContent}>
            {surveys.map(item => (
              <TouchableOpacity key={item.id} style={styles.surveyCard} onPress={() => handleSurveyPress(item)}>
                <View style={styles.surveyCardLeft}>
                  <View style={[
                    styles.surveyTypeBadge,
                    { backgroundColor: item.type === 'daily' ? '#dbeafe' : item.type === 'weekly' ? '#fef3c7' : item.type === 'side-effect' ? '#fee2e2' : '#dcfce7' }
                  ]}>
                    <Text style={[
                      styles.surveyTypeText,
                      { color: item.type === 'daily' ? '#3b82f6' : item.type === 'weekly' ? '#f59e0b' : item.type === 'side-effect' ? '#ef4444' : '#10b981' }
                    ]}>
                      {item.type === 'daily' ? 'D' : item.type === 'weekly' ? 'W' : item.type === 'side-effect' ? 'SE' : item.type === 'energy' ? 'E' : 'A'}
                    </Text>
                  </View>
                </View>
                <View style={styles.surveyCardContent}>
                  <Text style={styles.surveyCardTitle}>{item.title}</Text>
                  <Text style={styles.surveyCardMeta}>Due: {formatDate(item.dueDate)}</Text>
                </View>
                <View style={styles.surveyCardRight}>
                  <Text style={[
                    styles.surveyStatusBadge,
                    { backgroundColor: item.status === 'completed' ? '#dcfce7' : '#fef3c7' }
                  ]}>
                    <Text style={[
                      styles.surveyStatusText,
                      { color: item.status === 'completed' ? '#10b981' : '#f59e0b' }
                    ]}>
                      {item.status === 'completed' ? '✅ Done' : item.status === 'missed' ? 'Missed' : '⏳ Pending'}
                    </Text>
                  </Text>
                </View>
                </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.quickActions}>
          <TouchableOpacity style={styles.quickActionCard} onPress={() => navigation.navigate('MedicationVerification')}>
            <Text style={styles.quickActionIcon}>💊</Text>
            <Text style={styles.quickActionTitle}>{t('medicationVerification')}</Text>
            <Text style={styles.quickActionSubtitle}>{t('recordMedicationIntake')}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.quickActionCard} onPress={() => navigation.navigate('SymptomTracker')}>
            <Text style={styles.quickActionIcon}>🩺</Text>
            <Text style={styles.quickActionTitle}>{t('sideEffects')}</Text>
            <Text style={styles.quickActionSubtitle}>{t('reportSideEffect')}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.quickActionCard} onPress={() => navigation.navigate('Surveys')}>
            <Text style={styles.quickActionIcon}>📝</Text>
            <Text style={styles.quickActionTitle}>{t('surveys')}</Text>
            <Text style={styles.quickActionSubtitle}>{t('dailySurvey')} & {t('weeklySurvey')}</Text>
          </TouchableOpacity>
        </View>
        <TouchableOpacity
          accessibilityRole="button"
          onPress={() => navigation.navigate('EmergencyReport')}
          style={styles.emergencyAction}
        >
          <Text style={styles.emergencyActionIcon}>🚨</Text>
          <View style={styles.emergencyActionCopy}>
            <Text style={styles.emergencyActionTitle}>Urgent concern or need emergency help?</Text>
            <Text style={styles.emergencyActionSubtitle}>Contact emergency services or notify your study team</Text>
          </View>
          <Text style={styles.emergencyActionArrow}>›</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  featureCards: {
    gap: 12,
    marginBottom: 20,
  },
  featureCard: {
    borderRadius: 18,
    padding: 20,
    borderWidth: 1,
  },
  appointmentFeature: {
    backgroundColor: '#e9f5f1',
    borderColor: '#c8e4da',
  },
  tasksFeature: {
    backgroundColor: '#ffffff',
    borderColor: '#e2e8f0',
  },
  featureEyebrow: {
    color: '#55786d',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.8,
    marginBottom: 8,
  },
  featureTitle: {
    color: '#17324d',
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 5,
  },
  featureDetail: {
    color: '#64748b',
    fontSize: 14,
    lineHeight: 20,
  },
  header: {
    backgroundColor: 'white',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  userInfo: {
    flex: 1,
  },
  greeting: {
    fontSize: 14,
    color: '#6b7280',
  },
  userName: {
    fontSize: 22,
    fontWeight: '700',
    color: '#1e293b',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  notificationButton: {
    position: 'relative',
    padding: 8,
  },
  notificationIcon: {
    fontSize: 24,
  },
  notificationBadge: {
    position: 'absolute',
    top: 2,
    right: 2,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#ef4444',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  notificationBadgeText: {
    color: 'white',
    fontSize: 11,
    fontWeight: '700',
  },
  notificationBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#fef3c7',
    borderRadius: 8,
  },
  notificationBarText: {
    fontSize: 13,
    color: '#92400e',
    fontWeight: '500',
  },
  notificationBarAction: {
    fontSize: 13,
    color: '#3b82f6',
    fontWeight: '600',
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    paddingBottom: 100,
  },
  section: {
    marginBottom: 24,
    backgroundColor: 'white',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    overflow: 'hidden',
  },
  sectionHeader: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1e293b',
  },
  listContent: {
    flexDirection: 'column',
  },
  notificationCard: {
    flexDirection: 'row',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  notificationCardLeft: {
    marginRight: 12,
  },
  notificationIconLarge: {
    fontSize: 24,
  },
  notificationCardContent: {
    flex: 1,
  },
  notificationCardTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 2,
  },
  notificationCardMessage: {
    fontSize: 13,
    color: '#6b7280',
    marginBottom: 4,
  },
  notificationCardTime: {
    fontSize: 11,
    color: '#9ca3af',
  },
  visitCard: {
    flexDirection: 'row',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  visitCardLeft: {
    width: 8,
    justifyContent: 'center',
    marginRight: 12,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  visitCardContent: {
    flex: 1,
  },
  visitCardTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 4,
  },
  visitCardMeta: {
    fontSize: 12,
    color: '#6b7280',
    marginBottom: 8,
  },
  visitCardStatus: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 100,
    fontSize: 10,
    fontWeight: '600',
    color: 'white',
    textTransform: 'capitalize',
  },
  visitCardRight: {
    justifyContent: 'center',
    paddingLeft: 12,
  },
  chevron: {
    fontSize: 20,
    color: '#9ca3af',
  },
  emptyState: {
    padding: 32,
    alignItems: 'center',
  },
  emptyStateText: {
    fontSize: 48,
    marginBottom: 12,
  },
  emptyStateMessage: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
  },
  surveyCard: {
    flexDirection: 'row',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
    alignItems: 'center',
  },
  surveyCardLeft: {
    marginRight: 12,
  },
  surveyTypeBadge: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  surveyTypeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  surveyCardContent: {
    flex: 1,
  },
  surveyCardTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 2,
  },
  surveyCardMeta: {
    fontSize: 12,
    color: '#6b7280',
  },
  surveyCardRight: {
    alignItems: 'flex-end',
  },
  surveyStatusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 100,
  },
  surveyStatusText: {
    fontSize: 11,
    fontWeight: '600',
  },
  quickActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  quickActionCard: {
    width: '48%',
    aspectRatio: 1,
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginBottom: 12,
  },
  quickActionIcon: {
    fontSize: 32,
    marginBottom: 8,
  },
  quickActionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1e293b',
    textAlign: 'center',
    marginBottom: 4,
  },
  quickActionSubtitle: {
    fontSize: 11,
    color: '#6b7280',
    textAlign: 'center',
  },
  emergencyAction: {
    minHeight: 82,
    marginTop: 2,
    marginBottom: 20,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#f0b7b1',
    backgroundColor: '#fff4f2',
    flexDirection: 'row',
    alignItems: 'center',
  },
  emergencyActionIcon: {
    fontSize: 26,
    marginRight: 12,
  },
  emergencyActionCopy: {
    flex: 1,
  },
  emergencyActionTitle: {
    color: '#8e211d',
    fontSize: 14,
    fontWeight: '800',
  },
  emergencyActionSubtitle: {
    color: '#7b4541',
    fontSize: 12,
    lineHeight: 17,
    marginTop: 3,
  },
  emergencyActionArrow: {
    color: '#9f2d28',
    fontSize: 28,
    fontWeight: '400',
    marginLeft: 8,
  },
});