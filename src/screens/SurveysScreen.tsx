import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../context/AuthContext';
import { apiRequest } from '../services/api';

type SurveyAnswer = string | number | boolean | null;

interface SurveyQuestion {
  id: string;
  text: string;
  type: 'scale' | 'boolean' | 'text' | 'choice';
  required: boolean;
  scaleLabels?: { min: string; max: string };
  options?: string[];
}

interface Survey {
  id: string;
  title: string;
  type: 'daily' | 'weekly' | 'side-effect' | 'energy' | 'other';
  description: string;
  questions: SurveyQuestion[];
  status: 'pending' | 'completed' | 'in-progress' | 'missed';
  dueDate: string;
  completedDate?: string;
  responses?: Record<string, SurveyAnswer>;
}

interface ApiSurvey {
  id: string;
  surveyType: string;
  status: string;
  scheduledDate: string;
  completedAt: string | null;
  responses: Record<string, unknown>;
}

interface SurveysScreenProps {
  navigation: {
    navigate: (route: string) => void;
  };
}

export default function SurveysScreen({ navigation }: SurveysScreenProps) {
  const { t } = useAuth();
  const [surveys, setSurveys] = useState<Survey[]>([]);
  const [activeSurvey, setActiveSurvey] = useState<Survey | null>(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [responses, setResponses] = useState<Record<string, SurveyAnswer>>({});
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    void loadSurveys();
  }, []);

  const loadSurveys = async () => {
    try {
      const { surveys: records } = await apiRequest<{ surveys: ApiSurvey[] }>('/api/participant-app/surveys');
      setSurveys(records.map(record => {
        const type = record.surveyType === 'WEEKLY' ? 'weekly'
          : record.surveyType === 'SIDE_EFFECT' ? 'side-effect'
            : record.surveyType === 'ENERGY_LEVEL' ? 'energy'
              : record.surveyType === 'DAILY' ? 'daily' : 'other';
        const title = type === 'daily' ? t('dailySurvey')
          : type === 'weekly' ? t('weeklySurvey')
            : type === 'side-effect' ? t('sideEffectSurvey')
              : type === 'energy' ? t('energyLevelSurvey')
                : record.surveyType.replaceAll('_', ' ');
        const storedResponses = Object.fromEntries(
          Object.entries(record.responses || {}).filter((entry): entry is [string, SurveyAnswer] =>
            entry[1] === null || ['string', 'number', 'boolean'].includes(typeof entry[1])
          )
        );
        return {
          id: record.id,
          title,
          type,
          description: 'Study assessment',
          questions: [],
          dueDate: record.scheduledDate,
          status: record.status === 'COMPLETED' ? 'completed'
            : record.status === 'IN_PROGRESS' ? 'in-progress'
              : record.status === 'MISSED' || record.status === 'EXEMPT' ? 'missed' : 'pending',
          completedDate: record.completedAt || undefined,
          responses: storedResponses,
        };
      }));
    } catch (error) {
      console.error('Failed to load participant surveys:', error);
      Alert.alert('Could not load surveys', error instanceof Error ? error.message : 'Please try again.');
    }
  };

  const startSurvey = async (survey: Survey) => {
    if (survey.status === 'completed' || survey.status === 'missed') {
      Alert.alert(survey.status === 'completed' ? 'Already Completed' : 'Survey unavailable', survey.status === 'completed'
        ? 'This survey has already been completed'
        : 'This survey is no longer available. Please contact your study team if you need help.');
      return;
    }
    try {
      const { questions } = await apiRequest<{ questions: SurveyQuestion[] }>(
        `/api/participant-app/surveys/${survey.id}/questionnaire`
      );
      if (questions.length === 0) {
        Alert.alert('Survey unavailable', 'This survey has no questions configured yet. Please contact your study team.');
        return;
      }
      await apiRequest(`/api/participant-app/surveys/${survey.id}/start`, { method: 'POST' });
      setActiveSurvey({ ...survey, questions, status: 'in-progress' });
      setCurrentQuestionIndex(0);
      setResponses(survey.responses || {});
    } catch (error) {
      Alert.alert('Could not start survey', error instanceof Error ? error.message : 'Please try again.');
    }
  };

  const handleResponse = (questionId: string, value: SurveyAnswer) => {
    setResponses(prev => ({ ...prev, [questionId]: value }));
  };

  const nextQuestion = () => {
    if (activeSurvey && currentQuestionIndex < activeSurvey.questions.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1);
    }
  };

  const previousQuestion = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(prev => prev - 1);
    }
  };

  const submitSurvey = async () => {
    if (!activeSurvey) return;
    
    const currentQuestion = activeSurvey.questions[currentQuestionIndex];
    if (currentQuestion.required && (responses[currentQuestion.id] === undefined || responses[currentQuestion.id] === '')) {
      Alert.alert('Required', 'Please answer this question before continuing');
      return;
    }

    if (currentQuestionIndex === activeSurvey.questions.length - 1) {
      setSubmitting(true);
      try {
        await apiRequest(`/api/participant-app/surveys/${activeSurvey.id}/submit`, {
          method: 'POST',
          body: { responses },
        });
        setSurveys(prev => prev.map(s =>
          s.id === activeSurvey.id
            ? { ...s, status: 'completed', completedDate: new Date().toISOString(), responses }
            : s
        ));
        setActiveSurvey(null);
        Alert.alert('Thank you', 'Thank you for your feedback!', [
          { text: 'OK', onPress: () => navigation.navigate('Dashboard') },
        ]);
      } catch (error) {
        Alert.alert('Could not submit survey', error instanceof Error ? error.message : 'Please try again.');
      } finally {
        setSubmitting(false);
      }
    } else {
      nextQuestion();
    }
  };

  const skipQuestion = () => {
    if (currentQuestionIndex === activeSurvey!.questions.length - 1) {
      submitSurvey();
    } else {
      nextQuestion();
    }
  };

  const getStatusColor = (status: Survey['status']) => {
    switch (status) {
      case 'pending': return '#f59e0b';
      case 'completed': return '#10b981';
      case 'in-progress': return '#3b82f6';
      case 'missed': return '#ef4444';
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' });
  };

  if (activeSurvey) {
    const question = activeSurvey.questions[currentQuestionIndex];
    const progress = ((currentQuestionIndex + 1) / activeSurvey.questions.length) * 100;

    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.surveyHeader}>
          <TouchableOpacity onPress={() => { setActiveSurvey(null); setResponses({}); }}>
            <Text style={styles.closeButton}>✕</Text>
          </TouchableOpacity>
          <Text style={styles.surveyTitle}>{activeSurvey.title}</Text>
          <View style={styles.progressBar}>
            <View style={[styles.progressFill, { width: `${progress}%` }]} />
          </View>
          <Text style={styles.progressText}>
            Question {currentQuestionIndex + 1} of {activeSurvey.questions.length}
          </Text>
        </View>

        <ScrollView contentContainerStyle={styles.surveyContent} showsVerticalScrollIndicator={false}>
          <View style={styles.questionCard}>
            <Text style={styles.questionNumber}>Q{currentQuestionIndex + 1}</Text>
            <Text style={styles.questionText}>{question.text}</Text>
            {question.required && <Text style={styles.requiredBadge}>Required</Text>}

            {question.type === 'scale' && (
              <View style={styles.scaleContainer}>
                <View style={styles.scaleLabels}>
                  <Text style={styles.scaleLabelMin}>{question.scaleLabels?.min}</Text>
                  <Text style={styles.scaleLabelMax}>{question.scaleLabels?.max}</Text>
                </View>
                <View style={styles.scaleButtons}>
                  {[1, 2, 3, 4, 5].map(num => (
                    <TouchableOpacity
                      key={num}
                      style={[
                        styles.scaleButton,
                        responses[question.id] === num && styles.scaleButtonActive,
                      ]}
                      onPress={() => handleResponse(question.id, num)}
                    >
                      <Text style={[
                        styles.scaleButtonText,
                        responses[question.id] === num && styles.scaleButtonTextActive,
                      ]}>
                        {num}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
                {responses[question.id] && (
                  <Text style={styles.scaleSelected}>Selected: {responses[question.id]} / 5</Text>
                )}
              </View>
            )}

            {question.type === 'boolean' && (
              <View style={styles.booleanContainer}>
                <TouchableOpacity
                  style={[
                    styles.booleanButton,
                    responses[question.id] === true && styles.booleanButtonActive,
                  ]}
                  onPress={() => handleResponse(question.id, true)}
                >
                  <Text style={[
                    styles.booleanButtonText,
                    responses[question.id] === true && styles.booleanButtonTextActive,
                  ]}>
                    Yes
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.booleanButton,
                    responses[question.id] === false && styles.booleanButtonActive,
                  ]}
                  onPress={() => handleResponse(question.id, false)}
                >
                  <Text style={[
                    styles.booleanButtonText,
                    responses[question.id] === false && styles.booleanButtonTextActive,
                  ]}>
                    No
                  </Text>
                </TouchableOpacity>
              </View>
            )}

            {question.type === 'choice' && (
              <View style={styles.choiceContainer}>
                {(question.options || []).map(option => {
                  const selected = responses[question.id] === option;
                  return (
                    <TouchableOpacity
                      key={option}
                      accessibilityRole="button"
                      accessibilityState={{ selected }}
                      style={[styles.choiceButton, selected && styles.choiceButtonActive]}
                      onPress={() => handleResponse(question.id, option)}
                    >
                      <Text style={[styles.choiceButtonText, selected && styles.choiceButtonTextActive]}>
                        {option}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}

            {question.type === 'text' && (
              <TextInput
                style={styles.textInput}
                placeholder="Your response..."
                value={typeof responses[question.id] === 'string' ? String(responses[question.id]) : ''}
                onChangeText={text => handleResponse(question.id, text)}
                multiline
                numberOfLines={4}
              />
            )}
          </View>

          <View style={styles.navigationButtons}>
            {currentQuestionIndex > 0 && (
              <TouchableOpacity style={styles.navButtonSecondary} onPress={previousQuestion}>
                <Text style={styles.navButtonText}>← Previous</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={[
                styles.navButtonPrimary,
                submitting && styles.buttonDisabled,
              ]}
              onPress={submitSurvey}
              disabled={submitting}
            >
              {submitting ? (
                <ActivityIndicator size="small" color="white" />
              ) : (
                <Text style={styles.navButtonTextPrimary}>
                  {currentQuestionIndex === activeSurvey.questions.length - 1 ? 'Submit' : 'Next →'}
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  const pendingSurveys = surveys.filter(s => s.status === 'pending' || s.status === 'in-progress');
  const completedSurveys = surveys.filter(s => s.status === 'completed');
  const unavailableSurveys = surveys.filter(s => s.status === 'missed');

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>{t('surveys')}</Text>
        <Text style={styles.subtitle}>Track your health and wellbeing</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {pendingSurveys.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>📋 Pending Surveys</Text>
            <View style={styles.surveysList}>
              {pendingSurveys.map(survey => (
                <TouchableOpacity key={survey.id} style={styles.surveyCard} onPress={() => startSurvey(survey)}>
                  <View style={styles.surveyCardLeft}>
                    <View style={[
                      styles.surveyTypeBadge,
                      { backgroundColor: survey.type === 'daily' ? '#dbeafe' : survey.type === 'weekly' ? '#fef3c7' : survey.type === 'energy' ? '#dcfce7' : '#fee2e2' }
                    ]}>
                      <Text style={[
                        styles.surveyTypeText,
                        { color: survey.type === 'daily' ? '#3b82f6' : survey.type === 'weekly' ? '#f59e0b' : survey.type === 'energy' ? '#10b981' : '#ef4444' }
                      ]}>
                        {survey.type === 'daily' ? 'D' : survey.type === 'weekly' ? 'W' : survey.type === 'energy' ? 'E' : survey.type === 'side-effect' ? 'SE' : 'A'}
                      </Text>
                    </View>
                  </View>
                  <View style={styles.surveyCardContent}>
                    <Text style={styles.surveyCardTitle}>{survey.title}</Text>
                    <Text style={styles.surveyCardDescription}>{survey.description}</Text>
                    <Text style={styles.surveyCardMeta}>Due: {formatDate(survey.dueDate)} • {survey.questions.length} questions</Text>
                  </View>
                  <View style={styles.surveyCardRight}>
                    <Text style={[
                      styles.surveyStatusBadge,
                      { backgroundColor: '#fef3c7' }
                    ]}>
                      <Text style={styles.surveyStatusTextPending}>{survey.status === 'in-progress' ? '▶ In progress' : '⏳ Pending'}</Text>
                    </Text>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {completedSurveys.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>✅ Completed Surveys</Text>
            <View style={styles.surveysList}>
              {completedSurveys.map(survey => (
                <View key={survey.id} style={styles.surveyCardCompleted}>
                  <View style={styles.surveyCardLeft}>
                    <View style={[
                      styles.surveyTypeBadge,
                      { backgroundColor: survey.type === 'daily' ? '#dbeafe' : survey.type === 'weekly' ? '#fef3c7' : survey.type === 'energy' ? '#dcfce7' : '#fee2e2' }
                    ]}>
                      <Text style={[
                        styles.surveyTypeText,
                        { color: survey.type === 'daily' ? '#3b82f6' : survey.type === 'weekly' ? '#f59e0b' : survey.type === 'energy' ? '#10b981' : '#ef4444' }
                      ]}>
                        {survey.type === 'daily' ? 'D' : survey.type === 'weekly' ? 'W' : survey.type === 'energy' ? 'E' : 'SE'}
                      </Text>
                    </View>
                  </View>
                  <View style={styles.surveyCardContent}>
                    <Text style={styles.surveyCardTitle}>{survey.title}</Text>
                    <Text style={styles.surveyCardMeta}>Completed: {survey.completedDate ? formatDate(survey.completedDate) : 'Recently'}</Text>
                  </View>
                  <View style={styles.surveyCardRight}>
                    <Text style={[
                      styles.surveyStatusBadge,
                      { backgroundColor: '#dcfce7' }
                    ]}>
                      <Text style={styles.surveyStatusTextCompleted}>✅ Done</Text>
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          </View>
        )}

        {unavailableSurveys.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Unavailable Surveys</Text>
            <View style={styles.surveysList}>
              {unavailableSurveys.map(survey => (
                <View key={survey.id} style={styles.surveyCardCompleted}>
                  <View style={styles.surveyCardContent}>
                    <Text style={styles.surveyCardTitle}>{survey.title}</Text>
                    <Text style={styles.surveyCardDescription}>{survey.description}</Text>
                  </View>
                  <Text style={[styles.surveyStatusBadge, { color: '#b91c1c' }]}>Missed</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {pendingSurveys.length === 0 && completedSurveys.length === 0 && unavailableSurveys.length === 0 && (
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateIcon}>📋</Text>
            <Text style={styles.emptyStateTitle}>No Surveys Available</Text>
            <Text style={styles.emptyStateMessage}>Check back later for new surveys</Text>
          </View>
        )}
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
    paddingHorizontal: 16,
    paddingVertical: 20,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
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
  scrollContent: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    paddingBottom: 100,
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
  surveysList: {
    gap: 12,
  },
  surveyCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  surveyCardCompleted: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  surveyCardLeft: {
    marginRight: 16,
  },
  surveyTypeBadge: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  surveyTypeText: {
    fontSize: 14,
    fontWeight: '700',
  },
  surveyCardContent: {
    flex: 1,
  },
  surveyCardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 4,
  },
  surveyCardDescription: {
    fontSize: 13,
    color: '#6b7280',
    marginBottom: 4,
  },
  surveyCardMeta: {
    fontSize: 12,
    color: '#9ca3af',
  },
  surveyCardRight: {
    marginLeft: 12,
  },
  surveyStatusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 100,
  },
  surveyStatusTextPending: {
    fontSize: 12,
    fontWeight: '600',
    color: '#f59e0b',
  },
  surveyStatusTextCompleted: {
    fontSize: 12,
    fontWeight: '600',
    color: '#10b981',
  },
  emptyState: {
    padding: 48,
    alignItems: 'center',
  },
  emptyStateIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  emptyStateTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  emptyStateMessage: {
    fontSize: 14,
    color: '#6b7280',
  },

  // Survey active styles
  surveyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  closeButton: {
    fontSize: 24,
    color: '#9ca3af',
  },
  surveyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1e293b',
  },
  progressBar: {
    height: 4,
    backgroundColor: '#e2e8f0',
    borderRadius: 2,
    marginTop: 8,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#3b82f6',
    borderRadius: 2,
  },
  progressText: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 4,
    textAlign: 'center',
  },
  surveyContent: {
    paddingHorizontal: 16,
    paddingVertical: 20,
    paddingBottom: 100,
  },
  questionCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 24,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  questionNumber: {
    fontSize: 12,
    fontWeight: '600',
    color: '#3b82f6',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  questionText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 8,
    lineHeight: 26,
  },
  requiredBadge: {
    fontSize: 11,
    fontWeight: '600',
    color: '#ef4444',
    backgroundColor: '#fef2f2',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 100,
    alignSelf: 'flex-start',
  },
  scaleContainer: {
    marginTop: 16,
  },
  scaleLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  scaleLabelMin: {
    fontSize: 12,
    color: '#6b7280',
  },
  scaleLabelMax: {
    fontSize: 12,
    color: '#6b7280',
  },
  scaleButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  scaleButton: {
    flex: 1,
    aspectRatio: 1,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#d1d5db',
    justifyContent: 'center',
    alignItems: 'center',
  },
  scaleButtonActive: {
    backgroundColor: '#3b82f6',
    borderColor: '#3b82f6',
  },
  scaleButtonText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#374151',
  },
  scaleButtonTextActive: {
    color: 'white',
  },
  scaleSelected: {
    marginTop: 12,
    fontSize: 14,
    fontWeight: '600',
    color: '#3b82f6',
    textAlign: 'center',
  },
  booleanContainer: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 16,
  },
  booleanButton: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#d1d5db',
    alignItems: 'center',
  },
  booleanButtonActive: {
    backgroundColor: '#dbeafe',
    borderColor: '#3b82f6',
  },
  booleanButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
  },
  booleanButtonTextActive: {
    color: '#3b82f6',
  },
  choiceContainer: {
    gap: 10,
    marginTop: 16,
  },
  choiceButton: {
    padding: 15,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#d1d5db',
    backgroundColor: '#ffffff',
  },
  choiceButtonActive: {
    backgroundColor: '#e9f5f1',
    borderColor: '#16836b',
  },
  choiceButtonText: {
    color: '#374151',
    fontSize: 15,
    fontWeight: '600',
  },
  choiceButtonTextActive: {
    color: '#16705d',
  },
  textInput: {
    marginTop: 12,
    padding: 16,
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#d1d5db',
    fontSize: 16,
    color: '#1e293b',
    minHeight: 100,
    textAlignVertical: 'top',
  },
  navigationButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 24,
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'transparent',
  },
  navButtonSecondary: {
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 10,
  },
  navButtonPrimary: {
    backgroundColor: '#3b82f6',
    borderRadius: 10,
    paddingHorizontal: 32,
    paddingVertical: 14,
    alignItems: 'center',
    flex: 1,
    marginLeft: 12,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  navButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
  },
  navButtonTextPrimary: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
});