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
}

export const useNationStore = create<NationStore>((set, get) => ({
  nation: null,
  issues: [],
  loading: false,
  error: null,
  
  setNation: (nation) => set({ nation }),
  setIssues: (issues) => set({ issues }),
  setLoading: (loading) => set({ loading }),
  setError: (error) => set({ error }),
  
  loadNation: async () => {
    try {
      const savedNation = await AsyncStorage.getItem('nation');
      if (savedNation) {
        set({ nation: JSON.parse(savedNation) });
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
      if (data.success) {
        await AsyncStorage.setItem('nation', JSON.stringify(data.nation));
        set({ nation: data.nation });
      }
    } catch (error) {
      console.error('Error refreshing nation:', error);
    }
  },
}));
