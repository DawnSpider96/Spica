import { create } from 'zustand';
import { invoke } from '@tauri-apps/api/tauri';
import { v4 as uuidv4 } from 'uuid';
import type { AppState, DraftTab, Character, Star, Prompt, LLMResponse, ApiError } from '../types';

interface AppStore extends AppState {
  // Session-only data 
  // (not saved in json storage)
  prompts: Prompt[];
  
  // Prompt actions
  addPrompt: (text: string) => void;
  
  // Draft tab actions
  addDraftTab: (tab: Omit<DraftTab, 'id' | 'createdAt'>) => void;
  updateDraftTab: (id: string, updates: Partial<DraftTab>) => void;
  deleteDraftTab: (id: string) => void;
  duplicateDraftTab: (id: string) => void;
  
  // Scene actions
  addToScene: (tabId: string) => void;
  removeFromScene: (tabId: string) => void;
  reorderScene: (fromIndex: number, toIndex: number) => void;
  
  // Blueprint actions
  updateSetting: (setting: string) => void;
  addCharacter: (character: Omit<Character, 'id'>) => void;
  updateCharacter: (id: string, updates: Partial<Character>) => void;
  deleteCharacter: (id: string) => void;
  addStar: (star: Omit<Star, 'id'>) => void;
  updateStar: (id: string, updates: Partial<Star>) => void;
  deleteStar: (id: string) => void;
  
  // UI actions
  openModal: (type: 'tab' | 'star' | 'character', id: string) => void;
  closeModal: () => void;
  setSelectedTab: (id: string | null) => void;
  toggleSidebar: () => void;
  
  // LLM actions
  sendPrompt: (text: string) => Promise<void>;
  
  // Persistence actions
  saveProject: () => Promise<void>;
  loadProject: () => Promise<void>;
  
  // Internal state
  isLoading: boolean;
  setLoading: (loading: boolean) => void;
}

export const useAppStore = create<AppStore>((set, get) => ({
  // Initial state
  prompts: [], // Session-only, not saved
  draftTabs: [],
  sceneTabIds: [],
  blueprint: {
    setting: '',
    characters: [],
    stars: [],
  },
  ui: {
    activeModal: null,
    selectedTabId: null,
    isSidebarExpanded: true,
  },
  isLoading: false,

  // Prompt actions
  addPrompt: (text: string) => {
    const prompt: Prompt = {
      id: uuidv4(),
      text,
      timestamp: Date.now(),
    };
    set(state => ({
      prompts: [...state.prompts, prompt],
    }));
  },

  // Draft tab actions
  addDraftTab: (tab) => {
    const newTab: DraftTab = {
      ...tab,
      id: uuidv4(),
      createdAt: Date.now(),
    };
    set(state => ({
      draftTabs: [...state.draftTabs, newTab],
    }));
  },

  updateDraftTab: (id, updates) => {
    set(state => ({
      draftTabs: state.draftTabs.map(tab =>
        tab.id === id ? { ...tab, ...updates } : tab
      ),
    }));
  },

  deleteDraftTab: (id) => {
    set(state => ({
      draftTabs: state.draftTabs.filter(tab => tab.id !== id),
      sceneTabIds: state.sceneTabIds.filter(tabId => tabId !== id),
      ui: state.ui.selectedTabId === id 
        ? { ...state.ui, selectedTabId: null }
        : state.ui,
    }));
  },

  duplicateDraftTab: (id) => {
    const tab = get().draftTabs.find(t => t.id === id);
    if (tab) {
      const duplicate: DraftTab = {
        ...tab,
        id: uuidv4(),
        title: `${tab.title} (Copy)`,
        createdAt: Date.now(),
      };
      set(state => ({
        draftTabs: [...state.draftTabs, duplicate],
      }));
    }
  },

  // Scene actions
  addToScene: (tabId) => {
    set(state => ({
      sceneTabIds: state.sceneTabIds.includes(tabId)
        ? state.sceneTabIds
        : [...state.sceneTabIds, tabId],
    }));
  },

  removeFromScene: (tabId) => {
    set(state => ({
      sceneTabIds: state.sceneTabIds.filter(id => id !== tabId),
    }));
  },

  reorderScene: (fromIndex, toIndex) => {
    set(state => {
      const newSceneTabIds = [...state.sceneTabIds];
      const [movedTab] = newSceneTabIds.splice(fromIndex, 1);
      newSceneTabIds.splice(toIndex, 0, movedTab);
      return { sceneTabIds: newSceneTabIds };
    });
  },

  // Blueprint actions
  updateSetting: (setting) => {
    set(state => ({
      blueprint: { ...state.blueprint, setting },
    }));
  },

  addCharacter: (character) => {
    const newCharacter: Character = {
      ...character,
      id: uuidv4(),
    };
    set(state => ({
      blueprint: {
        ...state.blueprint,
        characters: [...state.blueprint.characters, newCharacter],
      },
    }));
  },

  updateCharacter: (id, updates) => {
    set(state => ({
      blueprint: {
        ...state.blueprint,
        characters: state.blueprint.characters.map(char =>
          char.id === id ? { ...char, ...updates } : char
        ),
      },
    }));
  },

  deleteCharacter: (id) => {
    set(state => ({
      blueprint: {
        ...state.blueprint,
        characters: state.blueprint.characters.filter(char => char.id !== id),
      },
    }));
  },

  addStar: (star) => {
    const newStar: Star = {
      ...star,
      id: uuidv4(),
    };
    set(state => ({
      blueprint: {
        ...state.blueprint,
        stars: [...state.blueprint.stars, newStar],
      },
    }));
  },

  updateStar: (id, updates) => {
    set(state => ({
      blueprint: {
        ...state.blueprint,
        stars: state.blueprint.stars.map(star =>
          star.id === id ? { ...star, ...updates } : star
        ),
      },
    }));
  },

  deleteStar: (id) => {
    set(state => ({
      blueprint: {
        ...state.blueprint,
        stars: state.blueprint.stars.filter(star => star.id !== id),
      },
    }));
  },

  // UI actions
  openModal: (type, id) => {
    set(state => ({
      ui: { ...state.ui, activeModal: { type, id } },
    }));
  },

  closeModal: () => {
    set(state => ({
      ui: { ...state.ui, activeModal: null },
    }));
  },

  setSelectedTab: (id) => {
    set(state => ({
      ui: { ...state.ui, selectedTabId: id },
    }));
  },

  toggleSidebar: () => {
    set(state => ({
      ui: { ...state.ui, isSidebarExpanded: !state.ui.isSidebarExpanded },
    }));
  },

  // LLM actions
  sendPrompt: async (text: string) => {
    const { addPrompt, addDraftTab, setLoading } = get();
    
    try {
      setLoading(true);
      addPrompt(text);

      // Call Rust backend
      const response = await invoke<LLMResponse | ApiError>('send_prompt', { prompt: text });
      
      if ('error' in response) {
        console.error('LLM Error:', response.message);
        return;
      }

      // Add returned tabs to drafts
      response.tabs.forEach(tab => {
        addDraftTab({
          title: tab.title,
          content: tab.content,
          metadata: tab.type ? { type: tab.type } : undefined,
        });
      });
    } catch (error) {
      console.error('Failed to send prompt:', error);
    } finally {
      setLoading(false);
    }
  },

  // Persistence actions
  saveProject: async () => {
    const state = get();
    const saveData = {
      // prompts: state.prompts,
      draftTabs: state.draftTabs,
      sceneTabIds: state.sceneTabIds,
      blueprint: state.blueprint,
    };

    try {
      await invoke('save_project', { state: JSON.stringify(saveData) });
    } catch (error) {
      console.error('Failed to save project:', error);
    }
  },

  loadProject: async () => {
    try {
      const loadedState = await invoke<string>('load_project');
      const parsed = JSON.parse(loadedState) as Partial<AppState>;
      
      set(state => ({
        ...state,
        // prompts: parsed.prompts || [],
        draftTabs: parsed.draftTabs || [],
        sceneTabIds: parsed.sceneTabIds || [],
        blueprint: parsed.blueprint || {
          setting: '',
          characters: [],
          stars: [],
        },
      }));
    } catch (error) {
      console.error('Failed to load project:', error);
    }
  },

  setLoading: (loading) => {
    set({ isLoading: loading });
  },
})); 