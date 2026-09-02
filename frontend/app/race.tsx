import { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAccountStore } from '../store/accountStore';
import { api } from '../utils/api';
import { glassAlert } from '../components/GlassModal';
import ScreenCanvas from '../components/ScreenCanvas';
import ScreenHeader from '../components/ScreenHeader';
import LiquidGlass from '../components/LiquidGlass';
import StatusDots from '../components/StatusDots';

interface Race {
  id: string;
  name: string;
  description: string;
  lore?: string;
}

export default function RaceScreen() {
  const router = useRouter();
  const { loadSession } = useAccountStore();
  const [races, setRaces] = useState<Race[]>([]);
  const [selectedRace, setSelectedRace] = useState<string>('human');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      await loadSession();
      const session = useAccountStore.getState();
      if (!session.token || !session.user?.id) {
        router.replace('/signin');
        return;
      }
      const raw = await AsyncStorage.getItem('pending_nation');
      if (!raw) {
        await glassAlert({ title: 'Hold on', message: 'Finish your quiz before choosing a species.' });
        router.replace('/');
        return;
      }
      await loadRaces();
    })();
  }, []);

  const loadRaces = async () => {
    try {
      const response = await api.getRaces();
      if (response.success && response.races && response.races.length > 0) {
        const list = response.races.filter((r: Race) => r.id !== 'zythera');
        const only = list.length ? list : [{ id: 'human', name: 'Human', description: 'Adaptable and ambitious.' }];
        setRaces(only);
        setSelectedRace(only[0].id);
        if (only.length === 1) {
          const raw = await AsyncStorage.getItem('pending_nation');
          if (raw) {
            const pending = JSON.parse(raw);
            pending.race = only[0].id;
            await AsyncStorage.setItem('pending_nation', JSON.stringify(pending));
            router.replace('/leader');
            return;
          }
        }
      } else {
        setRaces([{ id: 'human', name: 'Human', description: 'Adaptable and ambitious.' }]);
      }
    } catch (e) {
      console.error('Error loading races:', e);
      setRaces([{ id: 'human', name: 'Human', description: 'Adaptable and ambitious.' }]);
    } finally {
      setLoading(false);
    }
  };

  const continueToCapital = async () => {
    try {
      const raw = await AsyncStorage.getItem('pending_nation');
      if (!raw) {
        await glassAlert({ title: 'Hold on', message: 'Finish your quiz first.' });
        router.replace('/');
        return;
      }
      const pending = JSON.parse(raw);
      pending.race = selectedRace;
      await AsyncStorage.setItem('pending_nation', JSON.stringify(pending));
      router.replace('/leader');
    } catch (e: any) {
      console.error('Error saving race:', e);
      await glassAlert({ title: 'Error', message: e?.message || 'Could not save your species.' });
    }
  };

  if (loading) {
    return (
      <ScreenCanvas>
        <View style={styles.center}>
          <StatusDots status="Loading" color="#2EE6C5" />
          <Text style={styles.centerText}>Gathering the peoples of the world...</Text>
        </View>
      </ScreenCanvas>
    );
  }

  return (
    <ScreenCanvas>
      <View style={styles.container}>
        <ScreenHeader
          title="Choose Your Species"
          subtitle="The people who call your nation home"
          onBack={() => router.back()}
        />
        <ScrollView contentContainerStyle={styles.body}>
          <Text style={styles.intro}>
            Your people shape your nation's look and some founding constraints. This is decided
            after your government — your species rules follow the wheels, not the other way round.
          </Text>
          {races.map((race) => {
            const selected = selectedRace === race.id;
            return (
              <TouchableOpacity
                key={race.id}
                accessibilityRole="radio"
                accessibilityState={{ selected }}
                style={[styles.raceCard, selected && styles.raceCardSelected]}
                onPress={() => setSelectedRace(race.id)}
                activeOpacity={0.85}
              >
                <View style={styles.raceHeader}>
                  <View style={styles.raceIconContainer}>
                    <Ionicons
                      name={race.id === 'human' ? 'person' : 'bug'}
                      size={30}
                      color={selected ? '#2EE6C5' : 'rgba(243,246,250,0.48)'}
                    />
                  </View>
                  <View style={styles.raceTitleContainer}>
                    <Text style={[styles.raceName, selected && styles.raceNameSelected]}>
                      {race.name}
                    </Text>
                    {selected && <Ionicons name="checkmark-circle" size={20} color="#2EE6C5" />}
                  </View>
                </View>
                <Text style={styles.raceDescription}>{race.description}</Text>
                {race.lore ? <Text style={styles.raceLore}>{race.lore}</Text> : null}
              </TouchableOpacity>
            );
          })}

          <TouchableOpacity style={styles.continueButton} onPress={continueToCapital} activeOpacity={0.88}>
            <Text style={styles.continueButtonText}>Continue to Your Leader</Text>
            <Ionicons name="arrow-forward" size={20} color="#000" />
          </TouchableOpacity>
        </ScrollView>
      </View>
    </ScreenCanvas>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: 'transparent' },
  body: { padding: 16, paddingBottom: 60 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 16 },
  centerText: { color: 'rgba(243,246,250,0.75)', fontSize: 15 },
  intro: {
    color: 'rgba(243,246,250,0.6)',
    fontSize: 13,
    lineHeight: 20,
    marginBottom: 20,
    paddingHorizontal: 4,
  },
  raceCard: {
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    marginBottom: 16,
  },
  raceCardSelected: {
    borderColor: '#2EE6C5',
    backgroundColor: 'rgba(46,230,197,0.06)',
  },
  raceHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  raceIconContainer: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: 'rgba(0,0,0,0.3)',
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
    color: '#F4F5F6',
  },
  raceNameSelected: { color: '#2EE6C5' },
  raceDescription: {
    fontSize: 15,
    color: 'rgba(243,246,250,0.7)',
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
    backgroundColor: '#2EE6C5',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: 18,
    borderRadius: 999,
    marginTop: 8,
  },
  continueButtonText: { color: '#000', fontSize: 16, fontWeight: '700' },
});
