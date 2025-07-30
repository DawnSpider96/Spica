import { v4 as uuidv4 } from 'uuid';
import { LLMService } from '../services/llmService';
import type { 
  DraftTab, 
  Star, 
  Character,
  TimelineEvent, 
  Description, 
  Prompt
} from '../types';

/**
 * Content store state interface
 */
export interface ContentState {
  draft_tabs: Record<string, DraftTab>;
  workbench: { unassigned_draft_tab_ids: string[] }; // New workbench concept
  stars: Record<string, Star>;
  idea_bank: { stored_draft_tab_ids: string[] };
  prompts: Prompt[];
  isLoading: boolean;
}

/**
 * Content store actions interface
 */
export interface ContentActions {
  // Draft tab management
  createDraftTab: (title?: string) => string; // Changed: no longer requires sceneId
  updateDraftTab: (id: string, updates: Partial<DraftTab>) => void;
  deleteDraftTab: (id: string) => void;
  addTimelineEvent: (tabId: string, event: Omit<TimelineEvent, 'id'>) => void;
  updateTimelineEvent: (tabId: string, eventId: string, updates: Partial<TimelineEvent>) => void;
  deleteTimelineEvent: (tabId: string, eventId: string) => void;
  addDescription: (tabId: string, description: Omit<Description, 'id'>) => void;
  updateDescription: (tabId: string, descId: string, updates: Partial<Description>) => void;
  deleteDescription: (tabId: string, descId: string) => void;
  
  // Scene flow management
  moveTabToScene: (tabId: string, sceneId: string) => void; // Renamed from addTabToScene
  removeTabFromScene: (tabId: string) => void;
  reorderSceneTabs: (sceneId: string, fromIndex: number, toIndex: number) => void;
  moveTabToIdeaBank: (tabId: string) => void;
  moveTabFromIdeaBank: (tabId: string, sceneId?: string) => void; // Can move to scene or workbench
  moveTabToWorkbench: (tabId: string) => void; // New: move tab to workbench
  
  // Star management
  createStar: (star: Omit<Star, 'id' | 'created_at'>) => string;
  updateStar: (id: string, updates: Partial<Star>) => void;
  deleteStar: (id: string) => void;
  toggleStarChecked: (id: string) => void;
  linkStarToEvent: (starId: string, tabId: string, eventId: string) => void;
  unlinkStarFromEvent: (starId: string, tabId: string, eventId: string) => void;
  
  // LLM functionality
  buildLLMContext: (sceneId: string) => string;
  sendPrompt: (text: string, sceneId: string) => Promise<void>;
  addPrompt: (text: string) => void;
  
  // Utility functions
  getDraftTabsForScene: (sceneId: string) => DraftTab[];
  getWorkbenchTabs: () => DraftTab[]; // New: get unassigned tabs
  getDraftTabsWithStar: (starId: string) => DraftTab[];
  getCheckedStars: () => Star[];
  
  // Internal
  setLoading: (loading: boolean) => void;
}

/**
 * Creates the content store slice
 */
export const createContentSlice = (set: any, get: any) => ({
  // === INITIAL STATE ===
  draft_tabs: {},
  workbench: { unassigned_draft_tab_ids: [] },
  stars: {},
  idea_bank: { stored_draft_tab_ids: [] },
  prompts: [],
  isLoading: false,

  // === UTILITY FUNCTIONS ===
  
  getDraftTabsForScene: (sceneId: string) => {
    const state = get();
    const scene = state.scenes[sceneId];
    if (!scene) return [];
    return scene.draft_tab_ids
      .map((id: string) => state.draft_tabs[id])
      .filter(Boolean)
      .sort((a: DraftTab, b: DraftTab) => a.index - b.index);
  },

  getDraftTabsWithStar: (starId: string) => {
    const state = get();
    return (Object.values(state.draft_tabs) as DraftTab[]).filter((tab: DraftTab) =>
      tab.timeline.some(event => event.associated_stars.includes(starId))
    );
  },

  getCheckedStars: () => {
    const state = get();
    return (Object.values(state.stars) as Star[]).filter((star: Star) => star.is_checked);
  },

  getWorkbenchTabs: () => {
    const state = get();
    return state.workbench.unassigned_draft_tab_ids
      .map((id: string) => state.draft_tabs[id])
      .filter(Boolean)
      .sort((a: DraftTab, b: DraftTab) => b.created_at - a.created_at); // Most recent first
  },

  // === DRAFT TAB ACTIONS ===
  
  createDraftTab: (_title?: string) => {
    const tab: DraftTab = {
      id: uuidv4(),
      // scene_id: undefined, // No scene assignment - goes to workbench
      index: 0, // Index within workbench (will be determined by creation order)
      timeline: [],
      descriptions: [],
      summary: '',
      fulfilled_plan_steps: [],
      suggested_plan_steps: [],
      created_at: Date.now(),
      updated_at: Date.now()
    };

    set((state: any) => ({
      draft_tabs: { ...state.draft_tabs, [tab.id]: tab },
      workbench: {
        ...state.workbench,
        unassigned_draft_tab_ids: [...state.workbench.unassigned_draft_tab_ids, tab.id]
      }
    }));

    return tab.id;
  },

  updateDraftTab: (id: string, updates: Partial<DraftTab>) => {
    set((state: any) => ({
      draft_tabs: {
        ...state.draft_tabs,
        [id]: state.draft_tabs[id] ? { ...state.draft_tabs[id], ...updates, updated_at: Date.now() } : state.draft_tabs[id]
      }
    }));
  },

  deleteDraftTab: (id: string) => {
    const state = get();
    const tab = state.draft_tabs[id];
    if (!tab) return;

    set((currentState: any) => {
      const newState = { ...currentState };
      
      // Remove from draft_tabs
      const { [id]: deletedTab, ...remainingTabs } = newState.draft_tabs;
      newState.draft_tabs = remainingTabs;
      
      // Remove from scene
      if (tab.scene_id && newState.scenes[tab.scene_id]) {
        newState.scenes[tab.scene_id] = {
          ...newState.scenes[tab.scene_id],
          draft_tab_ids: newState.scenes[tab.scene_id].draft_tab_ids.filter((tabId: string) => tabId !== id),
          updated_at: Date.now()
        };
      }
      
      // Remove from workbench
      newState.workbench.unassigned_draft_tab_ids = newState.workbench.unassigned_draft_tab_ids.filter((tabId: string) => tabId !== id);
      
      // Remove from idea bank
      newState.idea_bank.stored_draft_tab_ids = newState.idea_bank.stored_draft_tab_ids.filter((tabId: string) => tabId !== id);
      
      // Clean up star origins
      Object.values(newState.stars).forEach((star: any) => {
        if (star.origin_draft_tab_id === id) {
          star.origin_draft_tab_id = undefined;
        }
      });
      
      // Clean up plan step fulfillments
      Object.values(newState.plan_steps).forEach((step: any) => {
        step.fulfilled_by = step.fulfilled_by.filter((tabId: string) => tabId !== id);
      });
      
      // Clear UI selection if this tab was selected
      if (newState.ui.selectedTabId === id) {
        newState.ui.selectedTabId = null;
      }
      
      return newState;
    });
  },

  addTimelineEvent: (tabId: string, event: Omit<TimelineEvent, 'id'>) => {
    const tab = get().draft_tabs[tabId];
    if (!tab) return;

    const newEvent: TimelineEvent = {
      ...event,
      id: uuidv4()
    };

    get().updateDraftTab(tabId, {
      timeline: [...tab.timeline, newEvent]
    });
  },

  updateTimelineEvent: (tabId: string, eventId: string, updates: Partial<TimelineEvent>) => {
    const tab = get().draft_tabs[tabId];
    if (!tab) return;

    const updatedTimeline = tab.timeline.map((event: TimelineEvent) =>
      event.id === eventId ? { ...event, ...updates } : event
    );

    get().updateDraftTab(tabId, { timeline: updatedTimeline });
  },

  deleteTimelineEvent: (tabId: string, eventId: string) => {
    const tab = get().draft_tabs[tabId];
    if (!tab) return;

    const updatedTimeline = tab.timeline.filter((event: TimelineEvent) => event.id !== eventId);
    get().updateDraftTab(tabId, { timeline: updatedTimeline });
  },

  addDescription: (tabId: string, description: Omit<Description, 'id'>) => {
    const tab = get().draft_tabs[tabId];
    if (!tab) return;

    const newDescription: Description = {
      ...description,
      id: uuidv4()
    };

    get().updateDraftTab(tabId, {
      descriptions: [...tab.descriptions, newDescription]
    });
  },

  updateDescription: (tabId: string, descId: string, updates: Partial<Description>) => {
    const tab = get().draft_tabs[tabId];
    if (!tab) return;

    const updatedDescriptions = tab.descriptions.map((desc: Description) =>
      desc.id === descId ? { ...desc, ...updates } : desc
    );

    get().updateDraftTab(tabId, { descriptions: updatedDescriptions });
  },

  deleteDescription: (tabId: string, descId: string) => {
    const tab = get().draft_tabs[tabId];
    if (!tab) return;

    const updatedDescriptions = tab.descriptions.filter((desc: Description) => desc.id !== descId);
    get().updateDraftTab(tabId, { descriptions: updatedDescriptions });
  },

  // === SCENE FLOW ACTIONS ===
  
  moveTabToScene: (tabId: string, sceneId: string) => {
    const scene = get().scenes[sceneId];
    const tab = get().draft_tabs[tabId];
    if (!scene || !tab) return;

    set((state: any) => {
      const newState = { ...state };
      
      // Remove from workbench if it's there
      newState.workbench.unassigned_draft_tab_ids = newState.workbench.unassigned_draft_tab_ids.filter((id: string) => id !== tabId);
      
      // Remove from idea bank if it's there
      newState.idea_bank.stored_draft_tab_ids = newState.idea_bank.stored_draft_tab_ids.filter((id: string) => id !== tabId);
      
      // Remove from previous scene if it's there
      if (tab.scene_id && newState.scenes[tab.scene_id]) {
        newState.scenes[tab.scene_id] = {
          ...newState.scenes[tab.scene_id],
          draft_tab_ids: newState.scenes[tab.scene_id].draft_tab_ids.filter((id: string) => id !== tabId),
          updated_at: Date.now()
        };
      }
      
      return newState;
    });

    // Update tab's scene and index
    get().updateDraftTab(tabId, {
      scene_id: sceneId,
      index: scene.draft_tab_ids.length
    });

    // Add to scene
    get().updateScene(sceneId, {
      draft_tab_ids: [...scene.draft_tab_ids, tabId]
    });
  },

  removeTabFromScene: (tabId: string) => {
    const tab = get().draft_tabs[tabId];
    if (!tab || !tab.scene_id) return;

    const scene = get().scenes[tab.scene_id];
    if (!scene) return;

    // Remove from scene
    const updatedTabIds = scene.draft_tab_ids.filter((id: string) => id !== tabId);
    
    // Reindex remaining tabs
    updatedTabIds.forEach((id: string, index: number) => {
      get().updateDraftTab(id, { index });
    });

    get().updateScene(tab.scene_id, {
      draft_tab_ids: updatedTabIds
    });

    // Move tab to workbench
    get().updateDraftTab(tabId, { scene_id: undefined, index: 0 });
    
    set((state: any) => ({
      workbench: {
        ...state.workbench,
        unassigned_draft_tab_ids: [...state.workbench.unassigned_draft_tab_ids, tabId]
      }
    }));
  },

  reorderSceneTabs: (sceneId: string, fromIndex: number, toIndex: number) => {
    const scene = get().scenes[sceneId];
    if (!scene) return;

    const newTabIds = [...scene.draft_tab_ids];
    const [movedTabId] = newTabIds.splice(fromIndex, 1);
    newTabIds.splice(toIndex, 0, movedTabId);

    // Update all tab indices
    newTabIds.forEach((tabId: string, index: number) => {
      get().updateDraftTab(tabId, { index });
    });

    get().updateScene(sceneId, {
      draft_tab_ids: newTabIds
    });
  },

  moveTabToIdeaBank: (tabId: string) => {
    const tab = get().draft_tabs[tabId];
    if (!tab) return;

    set((state: any) => {
      const newState = { ...state };
      
      // Remove from workbench if it's there
      newState.workbench.unassigned_draft_tab_ids = newState.workbench.unassigned_draft_tab_ids.filter((id: string) => id !== tabId);
      
      // Remove from scene if it's there
      if (tab.scene_id && newState.scenes[tab.scene_id]) {
        newState.scenes[tab.scene_id] = {
          ...newState.scenes[tab.scene_id],
          draft_tab_ids: newState.scenes[tab.scene_id].draft_tab_ids.filter((id: string) => id !== tabId),
          updated_at: Date.now()
        };
      }
      
      // Add to idea bank
      newState.idea_bank.stored_draft_tab_ids = [...newState.idea_bank.stored_draft_tab_ids, tabId];
      
      return newState;
    });

    // Clear scene_id from tab
    get().updateDraftTab(tabId, { scene_id: undefined });
  },

  moveTabFromIdeaBank: (tabId: string, sceneId?: string) => {
    if (sceneId) {
      get().moveTabToScene(tabId, sceneId);
    } else {
      get().moveTabToWorkbench(tabId);
    }
  },

  moveTabToWorkbench: (tabId: string) => {
    const tab = get().draft_tabs[tabId];
    if (!tab) return;

    set((state: any) => {
      const newState = { ...state };
      
      // Remove from idea bank if it's there
      newState.idea_bank.stored_draft_tab_ids = newState.idea_bank.stored_draft_tab_ids.filter((id: string) => id !== tabId);
      
      // Remove from scene if it's there
      if (tab.scene_id && newState.scenes[tab.scene_id]) {
        newState.scenes[tab.scene_id] = {
          ...newState.scenes[tab.scene_id],
          draft_tab_ids: newState.scenes[tab.scene_id].draft_tab_ids.filter((id: string) => id !== tabId),
          updated_at: Date.now()
        };
      }
      
      // Add to workbench
      newState.workbench.unassigned_draft_tab_ids = [...newState.workbench.unassigned_draft_tab_ids, tabId];
      
      return newState;
    });

    // Clear scene_id from tab
    get().updateDraftTab(tabId, { scene_id: undefined, index: 0 });
  },

  // === STAR ACTIONS ===
  
  createStar: (star: Omit<Star, 'id' | 'created_at'>) => {
    const newStar: Star = {
      ...star,
      id: uuidv4(),
      created_at: Date.now()
    };

    set((state: any) => ({
      stars: { ...state.stars, [newStar.id]: newStar }
    }));

    return newStar.id;
  },

  updateStar: (id: string, updates: Partial<Star>) => {
    set((state: any) => ({
      stars: {
        ...state.stars,
        [id]: state.stars[id] ? { ...state.stars[id], ...updates } : state.stars[id]
      }
    }));
  },

  deleteStar: (id: string) => {
    set((state: any) => {
      const { [id]: deletedStar, ...remainingStars } = state.stars;
      
      // Clean up references in timeline events
      const updatedDraftTabs = { ...state.draft_tabs };
      Object.values(updatedDraftTabs).forEach((tab: any) => {
        tab.timeline.forEach((event: any) => {
          event.associated_stars = event.associated_stars.filter((starId: string) => starId !== id);
        });
      });
      
      return {
        stars: remainingStars,
        draft_tabs: updatedDraftTabs
      };
    });
  },

  toggleStarChecked: (id: string) => {
    const star = get().stars[id];
    if (star) {
      get().updateStar(id, { is_checked: !star.is_checked });
    }
  },

  linkStarToEvent: (starId: string, tabId: string, eventId: string) => {
    const tab = get().draft_tabs[tabId];
    if (!tab) return;

    const event = tab.timeline.find((e: TimelineEvent) => e.id === eventId);
    if (!event || event.associated_stars.includes(starId)) return;

    get().updateTimelineEvent(tabId, eventId, {
      associated_stars: [...event.associated_stars, starId]
    });
  },

  unlinkStarFromEvent: (starId: string, tabId: string, eventId: string) => {
    const tab = get().draft_tabs[tabId];
    if (!tab) return;

    const event = tab.timeline.find((e: TimelineEvent) => e.id === eventId);
    if (!event) return;

    get().updateTimelineEvent(tabId, eventId, {
      associated_stars: event.associated_stars.filter((id: string) => id !== starId)
    });
  },

  // === LLM ACTIONS ===
  
  buildLLMContext: (sceneId: string) => {
    const state = get();
    const scene = state.scenes[sceneId];
    if (!scene) return '';

    const checkedStars = get().getCheckedStars();
    const sceneTabs = get().getDraftTabsForScene(sceneId);
    const characters = Object.values(state.characters) as Character[];

    console.log('Building LLM context:', {
      sceneId,
      sceneName: scene.name,
      totalStars: Object.keys(state.stars).length,
      checkedStars: checkedStars.length,
      checkedStarTitles: checkedStars.map((s: Star) => s.title),
      charactersCount: characters.length,
      tabsCount: sceneTabs.length
    });

    // Use LLMService to build context
    return LLMService.buildContext({
      scene,
      characters,
      checkedStars,
      recentTabs: sceneTabs
    });
  },

  sendPrompt: async (text: string, sceneId: string) => {
    const { addPrompt, setLoading, createDraftTab } = get();
    const state = get();
    
    try {
      console.log('Starting sendPrompt...', { text, sceneId });
      setLoading(true);
      addPrompt(text);

      const scene = state.scenes[sceneId];
      if (!scene) {
        console.error('Scene not found:', sceneId);
        return;
      }

      const checkedStars = get().getCheckedStars();
      const sceneTabs = get().getDraftTabsForScene(sceneId);
      const characters = Object.values(state.characters) as Character[];

      console.log('Calling LLMService.generateSceneTimeline...', { scene: scene.name, charactersCount: characters.length });

      // Use LLMService for scene timeline generation
      const response = await LLMService.generateSceneTimeline(text, {
        scene,
        characters,
        checkedStars,
        recentTabs: sceneTabs
      });

      console.log('LLM Response received:', response);

      // Create draft tabs from response (they go to workbench by default)
      response.tabs.forEach((tab: any) => {
        const tabId = createDraftTab(tab.title);
        console.log('Created draft tab:', tabId, tab.title);
        
        // Add timeline events
        tab.timeline.forEach((event: any) => {
          get().addTimelineEvent(tabId, {
            text: event.text,
            dialogue: event.dialogue,
            associated_stars: []
          });
        });
      });

      console.log('Prompt processing completed successfully');
    } catch (error) {
      console.error('Failed to send prompt:', error);
      alert(`Error sending prompt: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  },

  addPrompt: (text: string) => {
    const prompt: Prompt = {
      id: uuidv4(),
      text,
      timestamp: Date.now(),
    };
    set((state: any) => ({
      prompts: [...state.prompts, prompt],
    }));
  },

  setLoading: (loading: boolean) => {
    set({ isLoading: loading });
  },
}); 