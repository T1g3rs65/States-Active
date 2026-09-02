import { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAccountStore } from '../store/accountStore';
import { glassAlert } from '../components/GlassModal';
import ScreenCanvas from '../components/ScreenCanvas';
import ScreenHeader from '../components/ScreenHeader';

import { MALE_FIRST, FEMALE_FIRST, SURNAMES } from '../utils/humanNames';

function pickName(pool: string[], avoid?: string) {
  const list = avoid ? pool.filter((n) => n.toLowerCase() !== avoid.toLowerCase()) : pool;
  return list[Math.floor(Math.random() * list.length)];
}

function isMonarch(subtype?: string) {
  const s = (subtype || '').toLowerCase();
  return s.includes('absolute monarchy') || s.includes('queen-rule');
}
function isDiarchy(subtype?: string) {
  return (subtype || '').toLowerCase().includes('diarchy');
}
function isAnarchy(form?: string) {
  return (form || '').toLowerCase() === 'anarchy';
}

export default function LeaderScreen() {
  const router = useRouter();
  const { loadSession } = useAccountStore();
  const [ready, setReady] = useState(false);
  const [form, setForm] = useState('');
  const [subtype, setSubtype] = useState('');
  const [race, setRace] = useState('human');
  const [given, setGiven] = useState('');
  const [surname, setSurname] = useState('');
  const [sex, setSex] = useState<'male' | 'female'>('male');
  const [coGiven, setCoGiven] = useState('');
  const [coSurname, setCoSurname] = useState('');
  const [coSex, setCoSex] = useState<'male' | 'female'>('female');
  const queenLocked = race.toLowerCase() === 'zythera' && isMonarch(subtype);

  useEffect(() => {
    (async () => {
      await loadSession();
      const raw = await AsyncStorage.getItem('pending_nation');
      if (!raw) {
        await glassAlert({ title: 'Hold on', message: 'Finish the quiz and pick a people first.' });
        router.replace('/');
        return;
      }
      const pending = JSON.parse(raw);
      const wr = pending.quizResult?.wheel_result || {};
      setForm(wr.government_form || '');
      setSubtype(wr.government_subtype || '');
      setRace(pending.race || 'human');
      if ((wr.government_form || '').toLowerCase() === 'anarchy') {
        router.replace('/world-map?place=1');
        return;
      }
      if ((pending.race || '').toLowerCase() === 'zythera' && isMonarch(wr.government_subtype)) {
        setSex('female');
        setGiven(pickName(FEMALE_FIRST));
      } else {
        setGiven(pickName(MALE_FIRST, 'Austin'));
      }
      setSurname(pickName(SURNAMES, 'Sigears'));
      setReady(true);
    })();
  }, []);

  const roll = (who: 'main' | 'co') => {
    const s = who === 'main' ? sex : coSex;
    const first = pickName(s === 'female' ? FEMALE_FIRST : MALE_FIRST);
    const last = pickName(SURNAMES, 'Sigears');
    if (who === 'main') {
      setGiven(first);
      setSurname(last);
    } else {
      setCoGiven(first);
      setCoSurname(last);
    }
  };

  const continueOn = async () => {
    const g = given.trim();
    const sur = surname.trim();
    if (!g) {
      await glassAlert({ title: 'Name them', message: 'Give your leader a given name.' });
      return;
    }
    if (isMonarch(subtype) && !sur) {
      await glassAlert({ title: 'House name', message: 'Monarchs need a surname so the line can continue.' });
      return;
    }
    const raw = await AsyncStorage.getItem('pending_nation');
    if (!raw) return;
    const pending = JSON.parse(raw);
    pending.quizResult = pending.quizResult || {};
    const full = sur ? `${g} ${sur}` : g;
    pending.quizResult.leader_name = queenLocked && !full.toLowerCase().startsWith('queen ') ? `Queen ${full}` : full;
    pending.quizResult.leader_sex = queenLocked ? 'female' : sex;
    pending.quizResult.dynasty_surname = isMonarch(subtype) ? sur : sur || undefined;
    if (isDiarchy(subtype)) {
      const cg = coGiven.trim() || 'Alexandra';
      const cs = coSurname.trim() || sur;
      pending.quizResult.co_leader_name = cs ? `${cg} ${cs}` : cg;
      pending.quizResult.co_leader_sex = coSex;
    }
    await AsyncStorage.setItem('pending_nation', JSON.stringify(pending));
    router.replace('/world-map?place=1');
  };

  if (!ready) {
    return (
      <ScreenCanvas>
        <View />
      </ScreenCanvas>
    );
  }

  return (
    <ScreenCanvas>
      <View style={styles.container}>
        <ScreenHeader title="Your First Leader" subtitle="Name them. Pick a sex. Monarchs keep the house." onBack={() => router.back()} />
        <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
          <Text style={styles.intro}>
            {isMonarch(subtype)
              ? 'This is a monarchy. The surname is the house — later rulers in this line keep it.'
              : 'You can name the first person to hold the top job. Later ones may be different people.'}
          </Text>

          <Text style={styles.label}>Given name</Text>
          <TextInput style={styles.input} value={given} onChangeText={setGiven} placeholder="Given name" placeholderTextColor="rgba(243,246,250,0.35)" />
          <Text style={styles.label}>{isMonarch(subtype) ? 'House / surname (kept)' : 'Surname (optional)'}</Text>
          <TextInput style={styles.input} value={surname} onChangeText={setSurname} placeholder="Surname" placeholderTextColor="rgba(243,246,250,0.35)" />

          <Text style={styles.label}>Sex</Text>
          {queenLocked ? (
            <Text style={styles.locked}>Zythera Queen-rule is female. The name is still yours.</Text>
          ) : (
            <View style={styles.row}>
              {(['male', 'female'] as const).map((s) => (
                <TouchableOpacity
                  key={s}
                  style={[styles.sexChip, sex === s && styles.sexChipOn]}
                  onPress={() => setSex(s)}
                >
                  <Text style={[styles.sexText, sex === s && styles.sexTextOn]}>{s === 'male' ? 'Male' : 'Female'}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
          <TouchableOpacity style={styles.ghost} onPress={() => roll('main')}>
            <Text style={styles.ghostText}>Random name</Text>
          </TouchableOpacity>

          {isDiarchy(subtype) ? (
            <>
              <Text style={[styles.intro, { marginTop: 28 }]}>Second Co-Consul</Text>
              <Text style={styles.label}>Given name</Text>
              <TextInput style={styles.input} value={coGiven} onChangeText={setCoGiven} placeholder="Given name" placeholderTextColor="rgba(243,246,250,0.35)" />
              <Text style={styles.label}>Surname</Text>
              <TextInput style={styles.input} value={coSurname} onChangeText={setCoSurname} placeholder="Surname" placeholderTextColor="rgba(243,246,250,0.35)" />
              <View style={styles.row}>
                {(['male', 'female'] as const).map((s) => (
                  <TouchableOpacity
                    key={s}
                    style={[styles.sexChip, coSex === s && styles.sexChipOn]}
                    onPress={() => setCoSex(s)}
                  >
                    <Text style={[styles.sexText, coSex === s && styles.sexTextOn]}>{s === 'male' ? 'Male' : 'Female'}</Text>
                  </TouchableOpacity>
                ))}
              </View>
              <TouchableOpacity style={styles.ghost} onPress={() => roll('co')}>
                <Text style={styles.ghostText}>Random second name</Text>
              </TouchableOpacity>
            </>
          ) : null}

          <TouchableOpacity style={styles.continueButton} onPress={continueOn} activeOpacity={0.88}>
            <Text style={styles.continueButtonText}>Continue to Your Capital</Text>
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
  intro: { color: 'rgba(243,246,250,0.6)', fontSize: 13, lineHeight: 20, marginBottom: 20 },
  label: { color: 'rgba(243,246,250,0.5)', fontSize: 12, marginBottom: 6, marginTop: 10, letterSpacing: 0.4 },
  input: {
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    borderRadius: 12,
    padding: 14,
    color: '#F4F5F6',
    fontSize: 16,
  },
  row: { flexDirection: 'row', gap: 10, marginTop: 4 },
  sexChip: {
    flex: 1,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
  },
  sexChipOn: { borderColor: '#2EE6C5', backgroundColor: 'rgba(46,230,197,0.08)' },
  sexText: { color: 'rgba(243,246,250,0.6)', fontWeight: '600' },
  sexTextOn: { color: '#2EE6C5' },
  locked: { color: '#E8C36A', fontSize: 13, marginBottom: 8 },
  ghost: { marginTop: 10, padding: 10, alignItems: 'center' },
  ghostText: { color: '#2EE6C5', fontSize: 13, fontWeight: '600' },
  continueButton: {
    backgroundColor: '#2EE6C5',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: 18,
    borderRadius: 999,
    marginTop: 28,
  },
  continueButtonText: { color: '#000', fontSize: 16, fontWeight: '700' },
});
