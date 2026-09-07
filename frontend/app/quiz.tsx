import { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { api } from '../utils/api';
import { useNationStore } from '../store/nationStore';
import { useAccountStore } from '../store/accountStore';
import { QuizQuestion, QuizAnswer, WheelResult } from '../types';
import AsyncStorage from '@react-native-async-storage/async-storage';
import FlagCreator from '../components/FlagCreator';
import { Ionicons } from '@expo/vector-icons';
import { glassAlert, glassConfirm } from '../components/GlassModal';
import StatusDots from '../components/StatusDots';
import { shortNameError } from '../utils/nationName';

export default function Quiz() {
  const router = useRouter();
  const { setNation, saveNation } = useNationStore();
  const { user, token, loadSession } = useAccountStore();
  
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState<QuizAnswer[]>([]);
  const [nationName, setNationName] = useState('');
  const [motto, setMotto] = useState('');
  const [mottoHint, setMottoHint] = useState<string | null>(null);
  const [currency, setCurrency] = useState('Credits');
  const [nationalAnimal, setNationalAnimal] = useState('Eagle');
  const [flagBase64, setFlagBase64] = useState('');
  const [wheelResult, setWheelResult] = useState<WheelResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showFinalForm, setShowFinalForm] = useState(false);
  const [showFlagCreator, setShowFlagCreator] = useState(false);

  useEffect(() => {
    (async () => {
      await loadSession();
      const session = useAccountStore.getState();
      if (!session.token || !session.user?.id) {
        router.replace('/signin');
        return;
      }
      // The wheels come first — prefer the confirm blob, else the server lock.
      let rawWheel = await AsyncStorage.getItem('pending_wheel_result');
      if (!rawWheel) {
        try {
          const prog = await api.getWheelsProgress();
          const saved = prog?.result;
          if (saved?.government_form && saved?.government_subtype && saved?.territorial_structure && saved?.style_modifier) {
            rawWheel = JSON.stringify(saved);
            await AsyncStorage.setItem('pending_wheel_result', rawWheel);
          }
        } catch (pe) {
          console.warn('Wheel progress unavailable', pe);
        }
      }
      if (rawWheel) {
        try {
          setWheelResult(JSON.parse(rawWheel));
        } catch (_) {}
      }
      loadQuiz();
    })();
  }, []);

  const loadQuiz = async () => {
    try {
      const response = await api.getQuiz();
      setQuestions(response.questions);
      setLoading(false);
    } catch (error) {
      console.error('Error loading quiz:', error);
      await glassAlert({ title: 'Error', message: 'Failed to load quiz questions' });
    }
  };

  const handleAnswer = (answerIndex: number) => {
    const newAnswers = [
      ...answers,
      { question_id: questions[currentQuestion].id, answer_index: answerIndex },
    ];
    setAnswers(newAnswers);

    if (currentQuestion < questions.length - 1) {
      setCurrentQuestion(currentQuestion + 1);
    } else {
      // Quiz done → nation name + flag form. Race is chosen on a later screen.
      setShowFinalForm(true);
    }
  };

  const submitQuiz = async () => {
    if (!nationName.trim()) {
      await glassAlert({ title: 'Required', message: 'Please enter a nation name' });
      return;
    }
    const nameErr = shortNameError(nationName);
    if (nameErr) {
      await glassAlert({ title: 'Short name only', message: nameErr });
      return;
    }

    if (!flagBase64) {
      await glassAlert({ title: 'Flag Required', message: 'Please design a flag for your nation' });
      return;
    }

    setSubmitting(true);
    
    try {
      await loadSession();
      const account = useAccountStore.getState().user;
      if (!account?.id) {
        await glassAlert({ title: 'Sign in required', message: 'Create an account before founding a nation.' });
        router.replace('/signin');
        setSubmitting(false);
        return;
      }
      const userId = account.id;
      const selectedWorldId = await AsyncStorage.getItem('selected_world_id');
      const quizResult = {
        answers,
        nation_name: nationName.trim(),
        motto: motto || undefined,
        flag_base64: flagBase64 || undefined,
        currency: currency || 'Credits',
        national_animal: nationalAnimal || 'Eagle',
        ...(wheelResult ? { wheel_result: wheelResult } : {}),
      };
      await AsyncStorage.setItem('pending_nation', JSON.stringify({
        userId,
        quizResult,
        worldId: selectedWorldId || undefined,
      }));
      await AsyncStorage.removeItem('pending_wheel_result');
      router.replace('/race');
    } catch (error: any) {
      console.error('Error saving quiz:', error);
      await glassAlert({ title: 'Error', message: `Failed to start founding: ${error.message || 'Unknown error'}` });
      setSubmitting(false);
    }

  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <StatusDots status="Loading" color="#00E0C7" />
        <Text style={styles.loadingText}>Loading quiz...</Text>
      </View>
    );
  }

  // Race selection moved to a dedicated /race screen (after the quiz).
  if (showFinalForm) {
    return (
      <SafeAreaView style={styles.container}>
        <LinearGradient colors={['#0B0F14', '#11171F']} style={styles.gradient}>
          <ScrollView contentContainerStyle={styles.scrollContent}>
            <Text style={styles.title}>Name Your Nation</Text>
            
            {submitting && (
              <View style={styles.loadingContainer}>
                <StatusDots status="Loading" color="#00E0C7" />
                <Text style={styles.loadingText}>Creating your nation...</Text>
                <Text style={styles.loadingSubtext}>This may take 15-20 seconds</Text>
              </View>
            )}
            
            {!submitting && (
              <View style={styles.formContainer}>
                <Text style={styles.label}>Short name *</Text>
                <TextInput
                  style={styles.input}
                  value={nationName}
                  onChangeText={setNationName}
                  placeholder="Sigracia"
                  placeholderTextColor="rgba(243,246,250,0.48)"
                  maxLength={32}
                />
                <Text style={styles.hint}>
                  Place name only — Germany, not The Federal Republic of Germany. Wheels add the title.
                </Text>

                <Text style={styles.label}>National Motto (Optional)</Text>
                <TextInput
                  style={styles.input}
                  value={motto}
                  onChangeText={(t) => {
                    setMotto(t);
                    const lower = t.toLowerCase();
                    const isAutocratic = wheelResult?.government_form === 'autocracy' || wheelResult?.government_subtype?.toLowerCase().includes('dictator');
                    const liberalMarkers = ['freedom', 'liberty', 'democracy', 'equality', 'rights', 'justice for all', 'will of the people'];
                    if (isAutocratic && lower.length > 2 && liberalMarkers.some(m => lower.includes(m))) {
                      setMottoHint('For an autocratic nation, this motto may sound out of tune. Consider strength, order, glory, or prosperity instead.');
                    } else {
                      setMottoHint(null);
                    }
                  }}
                  placeholder="Liberty, Equality, Prosperity"
                  placeholderTextColor="rgba(243,246,250,0.48)"
                />
                {mottoHint ? (
                  <View style={styles.hintRow}>
                    <Ionicons name="information-circle" size={14} color="#F2C94C" style={{ marginRight: 6 }} />
                    <Text style={[styles.hint, { color: '#F2C94C', flex: 1, marginTop: 0, marginBottom: 0 }]}>{mottoHint}</Text>
                  </View>
                ) : null}

                <Text style={styles.label}>Currency Name</Text>
                <TextInput
                  style={styles.input}
                  value={currency}
                  onChangeText={setCurrency}
                  placeholder="Credits"
                  placeholderTextColor="rgba(243,246,250,0.48)"
                />

                <Text style={styles.label}>National Animal</Text>
                <TextInput
                  style={styles.input}
                  value={nationalAnimal}
                  onChangeText={setNationalAnimal}
                  placeholder="Eagle"
                  placeholderTextColor="rgba(243,246,250,0.48)"
                />

                <Text style={styles.label}>National Flag *</Text>
                <TouchableOpacity 
                  style={styles.flagButton} 
                  onPress={() => setShowFlagCreator(true)}
                >
                  <Text style={styles.flagButtonText}>
                    {flagBase64 ? 'Flag designed' : 'Design your flag'}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.submitButton}
                  onPress={submitQuiz}
                >
                  <Text style={styles.submitButtonText}>Found Your Nation</Text>
                </TouchableOpacity>
              </View>
            )}

            {/* Flag Creator Modal */}
            <Modal
              visible={showFlagCreator}
              animationType="slide"
              presentationStyle="pageSheet"
              onRequestClose={() => setShowFlagCreator(false)}
            >
              <View style={styles.modalContainer}>
                <View style={styles.modalHeader}>
                  <TouchableOpacity onPress={() => setShowFlagCreator(false)}>
                    <Text style={styles.modalClose}>Cancel</Text>
                  </TouchableOpacity>
                  <Text style={styles.modalHeaderTitle}>Flag Designer</Text>
                  <View style={{ width: 60 }} />
                </View>
                <FlagCreator 
                  onFlagCreated={(flag) => {
                    setFlagBase64(flag);
                    setShowFlagCreator(false);
                  }}
                />
              </View>
            </Modal>
          </ScrollView>
        </LinearGradient>
      </SafeAreaView>
    );
  }

  const question = questions[currentQuestion];
  const progress = ((currentQuestion + 1) / questions.length) * 100;

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient colors={['#0B0F14', '#11171F']} style={styles.gradient}>
        <View style={styles.header}>
          <Text style={styles.progressText}>
            Question {currentQuestion + 1} of {questions.length}
          </Text>
          <View style={styles.progressBar}>
            <View style={[styles.progressFill, { width: `${progress}%` }]} />
          </View>
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent}>
          <Text style={styles.questionText}>{question.question}</Text>

          <View style={styles.optionsContainer}>
            {question.options.map((option, index) => (
              <TouchableOpacity
                key={index}
                style={styles.optionButton}
                onPress={() => handleAnswer(index)}
              >
                <Text style={styles.optionText}>{option}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>
      </LinearGradient>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0B0F14',
  },
  gradient: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#0B0F14',
    padding: 32,
  },
  loadingText: {
    marginTop: 16,
    color: '#F3F6FA',
    fontSize: 18,
    fontWeight: '600',
  },
  loadingSubtext: {
    marginTop: 8,
    color: 'rgba(243,246,250,0.70)',
    fontSize: 14,
    textAlign: 'center',
  },
  header: {
    padding: 24,
  },
  progressText: {
    color: 'rgba(243,246,250,0.70)',
    fontSize: 14,
    marginBottom: 8,
  },
  progressBar: {
    height: 4,
    backgroundColor: '#11171F',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#00E0C7',
  },
  scrollContent: {
    padding: 24,
  },
  questionText: {
    fontSize: 22,
    fontWeight: '600',
    color: '#F3F6FA',
    marginBottom: 32,
    lineHeight: 32,
  },
  optionsContainer: {
    gap: 12,
  },
  optionButton: {
    backgroundColor: '#11171F',
    padding: 20,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  optionText: {
    color: '#F3F6FA',
    fontSize: 16,
    lineHeight: 24,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#F3F6FA',
    marginBottom: 32,
    textAlign: 'center',
  },
  formContainer: {
    gap: 20,
  },
  label: {
    color: 'rgba(243,246,250,0.70)',
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#11171F',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    borderRadius: 8,
    padding: 16,
    fontSize: 16,
    color: '#F3F6FA',
  },
  hint: {
    color: 'rgba(243,246,250,0.55)',
    fontSize: 13,
    lineHeight: 18,
    marginTop: -4,
    marginBottom: 8,
  },
  hintRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginTop: -4,
    marginBottom: 8,
  },
  flagButton: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  flagButtonText: {
    color: '#F3F6FA',
    fontSize: 16,
    fontWeight: '500',
  },
  flagNote: {
    color: '#27D17A',
    fontSize: 14,
    textAlign: 'center',
  },
  submitButton: {
    backgroundColor: '#00E0C7',
    padding: 18,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 16,
  },
  submitButtonDisabled: {
    opacity: 0.5,
  },
  submitButtonText: {
    color: '#F3F6FA',
    fontSize: 18,
    fontWeight: '600',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#0B0F14',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.08)',
    backgroundColor: '#11171F',
  },
  modalHeaderTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#F3F6FA',
  },
  modalClose: {
    fontSize: 16,
    color: '#00E0C7',
    fontWeight: '500',
  },
  // Race selection styles
  subtitle: {
    fontSize: 16,
    color: 'rgba(243,246,250,0.70)',
    textAlign: 'center',
    marginBottom: 24,
  },
  raceContainer: {
    gap: 16,
  },
  raceCard: {
    backgroundColor: '#11171F',
    borderRadius: 16,
    padding: 20,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  raceCardSelected: {
    borderColor: '#00E0C7',
    backgroundColor: '#1E3A5F',
  },
  raceHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  raceIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#0B0F14',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  raceTitleContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  raceName: {
    fontSize: 20,
    fontWeight: '700',
    color: '#F3F6FA',
  },
  raceNameSelected: {
    color: '#00E0C7',
  },
  raceDescription: {
    fontSize: 15,
    color: 'rgba(243,246,250,0.70)',
    lineHeight: 22,
    marginBottom: 8,
  },
  raceLore: {
    fontSize: 13,
    color: 'rgba(243,246,250,0.48)',
    fontStyle: 'italic',
    lineHeight: 20,
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.08)',
  },
  continueButton: {
    backgroundColor: '#00E0C7',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: 18,
    borderRadius: 12,
    marginTop: 8,
  },
  continueButtonText: {
    color: '#F3F6FA',
    fontSize: 18,
    fontWeight: '600',
  },
});
