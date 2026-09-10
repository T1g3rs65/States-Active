import { create } from 'zustand';
import { Nation, Issue } from '../types';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { api } from '../utils/api';

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
      const data = await api.getNation(nationId);
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
      // Never revive a wiped nation from local cache. Account session is required.
      const token = await AsyncStorage.getItem('auth_token');
      if (!token) {
        await AsyncStorage.removeItem('nation');
        set({ nation: null });
        return false;
      }
      let userId = await AsyncStorage.getItem('user_id');
      if (!userId && (globalThis as any).__sh_last_user_id) {
        userId = (globalThis as any).__sh_last_user_id;
      }
      if (userId) {
        const cached = await AsyncStorage.getItem('nation');
        if (cached) {
          try {
            const parsed = JSON.parse(cached);
            if (parsed && (parsed.id || parsed._id)) set({ nation: parsed });
          } catch (_) {}
        }
        const data = await api.getNationByUser(userId);
        if (data?.success && data.nation) {
          await AsyncStorage.setItem('nation', JSON.stringify(data.nation));
          await AsyncStorage.setItem('user_id', userId);
          set({ nation: data.nation });
          return true;
        }
      }
      await AsyncStorage.removeItem('nation');
      set({ nation: null });
      return false;
    } catch (e) {
      console.error('recoverNation failed:', e);
      return false;
    }
  },
}));
