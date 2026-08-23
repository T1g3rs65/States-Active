import { create } from 'zustand';
import { Nation, Issue } from '../types';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface NationStore {
  nation: Nation | null;
  issues: Issue[];
  loading: boolean;
  error: string | null;
  
  setNation: (nation: Nation) => void;
  setIssues: (issues: Issue[]) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  
  loadNation: () => Promise<void>;
  saveNation: (nation: Nation) => Promise<void>;
  clearNation: () => Promise<void>;
  refreshNation: () => Promise<void>;
  recoverNation: () => Promise<boolean>;
}

export const useNationStore = create<NationStore>((set, get) => ({
  nation: null,
  issues: [],
  loading: false,
  error: null,
  
  setNation: (nation) => {
    // Persist on every setNation so memory-only writes survive reload (fixes GH-90)
    AsyncStorage.setItem('nation', JSON.stringify(nation)).catch(() => {});
    set({ nation });
  },
  setIssues: (issues) => set({ issues }),
  setLoading: (loading) => set({ loading }),
  setError: (error) => set({ error }),
  
  loadNation: async () => {
    try {
      const savedNation = await AsyncStorage.getItem('nation');
      if (savedNation) {
        const parsed = JSON.parse(savedNation);
        set({ nation: parsed });
      }
      // Also ensure we have user_id for API recovery paths (GH-90)
      const savedUserId = await AsyncStorage.getItem('user_id');
      if (savedUserId) {
        (globalThis as any).__sh_last_user_id = savedUserId;
      }
    } catch (error) {
      console.error('Error loading nation:', error);
    }
  },
  
  saveNation: async (nation) => {
    try {
      await AsyncStorage.setItem('nation', JSON.stringify(nation));
      set({ nation });
    } catch (error) {
      console.error('Error saving nation:', error);
    }
  },
  
  clearNation: async () => {
    try {
      await AsyncStorage.removeItem('nation');
      set({ nation: null, issues: [] });
    } catch (error) {
      console.error('Error clearing nation:', error);
    }
  },

  refreshNation: async () => {
    try {
      const { nation } = get();
      const nationId = nation?.id || nation?._id;
      if (!nationId) return;
      const response = await fetch(`${process.env.EXPO_PUBLIC_BACKEND_URL || ''}/api/nations/${nationId}`);
      const data = await response.json();
      if (data.success && data.nation) {
        await AsyncStorage.setItem('nation', JSON.stringify(data.nation));
        set({ nation: data.nation });
      }
    } catch (error) {
      console.error('Error refreshing nation:', error);
    }
  },

  // GH-90: recover nation on deep link / hard refresh when store is empty
  recoverNation: async () => {
    try {
      // 1. Try local cache first (fast path)
      const savedNation = await AsyncStorage.getItem('nation');
      if (savedNation) {
        const parsed = JSON.parse(savedNation);
        if (parsed?.id || parsed?._id) {
          set({ nation: parsed });
          return true;
        }
      }

      // 2. Try user_id → API
      let userId = await AsyncStorage.getItem('user_id');
      if (!userId && (globalThis as any).__sh_last_user_id) {
        userId = (globalThis as any).__sh_last_user_id;
      }
      if (userId) {
        const resp = await fetch(
          `${process.env.EXPO_PUBLIC_BACKEND_URL || ''}/api/nations/user/${userId}`
        );
        const data = await resp.json();
        if (data?.success && data.nation) {
          await AsyncStorage.setItem('nation', JSON.stringify(data.nation));
          await AsyncStorage.setItem('user_id', userId);
          set({ nation: data.nation });
          return true;
        }
      }
      return false;
    } catch (e) {
      console.error('recoverNation failed:', e);
      return false;
    }
  },
}));
