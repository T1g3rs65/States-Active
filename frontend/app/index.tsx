import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, TouchableOpacity, TextInput, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { useNationStore } from '../store/nationStore';
import { api } from '../utils/api';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function Index() {
  const router = useRouter();
  const { nation, setNation, loadNation } = useNationStore();
  const [checking, setChecking] = useState(true);
  const [showLogin, setShowLogin] = useState(false);
  const [userId, setUserId] = useState('');

  useEffect(() => {
    checkForNation();
  }, []);

  const checkForNation = async () => {
    setChecking(true);
    
    try {
      // Try to load from local storage first
      await loadNation();
      
      // Check if we have a saved user ID
      const savedUserId = await AsyncStorage.getItem('user_id');
      
      if (savedUserId) {
        // Try to fetch nation from server
        const response = await api.getNationByUser(savedUserId);
        
        if (response.success && response.nation) {
          setNation(response.nation);
          router.replace('/(tabs)/nation');
          return;
        }
      }
      
      // No saved nation found
      setChecking(false);
    } catch (error) {
      console.error('Error checking for nation:', error);
      setChecking(false);
    }
  };

  const startQuiz = () => {
    router.push('/server-select');
  };

  const handleLogin = async () => {
    if (!userId.trim()) {
      Alert.alert('Error', 'Please enter a User ID');
      return;
    }

    setChecking(true);
    try {
      const response = await api.getNationByUser(userId.trim());
      
      if (response.success && response.nation) {
        // Save user ID for future logins
        await AsyncStorage.setItem('user_id', userId.trim());
        setNation(response.nation);
        router.replace('/(tabs)/nation');
      } else {
        Alert.alert('Not Found', 'No nation found with this User ID');
      }
    } catch (error) {
      console.error('Error logging in:', error);
      Alert.alert('Error', 'Failed to login. Please try again.');
    } finally {
      setChecking(false);
    }
  };

  if (checking) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#00E0C7" />
        <Text style={styles.loadingText}>Loading your nation...</Text>
      </View>
    );
  }

  if (showLogin) {
    return (
      <LinearGradient
        colors={['#0B0F14', '#11171F', 'rgba(255,255,255,0.08)']}
        style={styles.container}
      >
        <View style={styles.content}>
          <Text style={styles.title}>Welcome Back</Text>
          <Text style={styles.subtitle}>Login to Your Nation</Text>
          
          <View style={styles.loginForm}>
            <Text style={styles.label}>User ID</Text>
            <TextInput
              style={styles.input}
              value={userId}
              onChangeText={setUserId}
              placeholder="Enter your User ID"
              placeholderTextColor="rgba(243,246,250,0.48)"
              autoCapitalize="none"
            />
            
            <TouchableOpacity style={styles.button} onPress={handleLogin}>
              <Text style={styles.buttonText}>Login</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.backButton} 
              onPress={() => setShowLogin(false)}
            >
              <Text style={styles.backButtonText}>Back</Text>
            </TouchableOpacity>
          </View>
        </View>
      </LinearGradient>
    );
  }

  return (
    <LinearGradient
      colors={['#0B0F14', '#11171F', 'rgba(255,255,255,0.08)']}
      style={styles.container}
    >
      <View style={styles.content}>
        <Text style={styles.title}>SovereignHex</Text>
        <Text style={styles.subtitle}>Rule Your Nation</Text>
        
        <Text style={styles.description}>
          Build your nation. Make critical decisions. Shape the destiny of millions.
        </Text>

        <View style={styles.featuresContainer}>
          <FeatureItem icon="🌍" text="Create your unique nation" />
          <FeatureItem icon="⚖️" text="Face daily policy dilemmas" />
          <FeatureItem icon="📊" text="Track 35+ national statistics" />
          <FeatureItem icon="🏆" text="Compete in global rankings" />
        </View>

        <TouchableOpacity style={styles.button} onPress={startQuiz}>
          <Text style={styles.buttonText}>Begin Your Legacy</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.secondaryButton} 
          onPress={() => setShowLogin(true)}
        >
          <Text style={styles.secondaryButtonText}>Login to Existing Nation</Text>
        </TouchableOpacity>
      </View>
    </LinearGradient>
  );
}

function FeatureItem({ icon, text }: { icon: string; text: string }) {
  return (
    <View style={styles.featureItem}>
      <Text style={styles.featureIcon}>{icon}</Text>
      <Text style={styles.featureText}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    width: '85%',
    alignItems: 'center',
  },
  title: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#F3F6FA',
    marginBottom: 8,
    letterSpacing: 2,
  },
  subtitle: {
    fontSize: 24,
    color: 'rgba(243,246,250,0.70)',
    marginBottom: 32,
    letterSpacing: 1,
  },
  description: {
    fontSize: 16,
    color: 'rgba(243,246,250,0.70)',
    textAlign: 'center',
    marginBottom: 40,
    lineHeight: 24,
  },
  featuresContainer: {
    width: '100%',
    marginBottom: 40,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    paddingHorizontal: 16,
  },
  featureIcon: {
    fontSize: 24,
    marginRight: 16,
  },
  featureText: {
    fontSize: 16,
    color: '#F3F6FA',
  },
  button: {
    backgroundColor: '#00E0C7',
    paddingHorizontal: 48,
    paddingVertical: 16,
    borderRadius: 12,
    elevation: 4,
    shadowColor: '#00E0C7',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    width: '100%',
    alignItems: 'center',
  },
  buttonText: {
    color: '#F3F6FA',
    fontSize: 18,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  secondaryButton: {
    marginTop: 16,
    paddingVertical: 16,
    width: '100%',
    alignItems: 'center',
  },
  secondaryButtonText: {
    color: '#00E0C7',
    fontSize: 16,
    fontWeight: '500',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: 'rgba(243,246,250,0.48)',
  },
  loginForm: {
    width: '100%',
    gap: 16,
  },
  label: {
    color: 'rgba(243,246,250,0.70)',
    fontSize: 16,
    fontWeight: '500',
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
  backButton: {
    paddingVertical: 12,
    alignItems: 'center',
  },
  backButtonText: {
    color: 'rgba(243,246,250,0.48)',
    fontSize: 16,
  },
});
