import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import ScreenCanvas from '../components/ScreenCanvas';
import LiquidGlass from '../components/LiquidGlass';
import { glassAlert } from '../components/GlassModal';
import { api } from '../utils/api';
import { useAccountStore } from '../store/accountStore';
import { useNationStore } from '../store/nationStore';

export default function SignIn() {
  const router = useRouter();
  const { setSession } = useAccountStore();
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [googleOn, setGoogleOn] = useState(false);
  const [googleClientId, setGoogleClientId] = useState<string | null>(null);

  useEffect(() => {
    api.googleStatus().then((r) => {
      setGoogleOn(!!r.enabled);
      setGoogleClientId(r.client_id || null);
    }).catch(() => {});
    if (typeof document !== 'undefined') {
      document.title = 'Sign in · Sovereign Hex';
    }
  }, []);

  const submit = async () => {
    if (!email.trim() || !password) {
      await glassAlert({ title: 'Need both', message: 'Email and password are required.' });
      return;
    }
    setBusy(true);
    try {
      const legacy = (await AsyncStorage.getItem('user_id')) || undefined;
      const res =
        mode === 'signup'
          ? await api.registerAccount(email.trim(), password, undefined, legacy)
          : await api.loginAccount(email.trim(), password);
      await setSession(res.token, res.user);
      if (res.user?.is_admin) {
        await glassAlert({
          title: 'Admin unlocked',
          message: 'This account is an admin. Create official worlds from Worlds. Admin panel is in More.',
        });
      }
      await goAfterNationCheck(res.user.id);
    } catch (e: any) {
      await glassAlert({ title: 'Could not sign in', message: e?.message || 'Try again.' });
    } finally {
      setBusy(false);
    }
  };

  const goAfterNationCheck = async (userId: string) => {
    try {
      const live = await api.getNationByUser(userId);
      if (live?.nation) {
        await useNationStore.getState().saveNation(live.nation);
        router.replace('/(tabs)/nation');
        return;
      }
    } catch (_) {}
    router.replace('/server-select');
  };

  const startGoogle = () => {
    if (!googleClientId) {
      glassAlert({ title: 'Google not wired', message: 'Set GOOGLE_CLIENT_ID on the API to enable Google sign-in.' });
      return;
    }
    if (typeof window === 'undefined') return;
    const w = window as any;

    const finishWith = async (payload: { credential?: string; code?: string }) => {
      if (!payload.credential && !payload.code) return;
      setBusy(true);
      try {
        const res = await api.googleLogin(payload.credential, payload.code);
        await setSession(res.token, res.user);
        if (res.user?.is_admin) {
          await glassAlert({ title: 'Admin unlocked', message: 'Signed in with Google. You have admin access.' });
        }
        await goAfterNationCheck(res.user.id);
      } catch (e: any) {
        await glassAlert({ title: 'Google sign in failed', message: e?.message || 'Try again.' });
      } finally {
        setBusy(false);
      }
    };

    const openPicker = () => {
      const g = w.google;
      if (!g?.accounts) {
        return false;
      }
      // Real popup account picker — One Tap (.prompt) often shows nothing.
      if (g.accounts.oauth2?.initCodeClient) {
        const client = g.accounts.oauth2.initCodeClient({
          client_id: googleClientId,
          scope: 'openid email profile',
          ux_mode: 'popup',
          callback: async (resp: any) => {
            if (resp?.error) {
              await glassAlert({ title: 'Google sign in failed', message: String(resp.error) });
              return;
            }
            await finishWith({ code: resp?.code });
          },
          error_callback: async (err: any) => {
            const msg = err?.type === 'popup_closed' ? 'The Google window was closed.' : (err?.message || err?.type || 'Popup failed');
            await glassAlert({ title: 'Google sign in', message: msg });
          },
        });
        client.requestCode();
        return true;
      }
      if (g.accounts.id) {
        g.accounts.id.initialize({
          client_id: googleClientId,
          callback: async (resp: any) => finishWith({ credential: resp?.credential }),
        });
        g.accounts.id.prompt((n: any) => {
          if (n?.isNotDisplayed?.() || n?.isSkippedMoment?.()) {
            glassAlert({
              title: 'Google did not open',
              message: 'Allow popups for this site, then try Continue with Google again.',
            });
          }
        });
        return true;
      }
      return false;
    };

    const start = () => {
      if (openPicker()) return;
      let tries = 0;
      const t = setInterval(() => {
        tries += 1;
        if (openPicker() || tries > 25) clearInterval(t);
        if (tries > 25 && !w.google?.accounts) {
          glassAlert({ title: 'Google failed to load', message: 'Check that accounts.google.com is not blocked.' });
        }
      }, 200);
    };

    if (document.getElementById('gid-script')) {
      start();
      return;
    }
    const s = document.createElement('script');
    s.id = 'gid-script';
    s.src = 'https://accounts.google.com/gsi/client';
    s.async = true;
    s.onload = start;
    s.onerror = () => {
      glassAlert({ title: 'Google failed to load', message: 'The Google script was blocked. Check an adblocker or network.' });
    };
    document.head.appendChild(s);
  };

  return (
    <ScreenCanvas>
      <View style={styles.wrap}>
        <LiquidGlass radius={28} style={styles.card}>
          <Text style={styles.kicker}>{mode === 'signin' ? 'Welcome back' : 'Create account'}</Text>
          <Text style={styles.title}>{mode === 'signin' ? 'Sign in' : 'Join the realm'}</Text>
          <Text style={styles.sub}>Email + password. First account on this server becomes admin.</Text>

          <Text style={styles.label}>Email</Text>
          <TextInput
            style={styles.input}
            autoCapitalize="none"
            keyboardType="email-address"
            value={email}
            onChangeText={setEmail}
            placeholder="you@domain"
            placeholderTextColor="rgba(243,246,250,0.35)"
          />
          <Text style={styles.label}>Password</Text>
          <TextInput
            style={styles.input}
            secureTextEntry
            value={password}
            onChangeText={setPassword}
            placeholder="at least 8 characters"
            placeholderTextColor="rgba(243,246,250,0.35)"
          />

          <TouchableOpacity style={styles.primary} onPress={submit} disabled={busy} activeOpacity={0.88}>
            <Text style={styles.primaryText}>{busy ? 'Working…' : mode === 'signin' ? 'Sign in' : 'Create account'}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.google}
            onPress={startGoogle}
            disabled={busy}
          >
            <Ionicons name="logo-google" size={18} color="rgba(243,246,250,0.85)" />
            <Text style={styles.googleText}>{googleOn ? 'Continue with Google' : 'Google sign-in (setup)'}</Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={() => setMode(mode === 'signin' ? 'signup' : 'signin')}>
            <Text style={styles.swap}>
              {mode === 'signin' ? 'Need an account? Create one' : 'Already have an account? Sign in'}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => router.back()}>
            <Text style={styles.swap}>Back</Text>
          </TouchableOpacity>
        </LiquidGlass>
      </View>
    </ScreenCanvas>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, justifyContent: 'center', padding: 20 },
  card: { padding: 24 },
  kicker: { color: 'rgba(243,246,250,0.55)', fontSize: 12, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 6 },
  title: { color: '#F3F6FA', fontSize: 32, fontWeight: '500', marginBottom: 8 },
  sub: { color: 'rgba(243,246,250,0.62)', fontSize: 14, lineHeight: 20, marginBottom: 18 },
  label: { color: 'rgba(243,246,250,0.7)', fontSize: 13, fontWeight: '600', marginBottom: 6 },
  input: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    backgroundColor: 'rgba(0,0,0,0.35)',
    color: '#F3F6FA',
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 12,
  },
  primary: { backgroundColor: '#F3F6FA', borderRadius: 999, paddingVertical: 14, alignItems: 'center', marginTop: 4 },
  primaryText: { color: '#000', fontWeight: '700', fontSize: 15 },
  google: {
    marginTop: 10,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.16)',
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  googleText: { color: 'rgba(243,246,250,0.85)', fontWeight: '600' },
  swap: { color: 'rgba(243,246,250,0.65)', textAlign: 'center', marginTop: 14 },
});
