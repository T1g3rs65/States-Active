import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import ScreenCanvas from '../components/ScreenCanvas';
import LiquidGlass from '../components/LiquidGlass';
import { glassAlert } from '../components/GlassModal';
import { api } from '../utils/api';
import { useAccountStore } from '../store/accountStore';

export default function VerifyEmail() {
  const router = useRouter();
  const { token } = useLocalSearchParams<{ token?: string }>();
  const { setSession } = useAccountStore();
  const [status, setStatus] = useState<'verifying' | 'ok' | 'error'>('verifying');

  useEffect(() => {
    (async () => {
      if (!token) {
        setStatus('error');
        return;
      }
      try {
        const res = await api.verifyEmail(token);
        // Refresh the stored session so email_verified is current
        const st = useAccountStore.getState();
        if (st.token && st.user) {
          await setSession(st.token, { ...st.user, email_verified: true });
        }
        setStatus('ok');
      } catch (e: any) {
        setStatus('error');
      }
    })();
  }, [token]);

  return (
    <ScreenCanvas>
      <View style={styles.wrap}>
        <LiquidGlass radius={28} style={styles.card}>
          {status === 'verifying' && (
            <>
              <Ionicons name="hourglass-outline" size={40} color="rgba(243,246,250,0.7)" />
              <Text style={styles.title}>Verifying…</Text>
              <Text style={styles.sub}>Confirming your email address.</Text>
            </>
          )}
          {status === 'ok' && (
            <>
              <Ionicons name="checkmark-circle" size={40} color="#4ADE80" />
              <Text style={styles.title}>Email verified</Text>
              <Text style={styles.sub}>Your account is active. You can found your nation now.</Text>
              <TouchableOpacity style={styles.primary} onPress={() => router.replace('/')} activeOpacity={0.88}>
                <Text style={styles.primaryText}>Go to the game</Text>
              </TouchableOpacity>
            </>
          )}
          {status === 'error' && (
            <>
              <Ionicons name="alert-circle" size={40} color="#F87171" />
              <Text style={styles.title}>Verification failed</Text>
              <Text style={styles.sub}>This link is invalid or expired. Sign in and check for a fresh email.</Text>
              <TouchableOpacity style={styles.primary} onPress={() => router.replace('/signin')} activeOpacity={0.88}>
                <Text style={styles.primaryText}>Go to sign in</Text>
              </TouchableOpacity>
            </>
          )}
        </LiquidGlass>
      </View>
    </ScreenCanvas>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, justifyContent: 'center', padding: 20 },
  card: { padding: 28, alignItems: 'center', gap: 12 },
  title: { color: '#F3F6FA', fontSize: 24, fontWeight: '600', marginTop: 4 },
  sub: { color: 'rgba(243,246,250,0.65)', fontSize: 14, lineHeight: 20, textAlign: 'center' },
  primary: { backgroundColor: '#F3F6FA', borderRadius: 999, paddingVertical: 14, paddingHorizontal: 28, marginTop: 12 },
  primaryText: { color: '#000', fontWeight: '700', fontSize: 15 },
});
