import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { apiRequest } from '../services/api';

interface Reminder {
  id: string;
  title: string;
  message: string;
  type: string;
  scheduledAt: string;
  read: boolean;
}

const iconForType = (type: string) => {
  if (type === 'APPOINTMENT' || type === 'VISIT_REMINDER') return '📅';
  if (type === 'MEDICATION' || type === 'MEDICATION_DUE') return '💊';
  if (type === 'SURVEY_DUE') return '📝';
  return '🔔';
};

const categoryForType = (type: string) => {
  if (type === 'APPOINTMENT' || type === 'VISIT_REMINDER') return 'Appointment';
  if (type === 'MEDICATION' || type === 'MEDICATION_DUE') return 'Medication';
  if (type === 'SURVEY_DUE') return 'Survey';
  return 'Study update';
};

const dateKeyFor = (date: Date) => new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Asia/Kolkata',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
}).format(date);

const dateLabelFor = (dateString: string) => {
  const date = new Date(dateString);
  const today = new Date();
  if (dateKeyFor(date) === dateKeyFor(today)) return 'Today';
  if (dateKeyFor(date) === dateKeyFor(new Date(today.getTime() + 24 * 60 * 60 * 1000))) return 'Tomorrow';
  if (dateKeyFor(date) === dateKeyFor(new Date(today.getTime() - 24 * 60 * 60 * 1000))) return 'Yesterday';
  return date.toLocaleDateString('en-IN', {
    timeZone: 'Asia/Kolkata',
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });
};

export default function RemindersScreen() {
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadReminders = useCallback(async () => {
    try {
      const result = await apiRequest<{ reminders: Reminder[] }>('/api/participant-app/reminders');
      setReminders(result.reminders);
    } catch (error) {
      console.error('Failed to load participant reminders:', error);
      Alert.alert('Could not load reminders', error instanceof Error ? error.message : 'Please try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadReminders();
  }, [loadReminders]);

  const refresh = async () => {
    setRefreshing(true);
    try {
      await loadReminders();
    } finally {
      setRefreshing(false);
    }
  };

  const markRead = async (reminder: Reminder) => {
    if (reminder.read || reminder.id.startsWith('visit-') || reminder.id.startsWith('medication-')) return;
    try {
      await apiRequest(`/api/participant-app/notifications/${reminder.id}/read`, { method: 'POST' });
      setReminders(current => current.map(item => item.id === reminder.id ? { ...item, read: true } : item));
    } catch (error) {
      Alert.alert('Could not update reminder', error instanceof Error ? error.message : 'Please try again.');
    }
  };

  const groupedReminders = reminders.reduce<Array<{ key: string; label: string; items: Reminder[] }>>((groups, reminder) => {
    const key = dateKeyFor(new Date(reminder.scheduledAt));
    const label = dateLabelFor(reminder.scheduledAt);
    const existingGroup = groups.find(group => group.key === key);
    if (existingGroup) existingGroup.items.push(reminder);
    else groups.push({ key, label, items: [reminder] });
    return groups;
  }, []);
  const unreadCount = reminders.filter(reminder => !reminder.read).length;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <View style={styles.headerCopy}>
            <Text style={styles.eyebrow}>STAY UP TO DATE</Text>
            <Text style={styles.title}>Notifications</Text>
          </View>
          {unreadCount > 0 && (
            <View style={styles.unreadCount}>
              <Text style={styles.unreadCountText}>{unreadCount} new</Text>
            </View>
          )}
        </View>
        <Text style={styles.subtitle}>Your appointments, medication schedule, and study updates.</Text>
      </View>

      {loading ? (
        <View style={styles.loading}>
          <ActivityIndicator color="#16836b" />
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} />}
          showsVerticalScrollIndicator={false}
        >
          {reminders.length ? groupedReminders.map(group => (
            <View key={group.label} style={styles.group}>
              <View style={styles.groupHeading}>
                <Text style={styles.groupTitle}>{group.label}</Text>
                <Text style={styles.groupCount}>{group.items.length}</Text>
              </View>
              {group.items.map(reminder => (
                <TouchableOpacity
                  key={reminder.id}
                  accessibilityRole="button"
                  accessibilityLabel={`${categoryForType(reminder.type)}: ${reminder.title}${reminder.read ? '' : ', unread'}`}
                  disabled={reminder.read || reminder.id.startsWith('visit-') || reminder.id.startsWith('medication-')}
                  onPress={() => void markRead(reminder)}
                  style={[styles.card, !reminder.read && styles.unreadCard]}
                >
                  <View style={[styles.iconWrap, !reminder.read && styles.unreadIconWrap]}>
                    <Text style={styles.icon}>{iconForType(reminder.type)}</Text>
                  </View>
                  <View style={styles.reminderContent}>
                    <View style={styles.cardHeading}>
                      <Text style={styles.category}>{categoryForType(reminder.type)}</Text>
                      {!reminder.read && <Text style={styles.newLabel}>NEW</Text>}
                    </View>
                    <Text style={styles.reminderTitle}>{reminder.title}</Text>
                    <Text style={styles.message}>{reminder.message}</Text>
                    <Text style={styles.time}>
                      {new Date(reminder.scheduledAt).toLocaleTimeString('en-IN', {
                        timeZone: 'Asia/Kolkata',
                        hour: 'numeric',
                        minute: '2-digit',
                      })}
                    </Text>
                  </View>
                  {!reminder.read && <View style={styles.unreadDot} />}
                </TouchableOpacity>
              ))}
            </View>
          )) : (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyIcon}>✓</Text>
              <Text style={styles.emptyTitle}>No reminders right now</Text>
              <Text style={styles.emptyMessage}>Your appointments and study updates will appear here.</Text>
            </View>
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f8f7',
  },
  header: {
    backgroundColor: '#ffffff',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 18,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#dbe3e8',
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerCopy: {
    flex: 1,
  },
  eyebrow: {
    color: '#16836b',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.2,
    marginBottom: 4,
  },
  title: {
    color: '#17324d',
    fontSize: 26,
    fontWeight: '800',
  },
  subtitle: {
    color: '#64748b',
    fontSize: 14,
    lineHeight: 20,
    marginTop: 6,
  },
  unreadCount: {
    backgroundColor: '#e8f5f0',
    borderRadius: 18,
    paddingHorizontal: 11,
    paddingVertical: 7,
  },
  unreadCountText: {
    color: '#16836b',
    fontSize: 12,
    fontWeight: '700',
  },
  list: {
    padding: 16,
    gap: 20,
    flexGrow: 1,
  },
  loading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  card: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    backgroundColor: '#ffffff',
    borderRadius: 16,
    borderColor: '#e2e8f0',
    borderWidth: 1,
    padding: 16,
    marginBottom: 10,
  },
  unreadCard: {
    borderColor: '#b7ddcf',
    backgroundColor: '#fcfefd',
    borderLeftWidth: 3,
    borderLeftColor: '#16836b',
  },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f0f5f4',
  },
  unreadIconWrap: {
    backgroundColor: '#e8f5f0',
  },
  icon: {
    fontSize: 21,
  },
  reminderContent: {
    flex: 1,
  },
  group: {
    gap: 0,
  },
  groupHeading: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
    paddingHorizontal: 2,
  },
  groupTitle: {
    color: '#334155',
    fontSize: 16,
    fontWeight: '800',
  },
  groupCount: {
    minWidth: 22,
    textAlign: 'center',
    overflow: 'hidden',
    color: '#64748b',
    backgroundColor: '#e9eef1',
    fontSize: 11,
    fontWeight: '700',
    borderRadius: 12,
    paddingHorizontal: 6,
    paddingVertical: 3,
  },
  cardHeading: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 5,
  },
  category: {
    color: '#16836b',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  newLabel: {
    color: '#16836b',
    fontSize: 10,
    fontWeight: '800',
  },
  reminderTitle: {
    color: '#23384b',
    fontSize: 16,
    fontWeight: '700',
    lineHeight: 21,
    marginBottom: 5,
  },
  message: {
    color: '#64748b',
    fontSize: 13,
    lineHeight: 19,
  },
  time: {
    color: '#64748b',
    fontSize: 12,
    fontWeight: '600',
    marginTop: 8,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#16836b',
    marginTop: 5,
  },
  emptyCard: {
    flex: 1,
    minHeight: 220,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 24,
  },
  emptyIcon: {
    color: '#16836b',
    fontSize: 30,
    fontWeight: '700',
    marginBottom: 12,
  },
  emptyTitle: {
    color: '#17324d',
    fontSize: 17,
    fontWeight: '700',
    marginBottom: 5,
  },
  emptyMessage: {
    color: '#64748b',
    fontSize: 13,
    lineHeight: 19,
    textAlign: 'center',
  },
});
