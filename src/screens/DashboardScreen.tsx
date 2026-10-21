import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  SafeAreaView,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  RefreshControl,
  Alert,
  Image,
} from 'react-native';
import { useAuth } from '../context/AuthContext';
import { useNavigation } from '@react-navigation/native';

interface Visit {
  id: string;
  title: string;
  type: string;
  date: string;
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
  type: 'daily' | 'weekly' | 'side-effect' | 'energy';
  status: 'pending' | 'completed';
  dueDate: string;
}

export default function DashboardScreen() {
  const { user, t } = useAuth();
  const navigation = useNavigation();
  const [visits, setVisits] = useState<Visit[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [surveys, setSurveys] = useState<Survey[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    loadMockData();
  }, []);

  useEffect(() => {
    setUnreadCount(notifications.filter(n => !n.read).length);
  }, [notifications]);

  const loadMockData = () => {
    setVisits([
      { id: '1', title: 'Visit 1 - Screening', type: 'Screening', date: '2026-01-22', time: '09:00 AM', location: 'AIIA, New Delhi', status: 'scheduled', instructions: 'Fasting required for 8 hours. Bring all previous medical records.' },
      { id: '2', title: 'Visit 2 - Baseline', type: 'Baseline', date: '2026-01-25', time: '10:30 AM', location: 'AIIA, New Delhi', status: 'scheduled', instructions: 'Take morning medication as usual.' },
      { id: '3', title: 'Visit 3 - Week 2', type: 'Follow-up', date: '2026-02-01', time: '11:00 AM', location: 'AIIA, New Delhi', status: 'scheduled', instructions: 'Bring medication diary.' },
    ]);

    setNotifications([
      { id: '1', title: 'Daily Survey Due', message: 'Your daily symptom survey is due today', type: 'pending', timestamp: '2026-01-21T08:00:00Z', read: false },
      { id: '2', title: 'Visit Reminder', message: 'Screening visit tomorrow at 9:00 AM', type: 'info', timestamp: '2026-01-21T10:00:00Z', read: false },
      { id: '3', title: 'Medication Verification', message: 'Please upload your morning medication video', type: 'pending', timestamp: '2026-01-21T07:30:00Z', read: true },
      { id: '4', title: 'Weekly Survey Available', message: 'Week 1 survey is now available', type: 'info', timestamp: '2026-01-20T18:00:00Z', read: true },
    ]);

    setSurveys([
      { id: '1', title: 'Daily Symptom Survey', type: 'daily', status: 'pending', dueDate: '2026-01-21' },
      { id: '2', title: 'Weekly Energy Level', type: 'weekly', status: 'pending', dueDate: '2026-01-21' },
      { id: '3', title: 'Side Effect Check', type: 'side-effect', status: 'completed', dueDate: '2026-01-20' },
    ]);
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await new Promise(resolve => setTimeout(resolve, 1000));
    loadMockData();
    setRefreshing(false);
  };

  const handleVisitPress = (visit: Visit) => {
    navigation.navigate('VisitDetails', { visit });
  };

  const handleSurveyPress = (survey: Survey) => {
    navigation.navigate('SurveyScreen', { survey });
  };

  const handleNotificationPress = (notification: Notification) => {
    const updated = notifications.map(n => n.id === notification.id ? { ...n, read: true } : n);
    setNotifications(updated);
    
    if (notification.type === 'pending') {
      if (notification.message.includes('survey')) {
        navigation.navigate('Surveys');
      } else if (notification.message.includes('medication')) {
        navigation.navigate('MedicationVerification');
      }
    }
  };

  const handleViewAllNotifications = () => {
    navigation.navigate('Notifications');
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

  const todayVisits = visits.filter(v => v.date === '2026-01-22');
  const upcomingVisits = visits.filter(v => v.date !== '2026-01-22');
  const pendingSurveys = surveys.filter(s => s.status === 'pending');
  const pendingNotifications = notifications.filter(n => !n.read);

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
        {pendingNotifications.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>🔔 {t('pendingTasks')}</Text>
            </View>
            <FlatList
              data={pendingNotifications.slice(0, 3)}
              keyExtractor={item => item.id}
              renderItem={({ item }) => (
                <TouchableOpacity style={styles.notificationCard} onPress={() => handleNotificationPress(item)}>
                  <View style={styles.notificationCardLeft}>
                    <Text style={styles.notificationIconLarge}>{getNotificationIcon(item.type)}</Text>
                  </View>
                  <View style={styles.notificationCardContent}>
                    <Text style={styles.notificationCardTitle}>{item.title}</Text>
                    <Text style={styles.notificationCardMessage}>{item.message}</Text>
                    <Text style={styles.notificationCardTime}>{formatDate(item.timestamp)}</Text>
                  </View>
                </TouchableOpacity>
              )}
            />
          </View>
        )}

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>📅 {t('todayVisits')}</Text>
          </View>
          {todayVisits.length > 0 ? (
            <FlatList
              data={todayVisits}
              keyExtractor={item => item.id}
              renderItem={({ item }) => (
                <TouchableOpacity style={styles.visitCard} onPress={() => handleVisitPress(item)}>
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
              )}
            />
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
            <FlatList
              data={upcomingVisits}
              keyExtractor={item => item.id}
              renderItem={({ item }) => (
                <TouchableOpacity style={styles.visitCard} onPress={() => handleVisitPress(item)}>
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
              )}
            />
          </View>
        )}

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>📋 {t('surveys')}</Text>
          </View>
          <FlatList
            data={surveys}
            keyExtractor={item => item.id}
            renderItem={({ item }) => (
              <TouchableOpacity style={styles.surveyCard} onPress={() => handleSurveyPress(item)}>
                <View style={styles.surveyCardLeft}>
                  <View style={[
                    styles.surveyTypeBadge,
                    { backgroundColor: item.type === 'daily' ? '#dbeafe' : item.type === 'weekly' ? '#fef3c7' : item.type === 'side-effect' ? '#fee2e2' : '#dcfce7' }
                  ]}>
                    <Text style={[
                      styles.surveyTypeText,
                      { color: item.type === 'daily' ? '#3b82f6' : item.type === 'weekly' ? '#f59e0b' : item.type === 'side-effect' ? '#ef4444' : '#10b981' }
                    ]}>
                      {item.type === 'daily' ? 'D' : item.type === 'weekly' ? 'W' : item.type === 'side-effect' ? 'SE' : 'E'}
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
                      {item.status === 'completed' ? '✅ Done' : '⏳ Pending'}
                    </Text>
                  </View>
                </TouchableOpacity>
              )}
          />
        </View>

        <View style={styles.quickActions}>
          <TouchableOpacity style={styles.quickActionCard} onPress={() => navigation.navigate('MedicationVerification')}>
            <Text style={styles.quickActionIcon}>💊</Text>
            <Text style={styles.quickActionTitle}>{t('medicationVerification')}</Text>
            <Text style={styles.quickActionSubtitle}>{t('recordMedicationIntake')}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.quickActionCard} onPress={() => navigation.navigate('SideEffects')}>
            <Text style={styles.quickActionIcon}>⚠️</Text>
            <Text style={styles.quickActionTitle}>{t('sideEffects')}</Text>
            <Text style={styles.quickActionSubtitle}>{t('reportSideEffect')}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.quickActionCard} onPress={() => navigation.navigate('Surveys')}>
            <Text style={styles.quickActionIcon}>📝</Text>
            <Text style={styles.quickActionTitle}>{t('surveys')}</Text>
            <Text style={styles.quickActionSubtitle}>{t('dailySurvey')} & {t('weeklySurvey')}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.quickActionCard} onPress={() => navigation.navigate('Consent')}>
            <Text style={styles.quickActionIcon}>📄</Text>
            <Text style={styles.quickActionTitle}>{t('informedConsent')}</Text>
            <Text style={styles.quickActionSubtitle}>{t('audioVideoConsent')}</Text>
          </TouchableOpacity>
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
});