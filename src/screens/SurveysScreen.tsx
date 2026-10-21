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

interface SurveyQuestion {
  id: string;
  text: string;
  type: 'scale' | 'boolean' | 'text';
  required: boolean;
  scaleLabels?: { min: string; max: string };
}

interface Survey {
  id: string;
  title: string;
  type: 'daily' | 'weekly' | 'side-effect' | 'energy';
  description: string;
  questions: SurveyQuestion[];
  status: 'pending' | 'completed' | 'in-progress';
  dueDate: string;
  completedDate?: string;
  responses?: Record<string, any>;
}

export default function SurveysScreen() {
  const { t } = useAuth();
  const [surveys, setSurveys] = useState<Survey[]>([]);
  const [activeSurvey, setActiveSurvey] = useState<Survey | null>(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [responses, setResponses] = useState<Record<string, any>>({});
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadMockSurveys();
  }, []);

  const loadMockSurveys = () => {
    const today = new Date().toISOString().split('T')[0];
    const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];

    setSurveys([
      {
        id: 'daily-1',
        title: t('dailySurvey'),
        type: 'daily',
        description: 'Rate your symptoms and overall wellbeing for today',
        status: 'pending',
        dueDate: today,
        questions: [
          { id: 'q1', text: 'How would you rate your overall health today?', type: 'scale', required: true, scaleLabels: { min: 'Very Poor', max: 'Excellent' } },
          { id: 'q2', text: 'How is your energy level?', type: 'scale', required: true, scaleLabels: { min: 'Very Low', max: 'Very High' } },
          { id: 'q3', text: 'Rate your pain level', type: 'scale', required: true, scaleLabels: { min: 'No Pain', max: 'Severe Pain' } },
          { id: 'q4', text: 'How well did you sleep last night?', type: 'scale', required: true, scaleLabels: { min: 'Very Poorly', max: 'Very Well' } },
          { id: 'q5', text: 'Rate your appetite', type: 'scale', required: true, scaleLabels: { min: 'Very Poor', max: 'Excellent' } },
          { id: 'q6', text: 'Any new symptoms since yesterday?', type: 'boolean', required: true },
          { id: 'q7', text: 'If yes, please describe', type: 'text', required: false },
        ],
      },
      {
        id: 'weekly-1',
        title: t('weeklySurvey'),
        type: 'weekly',
        description: 'Weekly assessment of your health and treatment experience',
        status: 'pending',
        dueDate: today,
        questions: [
          { id: 'q1', text: 'Overall, how has your week been?', type: 'scale', required: true, scaleLabels: { min: 'Very Difficult', max: 'Very Good' } },
          { id: 'q2', text: 'How has the treatment affected your daily activities?', type: 'scale', required: true, scaleLabels: { min: 'Severely Limited', max: 'No Limitation' } },
          { id: 'q3', text: 'Rate your mood this week', type: 'scale', required: true, scaleLabels: { min: 'Very Low', max: 'Very Positive' } },
          { id: 'q4', text: 'How satisfied are you with the study communication?', type: 'scale', required: true, scaleLabels: { min: 'Very Dissatisfied', max: 'Very Satisfied' } },
          { id: 'q5', text: 'Any concerns about continuing the study?', type: 'boolean', required: true },
        ],
      },
      {
        id: 'energy-1',
        title: t('energyLevelSurvey'),
        type: 'energy',
        description: 'Daily energy level tracking',
        status: 'pending',
        dueDate: today,
        questions: [
          { id: 'q1', text: 'Morning energy level (upon waking)', type: 'scale', required: true, scaleLabels: { min: 'Exhausted', max: 'Energized' } },
          { id: 'q2', text: 'Midday energy level', type: 'scale', required: true, scaleLabels: { min: 'Exhausted', max: 'Energized' } },
          { id: 'q3', text: 'Evening energy level', type: 'scale', required: true, scaleLabels: { min: 'Exhausted', max: 'Energized' } },
        ],
      },
      {
        id: 'side-effect-1',
        title: t('sideEffectSurvey'),
        type: 'side-effect',
        description: 'Weekly side effect assessment',
        status: 'completed',
        dueDate: yesterday,
        completedDate: yesterday,
        responses: { q1: 2, q2: 1, q3: 1, q4: 3 },
        questions: [
          { id: 'q1', text: 'Nausea severity', type: 'scale', required: true, scaleLabels: { min: 'None', max: 'Severe' } },
          { id: 'q2', text: 'Fatigue severity', type: 'scale', required: true, scaleLabels: { min: 'None', max: 'Severe' } },
          { id: 'q3', text: 'Headache severity', type: 'scale', required: true, scaleLabels: { min: 'None', max: 'Severe' } },
          { id: 'q4', text: 'Overall discomfort', type: 'scale', required: true, scaleLabels: { min: 'None', max: 'Severe' } },
        ],
      },
    ]);
  };

  const startSurvey = (survey: Survey) => {
    if (survey.status === 'completed') {
      Alert.alert('Already Completed', 'This survey has already been completed');
      return;
    }
    setActiveSurvey({ ...survey, status: 'in-progress' });
    setCurrentQuestionIndex(0);
    setResponses({});
  };

  const handleResponse = (questionId: string, value: any) => {
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
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      setSurveys(prev => prev.map(s => 
        s.id === activeSurvey.id 
          ? { ...s, status: 'completed', completedDate: new Date().toISOString().split('T')[0], responses }
          : s
      ));
      
      setActiveSurvey(null);
      setSubmitting(false);
      Alert.alert('Success', 'Survey submitted successfully');
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

            {question.type === 'text' && (
              <TextInput
                style={styles.textInput}
                placeholder="Your response..."
                value={responses[question.id] || ''}
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

  const pendingSurveys = surveys.filter(s => s.status === 'pending');
  const completedSurveys = surveys.filter(s => s.status === 'completed');

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
                        {survey.type === 'daily' ? 'D' : survey.type === 'weekly' ? 'W' : survey.type === 'energy' ? 'E' : 'SE'}
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
                      <Text style={styles.surveyStatusTextPending}>⏳ Pending</Text>
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

        {pendingSurveys.length === 0 && completedSurveys.length === 0 && (
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