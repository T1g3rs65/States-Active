import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';

export type AccountUser = {
  id: string;
  email?: string;
  username?: string;
  is_admin?: boolean;
  google_linked?: boolean;
  email_verified?: boolean;
  legacy_user_id?: string | null;
};

type AccountStore = {
  token: string | null;
  user: AccountUser | null;
  ready: boolean;
  loadSession: () => Promise<void>;
  setSession: (token: string, user: AccountUser) => Promise<void>;
  clearSession: () => Promise<void>;
};

export const useAccountStore = create<AccountStore>((set) => ({
  token: null,
  user: null,
  ready: false,
  loadSession: async () => {
    try {
      const token = await AsyncStorage.getItem('auth_token');
      const raw = await AsyncStorage.getItem('auth_user');
      const user = raw ? JSON.parse(raw) : null;
      set({ token, user, ready: true });
    } catch {
      set({ token: null, user: null, ready: true });
    }
  },
  setSession: async (token, user) => {
    await AsyncStorage.setItem('auth_token', token);
    await AsyncStorage.setItem('auth_user', JSON.stringify(user));
    if (user?.id) await AsyncStorage.setItem('user_id', user.id);
    set({ token, user, ready: true });
  },
  clearSession: async () => {
    await AsyncStorage.multiRemove(['auth_token', 'auth_user', 'user_id']);
    set({ token: null, user: null, ready: true });
  },
}));
