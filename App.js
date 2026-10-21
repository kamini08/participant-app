import React, { useState } from 'react';
import { Alert, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { AuthProvider, useAuth } from './src/context/AuthContext';
import DashboardScreen from './src/screens/DashboardScreen';
import EmergencyReportScreen from './src/screens/EmergencyReportScreen';
import LoginScreen from './src/screens/LoginScreen';
import MedicationVerificationScreen from './src/screens/MedicationVerificationScreen';
import RemindersScreen from './src/screens/RemindersScreen';
import SymptomTrackerScreen from './src/screens/SymptomTrackerScreen';
import SurveysScreen from './src/screens/SurveysScreen';

const tabs = [
  { id: 'dashboard', label: 'dashboard', icon: '🏠' },
  { id: 'surveys', label: 'surveys', icon: '📝' },
  { id: 'reminders', label: 'notificationsTitle', icon: '🔔' },
  { id: 'symptoms', label: 'sideEffects', icon: '🩺' },
  { id: 'medication', label: 'medication', icon: '💊' },
];

function ParticipantApp() {
  const { isAuthenticated, isLoading, logout, t, user } = useAuth();
  const [activeTab, setActiveTab] = useState('dashboard');

  if (isLoading) {
    return (
      <SafeAreaView style={styles.loading}>
        <Text style={styles.loadingIcon}>🏥</Text>
        <Text style={styles.loadingText}>AIIA CTMS</Text>
      </SafeAreaView>
    );
  }

  if (!isAuthenticated) {
    return <LoginScreen />;
  }

  const navigate = (route) => {
    const tabRoutes = {
      MainTabs: 'dashboard',
      Dashboard: 'dashboard',
      Surveys: 'surveys',
      SurveyScreen: 'surveys',
      Reminders: 'reminders',
      SymptomTracker: 'symptoms',
      SideEffects: 'symptoms',
      EmergencyReport: 'emergency',
      MedicationVerification: 'medication',
    };

    if (tabRoutes[route]) {
      setActiveTab(tabRoutes[route]);
      return;
    }

    Alert.alert('Not available yet', 'This feature is not included in the participant app yet.');
  };

  const screen = {
    dashboard: <DashboardScreen navigation={{ navigate }} />,
    surveys: <SurveysScreen navigation={{ navigate }} />,
    reminders: <RemindersScreen />,
    medication: <MedicationVerificationScreen />,
    symptoms: <SymptomTrackerScreen />,
    emergency: <EmergencyReportScreen />,
  }[activeTab];

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="dark" />
      <View style={styles.topBar}>
        <View>
          <Text style={styles.brand}>AIIA <Text style={styles.brandAccent}>CTMS</Text></Text>
          <Text style={styles.participant}>{user?.participantId || 'Participant account'}</Text>
        </View>
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel={t('logout')}
          onPress={() => logout()}
          style={styles.logoutButton}
        >
          <Text style={styles.logoutText}>{t('logout')}</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.content}>{screen}</View>

      <View style={styles.tabBar}>
        {tabs.map(tab => {
          const selected = activeTab === tab.id;
          return (
            <TouchableOpacity
              key={tab.id}
              accessibilityRole="button"
              accessibilityState={{ selected }}
              onPress={() => setActiveTab(tab.id)}
              style={styles.tab}
            >
              <Text style={[styles.tabIcon, selected && styles.selectedTabText]}>{tab.icon}</Text>
              <Text style={[styles.tabLabel, selected && styles.selectedTabText]}>{t(tab.label)}</Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </SafeAreaView>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <ParticipantApp />
      </AuthProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f4f7fb',
  },
  loading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f4f7fb',
  },
  loadingIcon: {
    fontSize: 40,
    marginBottom: 10,
  },
  loadingText: {
    color: '#17324d',
    fontSize: 18,
    fontWeight: '700',
  },
  topBar: {
    minHeight: 68,
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: '#ffffff',
    borderBottomColor: '#e5eaf0',
    borderBottomWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  brand: {
    color: '#17324d',
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  brandAccent: {
    color: '#16836b',
  },
  participant: {
    color: '#68788a',
    fontSize: 12,
    marginTop: 2,
  },
  logoutButton: {
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 9,
    backgroundColor: '#eff5f3',
  },
  logoutText: {
    color: '#16705d',
    fontSize: 13,
    fontWeight: '700',
  },
  content: {
    flex: 1,
  },
  tabBar: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingTop: 9,
    paddingBottom: 8,
    backgroundColor: '#ffffff',
    borderTopColor: '#e5eaf0',
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
    paddingVertical: 4,
  },
  tabIcon: {
    fontSize: 19,
    opacity: 0.72,
  },
  tabLabel: {
    color: '#6b7787',
    fontSize: 10,
    fontWeight: '600',
  },
  selectedTabText: {
    color: '#16836b',
    opacity: 1,
  },
});
