import { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
  Modal,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { api } from '../utils/api';
import { useNationStore } from '../store/nationStore';
import { QuizQuestion, QuizAnswer } from '../types';
import AsyncStorage from '@react-native-async-storage/async-storage';
import FlagCreator from '../components/FlagCreator';
import { Ionicons } from '@expo/vector-icons';

interface Race {
  id: string;
  name: string;
  description: string;
  lore?: string;
}

export default function Quiz() {
  const router = useRouter();
  const { setNation, saveNation } = useNationStore();
  
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState<QuizAnswer[]>([]);
  const [nationName, setNationName] = useState('');
  const [motto, setMotto] = useState('');
  const [currency, setCurrency] = useState('Credits');
  const [nationalAnimal, setNationalAnimal] = useState('Eagle');
  const [flagBase64, setFlagBase64] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showRaceSelection, setShowRaceSelection] = useState(false);
  const [showFinalForm, setShowFinalForm] = useState(false);
  const [showFlagCreator, setShowFlagCreator] = useState(false);
  
  // Race selection state
  const [races, setRaces] = useState<Race[]>([]);
  const [selectedRace, setSelectedRace] = useState<string>('human');
  const [loadingRaces, setLoadingRaces] = useState(false);

  useEffect(() => {
    loadQuiz();
  }, []);

  const loadQuiz = async () => {
    try {
      const response = await api.getQuiz();
      setQuestions(response.questions);
      setLoading(false);
    } catch (error) {
      console.error('Error loading quiz:', error);
      Alert.alert('Error', 'Failed to load quiz questions');
    }
  };

  const loadRaces = async () => {
    setLoadingRaces(true);
    try {
      const response = await api.getRaces();
      if (response.success && response.races) {
        setRaces(response.races);
        if (response.races.length > 0) {
          setSelectedRace(response.races[0].id);
        }
      }
    } catch (error) {
      console.error('Error loading races:', error);
      // Fallback to human if races can't be loaded
      setRaces([{ id: 'human', name: 'Human', description: 'Adaptable and ambitious.' }]);
    } finally {
      setLoadingRaces(false);
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
      // Show race selection after quiz
      setShowRaceSelection(true);
      loadRaces();
    }
  };

  const handleRaceSelected = () => {
    setShowRaceSelection(false);
    setShowFinalForm(true);
  };

  const submitQuiz = async () => {
    if (!nationName.trim()) {
      Alert.alert('Required', 'Please enter a nation name');
      return;
    }

    if (!flagBase64) {
      Alert.alert('Flag Required', 'Please design a flag for your nation');
      return;
    }

    setSubmitting(true);
    
    try {
      // Generate unique user ID
      const userId = 'user_' + Date.now() + '_' + Math.random().toString(36).substring(7);
      const selectedWorldId = await AsyncStorage.getItem('selected_world_id');
      const quizResult = {
        answers,
        nation_name: nationName,
        motto: motto || undefined,
        flag_base64: flagBase64 || undefined,
        currency: currency || 'Credits',
        national_animal: nationalAnimal || 'Eagle',
      };
      await AsyncStorage.setItem('pending_nation', JSON.stringify({
        userId,
        quizResult,
        race: selectedRace,
        worldId: selectedWorldId || undefined,
      }));
      router.replace('/world-map?place=1');
    } catch (error: any) {
      console.error('Error creating nation:', error);
      Alert.alert('Error', `Failed to start founding: ${error.message || 'Unknown error'}`);
      setSubmitting(false);
    }

  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#00E0C7" />
        <Text style={styles.loadingText}>Loading quiz...</Text>
      </View>
    );
  }

  // Race Selection Screen
  if (showRaceSelection) {
    return (
      <SafeAreaView style={styles.container}>
        <LinearGradient colors={['#0B0F14', '#11171F']} style={styles.gradient}>
          <ScrollView contentContainerStyle={styles.scrollContent}>
            <Text style={styles.title}>Choose Your Species</Text>
            <Text style={styles.subtitle}>Select the race for your nation</Text>
            
            {loadingRaces ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#00E0C7" />
                <Text style={styles.loadingText}>Loading races...</Text>
              </View>
            ) : (
              <View style={styles.raceContainer}>
                {races.map((race) => (
                  <TouchableOpacity
                    key={race.id}
                    style={[
                      styles.raceCard,
                      selectedRace === race.id && styles.raceCardSelected
                    ]}
                    onPress={() => setSelectedRace(race.id)}
                  >
                    <View style={styles.raceHeader}>
                      <View style={styles.raceIconContainer}>
                        <Ionicons 
                          name={race.id === 'human' ? 'person' : 'bug'} 
                          size={32} 
                          color={selectedRace === race.id ? '#00E0C7' : 'rgba(243,246,250,0.48)'} 
                        />
                      </View>
                      <View style={styles.raceTitleContainer}>
                        <Text style={[
                          styles.raceName,
                          selectedRace === race.id && styles.raceNameSelected
                        ]}>
                          {race.name}
                        </Text>
                        {selectedRace === race.id && (
                          <Ionicons name="checkmark-circle" size={20} color="#00E0C7" />
                        )}
                      </View>
                    </View>
                    <Text style={styles.raceDescription}>{race.description}</Text>
                    {race.lore && (
                      <Text style={styles.raceLore}>{race.lore}</Text>
                    )}
                  </TouchableOpacity>
                ))}
                
                <TouchableOpacity
                  style={styles.continueButton}
                  onPress={handleRaceSelected}
                >
                  <Text style={styles.continueButtonText}>Continue</Text>
                  <Ionicons name="arrow-forward" size={20} color="#FFF" />
                </TouchableOpacity>
              </View>
            )}
          </ScrollView>
        </LinearGradient>
      </SafeAreaView>
    );
  }

  if (showFinalForm) {
    return (
      <SafeAreaView style={styles.container}>
        <LinearGradient colors={['#0B0F14', '#11171F']} style={styles.gradient}>
          <ScrollView contentContainerStyle={styles.scrollContent}>
            <Text style={styles.title}>Name Your Nation</Text>
            
            {submitting && (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#00E0C7" />
                <Text style={styles.loadingText}>Creating your nation...</Text>
                <Text style={styles.loadingSubtext}>This may take 15-20 seconds</Text>
              </View>
            )}
            
            {!submitting && (
              <View style={styles.formContainer}>
                <Text style={styles.label}>Nation Name *</Text>
                <TextInput
                  style={styles.input}
                  value={nationName}
                  onChangeText={setNationName}
                  placeholder="The United Republic of..."
                  placeholderTextColor="rgba(243,246,250,0.48)"
                />

                <Text style={styles.label}>National Motto (Optional)</Text>
                <TextInput
                  style={styles.input}
                  value={motto}
                  onChangeText={setMotto}
                  placeholder="Liberty, Equality, Prosperity"
                  placeholderTextColor="rgba(243,246,250,0.48)"
                />

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
                    {flagBase64 ? '✓ Flag Designed' : '🏁 Design Your Flag'}
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
                  race={selectedRace}
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
