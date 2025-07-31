import { create } from 'zustand';
import { invoke } from '@tauri-apps/api/tauri';
import { v4 as uuidv4 } from 'uuid';
import { LLMService } from '../services/llmService';
import type { 
  AppState, 
  DraftTab, 
  Character, 
  Star, 
  Scene,
  PlanStep,
  TimelineEvent,
  Description,
  Prompt, 
  LLMResponse, 
  ApiError,
  ProjectData,
  StarTags
} from '../types';

interface AppStore extends AppState {
  // === UTILITY FUNCTIONS ===
  
  // Get entities by relationships
  getDraftTabsForScene: (sceneId: string) => DraftTab[];
  getDraftTabsWithStar: (starId: string) => DraftTab[];
  getCheckedStars: () => Star[];
  getCheckedCharacters: () => Character[];
  getActiveScene: () => Scene | null;
  getWorkbenchTabs: () => DraftTab[];
  getIdeaBankTabs: () => DraftTab[];
  
  // Debugging and validation utilities
  validateDraftTabConsistency: () => { errors: string[]; warnings: string[] };
  getTabLocation: (tabId: string) => 'scene' | 'workbench' | 'idea_bank' | 'nowhere' | null;
  
  // === SCENE ACTIONS ===
  createScene: (name: string) => string; // returns scene ID
  updateScene: (id: string, updates: Partial<Scene>) => void;
  setActiveScene: (sceneId: string) => void;
  updateScenePlan: (sceneId: string, rawText: string) => void;
  
  // === DRAFT TAB ACTIONS ===
  createDraftTab: (sceneId?: string, title?: string) => string; // returns tab ID
  updateDraftTab: (id: string, updates: Partial<DraftTab>) => void;
  deleteDraftTab: (id: string) => void;
  addTimelineEvent: (tabId: string, event: Omit<TimelineEvent, 'id'>) => void;
  updateTimelineEvent: (tabId: string, eventId: string, updates: Partial<TimelineEvent>) => void;
  deleteTimelineEvent: (tabId: string, eventId: string) => void;
  addDescription: (tabId: string, description: Omit<Description, 'id'>) => void;
  updateDescription: (tabId: string, descId: string, updates: Partial<Description>) => void;
  deleteDescription: (tabId: string, descId: string) => void;
  
  // === SCENE FLOW ACTIONS ===
  
  // Atomic action: Move tab from any location to a specific scene
  moveDraftTabToScene: (tabId: string, sceneId: string) => void;
  // Atomic action: Move tab from any location to idea bank
  moveDraftTabToIdeaBank: (tabId: string) => void;
  // Atomic action: Move tab from any location to workbench
  moveDraftTabToWorkbench: (tabId: string) => void;

  // Reorder tabs within a scene
  reorderSceneTabs: (sceneId: string, newOrder: string[]) => void;
  // Reorder tabs within workbench
  reorderWorkbenchTabs: (newOrder: string[]) => void;
  // Reorder tabs within idea bank
  reorderIdeaBankTabs: (newOrder: string[]) => void;

  // Legacy methods for backward compatibility (deprecated)
  addTabToScene: (tabId: string, sceneId: string) => void;
  removeTabFromScene: (tabId: string) => void;
  moveTabToIdeaBank: (tabId: string) => void;
  moveTabFromIdeaBank: (tabId: string, sceneId: string) => void;
  moveTabToWorkbench: (tabId: string) => void;
  
  // === STAR ACTIONS ===
  createStar: (star: Omit<Star, 'id' | 'created_at'>) => string; // returns star ID
  updateStar: (id: string, updates: Partial<Star>) => void;
  deleteStar: (id: string) => void;
  toggleStarChecked: (id: string) => void;
  linkStarToEvent: (starId: string, tabId: string, eventId: string) => void;
  unlinkStarFromEvent: (starId: string, tabId: string, eventId: string) => void;
  
  // Character constraint management
  createCharacterConstraint: (eventId: string, tabId: string, characterId: string, constraintData: {
    type: 'character_behavior' | 'character_dialogue' | 'character_emotion' | 'character_social' | 'character_physical';
    title: string;
    description: string;
    situationContext?: string;
    constraintTags?: string[];
  }) => string;
  getConstraintsForCharacter: (characterId: string) => Star[];
  getConstraintsForSituation: (situation: string) => Star[];
  detectCharactersInEvent: (eventText: string) => string[];
  
  // === CHARACTER ACTIONS ===
  createCharacter: (character: Omit<Character, 'id' | 'is_checked'>) => string; // returns character ID
  updateCharacter: (id: string, updates: Partial<Character>) => void;
  deleteCharacter: (id: string) => void;
  toggleCharacterChecked: (id: string) => void;
  
  // === PLAN STEP ACTIONS ===
  createPlanStep: (sceneId: string, text: string) => string; // returns step ID
  updatePlanStep: (id: string, updates: Partial<PlanStep>) => void;
  deletePlanStep: (id: string) => void;
  linkPlanStepToTab: (stepId: string, tabId: string) => void;
  unlinkPlanStepFromTab: (stepId: string, tabId: string) => void;
  
  // === UI ACTIONS ===
  openModal: (type: 'tab' | 'star' | 'character', id: string) => void;
  closeModal: () => void;
  setSelectedTab: (id: string | null) => void;
  toggleSidebar: () => void;
  toggleContextPreview: () => void;
  
  // === LLM ACTIONS ===
  buildLLMContext: (sceneId: string) => string;
  sendPrompt: (text: string, sceneId: string) => Promise<void>;
  addPrompt: (text: string) => void;
  
  // === PERSISTENCE ACTIONS ===
  saveProject: () => Promise<void>;
  loadProject: () => Promise<void>;
  saveProjectAs: () => Promise<void>;
  loadProjectFromFile: () => Promise<void>;
  createNewProject: (title: string, author?: string) => void;
  
  // === INTERNAL ===
  setLoading: (loading: boolean) => void;
}

// Helper function to create empty scene
const createEmptyScene = (name: string): Scene => ({
  id: uuidv4(),
  name,
  setting: '',
  backstory: '',
  plan: {
    raw_text: '',
    parsed_steps: []
  },
  draft_tab_ids: [],
  created_at: Date.now(),
  updated_at: Date.now()
});

// Helper function to create empty project
const createEmptyProject = (title: string, author?: string): ProjectData => {
  const sceneId = uuidv4();
  const scene = createEmptyScene('Main Scene');
  
  return {
    version: '1.0',
    metadata: {
      title,
      author,
      created_at: Date.now(),
      updated_at: Date.now()
    },
    scenes: { [sceneId]: { ...scene, id: sceneId } },
    draft_tabs: {},
    workbench: { unassigned_draft_tab_ids: [] },
    stars: {},
    characters: {},
    plan_steps: {},
    idea_bank: { stored_draft_tab_ids: [] },
    active_scene_id: sceneId
  };
};

// Data repair function
const repairProjectData = (data: Partial<ProjectData>): ProjectData => {
  // Ensure all required fields exist
  const repaired: ProjectData = {
    version: data.version || '1.0',
    metadata: data.metadata || {
      title: 'Untitled Project',
      created_at: Date.now(),
      updated_at: Date.now()
    },
    scenes: data.scenes || {},
    draft_tabs: data.draft_tabs || {},
    workbench: data.workbench || { unassigned_draft_tab_ids: [] },
    stars: data.stars || {},
    characters: data.characters || {},
    plan_steps: data.plan_steps || {},
    idea_bank: data.idea_bank || { stored_draft_tab_ids: [] },
    active_scene_id: data.active_scene_id
  };

  // Clean up orphaned references
  Object.values(repaired.stars).forEach(star => {
    if (star.origin_draft_tab_id && !repaired.draft_tabs[star.origin_draft_tab_id]) {
      console.warn(`Fixing orphaned star ${star.id} -> removing origin reference`);
      star.origin_draft_tab_id = undefined;
    }
  });

  Object.values(repaired.scenes).forEach(scene => {
    scene.draft_tab_ids = scene.draft_tab_ids.filter(tabId => repaired.draft_tabs[tabId]);
  });

  repaired.idea_bank.stored_draft_tab_ids = repaired.idea_bank.stored_draft_tab_ids.filter(
    tabId => repaired.draft_tabs[tabId]
  );

  repaired.workbench.unassigned_draft_tab_ids = repaired.workbench.unassigned_draft_tab_ids.filter(
    tabId => repaired.draft_tabs[tabId]
  );

  // Ensure characters have is_checked field
  Object.values(repaired.characters).forEach(character => {
    if (character.is_checked === undefined) {
      character.is_checked = false;
    }
  });

  // Ensure we have an active scene
  if (!repaired.active_scene_id || !repaired.scenes[repaired.active_scene_id]) {
    const sceneIds = Object.keys(repaired.scenes);
    if (sceneIds.length > 0) {
      repaired.active_scene_id = sceneIds[0];
    } else {
      // Create a default scene
      const defaultScene = createEmptyScene('Main Scene');
      repaired.scenes[defaultScene.id] = defaultScene;
      repaired.active_scene_id = defaultScene.id;
    }
  }

  return repaired;
};

export const useAppStore = create<AppStore>((set, get) => ({
  // === INITIAL STATE ===
  ...createEmptyProject('New Project'),
  
  // UI state (not persisted)
  ui: {
    activeModal: null,
    selectedTabId: null,
    isSidebarExpanded: true,
    showContextPreview: false,
  },
  
  // Session state (not persisted)  
  prompts: [],
  isLoading: false,

  // === UTILITY FUNCTIONS ===
  
  getDraftTabsForScene: (sceneId: string) => {
    const state = get();
    const scene = state.scenes[sceneId];
    if (!scene) return [];
    return scene.draft_tab_ids
      .map(id => state.draft_tabs[id])
      .filter(Boolean)
      .sort((a, b) => a.index - b.index);
  },

  getDraftTabsWithStar: (starId: string) => {
    const state = get();
    return Object.values(state.draft_tabs).filter(tab =>
      tab.timeline.some(event => event.associated_stars.includes(starId))
    );
  },

  getCheckedStars: () => {
    const state = get();
    return Object.values(state.stars).filter(star => star.is_checked);
  },

  getCheckedCharacters: () => {
    const state = get();
    return Object.values(state.characters).filter(character => character.is_checked);
  },

  getActiveScene: () => {
    const state = get();
    return state.active_scene_id ? state.scenes[state.active_scene_id] || null : null;
  },

  getWorkbenchTabs: () => {
    const state = get();
    return state.workbench.unassigned_draft_tab_ids
      .map(id => state.draft_tabs[id])
      .filter(Boolean);
  },

  getIdeaBankTabs: () => {
    const state = get();
    return state.idea_bank.stored_draft_tab_ids
      .map(id => state.draft_tabs[id])
      .filter(Boolean);
  },

  // Debugging and validation utilities
  validateDraftTabConsistency: () => {
    const state = get();
    const errors: string[] = [];
    const warnings: string[] = [];

    // Check for tabs that exist in draft_tabs but not in any location
    Object.values(state.draft_tabs).forEach(tab => {
      if (!tab.id) {
        errors.push(`Draft tab with missing ID: ${JSON.stringify(tab)}`);
        return;
      }

      const isInScene = tab.scene_id && state.scenes[tab.scene_id]?.draft_tab_ids.includes(tab.id);
      const isInWorkbench = state.workbench.unassigned_draft_tab_ids.includes(tab.id);
      const isInIdeaBank = state.idea_bank.stored_draft_tab_ids.includes(tab.id);

      // Check for tabs not in any location
      if (!isInScene && !isInWorkbench && !isInIdeaBank) {
        warnings.push(`Draft tab ${tab.id} exists but is not in any location`);
      }

      // Check for tabs in multiple locations (shouldn't happen with atomic actions)
      const locationCount = [isInScene, isInWorkbench, isInIdeaBank].filter(Boolean).length;
      if (locationCount > 1) {
        errors.push(`Draft tab ${tab.id} is in ${locationCount} locations simultaneously`);
      }

      // Check for scene_id mismatch
      if (tab.scene_id && !state.scenes[tab.scene_id]) {
        errors.push(`Draft tab ${tab.id} references non-existent scene: ${tab.scene_id}`);
      }

      // Check for tabs with scene_id but not in that scene's list
      if (tab.scene_id && state.scenes[tab.scene_id] && !isInScene) {
        errors.push(`Draft tab ${tab.id} has scene_id ${tab.scene_id} but is not in that scene's draft_tab_ids`);
      }

      // Check for tabs in scene list but with wrong scene_id
      if (isInScene && tab.scene_id) {
        const scene = state.scenes[tab.scene_id];
        if (scene && !scene.draft_tab_ids.includes(tab.id)) {
          errors.push(`Draft tab ${tab.id} is in scene ${tab.scene_id} but not in its draft_tab_ids`);
        }
      }
    });

    // Check for tabs in location lists that don't exist in draft_tabs
    state.workbench.unassigned_draft_tab_ids.forEach(tabId => {
      if (!state.draft_tabs[tabId]) {
        errors.push(`Workbench contains non-existent tab: ${tabId}`);
      }
    });

    state.idea_bank.stored_draft_tab_ids.forEach(tabId => {
      if (!state.draft_tabs[tabId]) {
        errors.push(`Idea bank contains non-existent tab: ${tabId}`);
      }
    });

    Object.values(state.scenes).forEach(scene => {
      scene.draft_tab_ids.forEach(tabId => {
        if (!state.draft_tabs[tabId]) {
          errors.push(`Scene ${scene.id} contains non-existent tab: ${tabId}`);
        }
      });
    });

    return { errors, warnings };
  },

  getTabLocation: (tabId: string) => {
    const state = get();
    const tab = state.draft_tabs[tabId];
    if (!tab) return null;

    if (tab.scene_id && state.scenes[tab.scene_id]?.draft_tab_ids.includes(tabId)) {
      return 'scene';
    }
    if (state.workbench.unassigned_draft_tab_ids.includes(tabId)) {
      return 'workbench';
    }
    if (state.idea_bank.stored_draft_tab_ids.includes(tabId)) {
      return 'idea_bank';
    }
    return 'nowhere';
  },

  // === SCENE ACTIONS ===
  
  createScene: (name: string) => {
    const scene = createEmptyScene(name);
    set(state => ({
      scenes: { ...state.scenes, [scene.id]: scene }
    }));
    return scene.id;
  },

  updateScene: (id: string, updates: Partial<Scene>) => {
    set(state => ({
      scenes: {
        ...state.scenes,
        [id]: state.scenes[id] ? { ...state.scenes[id], ...updates, updated_at: Date.now() } : state.scenes[id]
      }
    }));
  },

  setActiveScene: (sceneId: string) => {
    set({ active_scene_id: sceneId });
  },

  updateScenePlan: (sceneId: string, rawText: string) => {
    const state = get();
    const scene = state.scenes[sceneId];
    if (!scene) return;

    // For now, just update raw text - no auto-parsing
    const updatedPlan = {
      ...scene.plan,
      raw_text: rawText
    };

    get().updateScene(sceneId, { plan: updatedPlan });
  },

  // === DRAFT TAB ACTIONS ===
  
  createDraftTab: (sceneId?: string, title: string = 'New Draft') => {
    const tab: DraftTab = {
      id: uuidv4(),
      scene_id: sceneId, // Optional - undefined means workbench
      index: sceneId ? get().scenes[sceneId]?.draft_tab_ids.length || 0 : 0,
      timeline: [],
      descriptions: [],
      summary: '',
      fulfilled_plan_steps: [],
      suggested_plan_steps: [],
      created_at: Date.now(),
      updated_at: Date.now()
    };

    set(state => {
      const newState = {
        ...state,
        draft_tabs: { ...state.draft_tabs, [tab.id]: tab }
      };

      if (sceneId && newState.scenes[sceneId]) {
        // Add to scene
        newState.scenes[sceneId] = {
          ...newState.scenes[sceneId],
          draft_tab_ids: [...newState.scenes[sceneId].draft_tab_ids, tab.id],
          updated_at: Date.now()
        };
      } else {
        // Add to workbench
        newState.workbench = {
          ...newState.workbench,
          unassigned_draft_tab_ids: [...newState.workbench.unassigned_draft_tab_ids, tab.id]
        };
      }

      return newState;
    });

    return tab.id;
  },

  updateDraftTab: (id: string, updates: Partial<DraftTab>) => {
    set(state => ({
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

    set(currentState => {
      const newState = { ...currentState };
      
      // Remove from draft_tabs
      const { [id]: deletedTab, ...remainingTabs } = newState.draft_tabs;
      newState.draft_tabs = remainingTabs;
      
      // Remove from scene if assigned
      if (tab.scene_id && newState.scenes[tab.scene_id]) {
        newState.scenes[tab.scene_id] = {
          ...newState.scenes[tab.scene_id],
          draft_tab_ids: newState.scenes[tab.scene_id].draft_tab_ids.filter(tabId => tabId !== id),
          updated_at: Date.now()
        };
      }
      
      // Remove from workbench
      newState.workbench.unassigned_draft_tab_ids = newState.workbench.unassigned_draft_tab_ids.filter(tabId => tabId !== id);
      
      // Remove from idea bank
      newState.idea_bank.stored_draft_tab_ids = newState.idea_bank.stored_draft_tab_ids.filter(tabId => tabId !== id);
      
      // Clean up star origins
      Object.values(newState.stars).forEach(star => {
        if (star.origin_draft_tab_id === id) {
          star.origin_draft_tab_id = undefined;
        }
      });
      
      // Clean up plan step fulfillments
      Object.values(newState.plan_steps).forEach(step => {
        step.fulfilled_by = step.fulfilled_by.filter(tabId => tabId !== id);
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

    const updatedTimeline = tab.timeline.map(event =>
      event.id === eventId ? { ...event, ...updates } : event
    );

    get().updateDraftTab(tabId, { timeline: updatedTimeline });
  },

  deleteTimelineEvent: (tabId: string, eventId: string) => {
    const tab = get().draft_tabs[tabId];
    if (!tab) return;

    const updatedTimeline = tab.timeline.filter(event => event.id !== eventId);
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

    const updatedDescriptions = tab.descriptions.map(desc =>
      desc.id === descId ? { ...desc, ...updates } : desc
    );

    get().updateDraftTab(tabId, { descriptions: updatedDescriptions });
  },

  deleteDescription: (tabId: string, descId: string) => {
    const tab = get().draft_tabs[tabId];
    if (!tab) return;

    const updatedDescriptions = tab.descriptions.filter(desc => desc.id !== descId);
    get().updateDraftTab(tabId, { descriptions: updatedDescriptions });
  },

  // === SCENE FLOW ACTIONS ===
  
  // Atomic action: Move tab from any location to a specific scene
  moveDraftTabToScene: (tabId: string, sceneId: string) => {
    const state = get();
    const tab = state.draft_tabs[tabId];
    const scene = state.scenes[sceneId];
    
    if (!tab) {
      console.error("Tab does not exist:", tabId);
      return;
    }
    
    if (!scene) {
      console.error("Scene does not exist:", sceneId);
      return;
    }
    
    // Check if tab is already in the target scene
    if (scene.draft_tab_ids.includes(tabId)) {
      console.warn("Tab already in scene:", tabId);
      return;
    }

    // Debug: Log current location before move
    if (process.env.NODE_ENV === 'development') {
      const currentLocation = get().getTabLocation(tabId);
      console.log(`Moving tab ${tabId} from ${currentLocation} to scene ${sceneId}`);
    }
    
    // Remove from all possible sources
    const newState = { ...state };
    
    // Remove from current scene if any
    if (tab.scene_id && newState.scenes[tab.scene_id]) {
      newState.scenes[tab.scene_id] = {
        ...newState.scenes[tab.scene_id],
        draft_tab_ids: newState.scenes[tab.scene_id].draft_tab_ids.filter(id => id !== tabId),
        updated_at: Date.now()
      };
    }
    
    // Remove from workbench
    newState.workbench = {
      ...newState.workbench,
      unassigned_draft_tab_ids: newState.workbench.unassigned_draft_tab_ids.filter(id => id !== tabId)
    };
    
    // Remove from idea bank
    newState.idea_bank = {
      ...newState.idea_bank,
      stored_draft_tab_ids: newState.idea_bank.stored_draft_tab_ids.filter(id => id !== tabId)
    };
    
    // Add to target scene
    newState.scenes[sceneId] = {
      ...newState.scenes[sceneId],
      draft_tab_ids: [...newState.scenes[sceneId].draft_tab_ids, tabId],
      updated_at: Date.now()
    };
    
    // Update tab metadata
    newState.draft_tabs[tabId] = {
      ...newState.draft_tabs[tabId],
      scene_id: sceneId,
      index: newState.scenes[sceneId].draft_tab_ids.length - 1,
      updated_at: Date.now()
    };
    
    set(newState);
  },

  // Atomic action: Move tab from any location to idea bank
  moveDraftTabToIdeaBank: (tabId: string) => {
    const state = get();
    const tab = state.draft_tabs[tabId];
    
    if (!tab) {
      console.error("Tab does not exist:", tabId);
      return;
    }
    
    // Check if tab is already in idea bank
    if (state.idea_bank.stored_draft_tab_ids.includes(tabId)) {
      console.warn("Tab already in idea bank:", tabId);
      return;
    }
    
    // Remove from all possible sources
    const newState = { ...state };
    
    // Remove from current scene if any
    if (tab.scene_id && newState.scenes[tab.scene_id]) {
      newState.scenes[tab.scene_id] = {
        ...newState.scenes[tab.scene_id],
        draft_tab_ids: newState.scenes[tab.scene_id].draft_tab_ids.filter(id => id !== tabId),
        updated_at: Date.now()
      };
    }
    
    // Remove from workbench
    newState.workbench = {
      ...newState.workbench,
      unassigned_draft_tab_ids: newState.workbench.unassigned_draft_tab_ids.filter(id => id !== tabId)
    };
    
    // Add to idea bank
    newState.idea_bank = {
      ...newState.idea_bank,
      stored_draft_tab_ids: [...newState.idea_bank.stored_draft_tab_ids, tabId]
    };
    
    // Update tab metadata
    newState.draft_tabs[tabId] = {
      ...newState.draft_tabs[tabId],
      scene_id: undefined,
      index: 0,
      updated_at: Date.now()
    };
    
    set(newState);
  },

  // Atomic action: Move tab from any location to workbench
  moveDraftTabToWorkbench: (tabId: string) => {
    const state = get();
    const tab = state.draft_tabs[tabId];
    
    if (!tab) {
      console.error("Tab does not exist:", tabId);
      return;
    }
    
    // Check if tab is already in workbench
    if (state.workbench.unassigned_draft_tab_ids.includes(tabId)) {
      console.warn("Tab already in workbench:", tabId);
      return;
    }
    
    // Remove from all possible sources
    const newState = { ...state };
    
    // Remove from current scene if any
    if (tab.scene_id && newState.scenes[tab.scene_id]) {
      newState.scenes[tab.scene_id] = {
        ...newState.scenes[tab.scene_id],
        draft_tab_ids: newState.scenes[tab.scene_id].draft_tab_ids.filter(id => id !== tabId),
        updated_at: Date.now()
      };
    }
    
    // Remove from idea bank
    newState.idea_bank = {
      ...newState.idea_bank,
      stored_draft_tab_ids: newState.idea_bank.stored_draft_tab_ids.filter(id => id !== tabId)
    };
    
    // Add to workbench
    newState.workbench = {
      ...newState.workbench,
      unassigned_draft_tab_ids: [...newState.workbench.unassigned_draft_tab_ids, tabId]
    };
    
    // Update tab metadata
    newState.draft_tabs[tabId] = {
      ...newState.draft_tabs[tabId],
      scene_id: undefined,
      index: 0,
      updated_at: Date.now()
    };
    
    set(newState);
  },

  // Reorder tabs within a scene
  reorderSceneTabs: (sceneId: string, newOrder: string[]) => {
    const state = get();
    const scene = state.scenes[sceneId];
    
    if (!scene) {
      console.error("Scene does not exist:", sceneId);
      return;
    }
    
    // Validate that all tabs in new order exist and belong to this scene
    const validTabs = newOrder.filter(tabId => 
      state.draft_tabs[tabId] && state.draft_tabs[tabId].scene_id === sceneId
    );
    
    if (validTabs.length !== newOrder.length) {
      console.warn("Some tabs in reorder array are invalid or don't belong to scene");
    }
    
    // Update scene with new order
    const newState = { ...state };
    newState.scenes[sceneId] = {
      ...newState.scenes[sceneId],
      draft_tab_ids: validTabs,
      updated_at: Date.now()
    };
    
    // Update tab indices
    validTabs.forEach((tabId, index) => {
      newState.draft_tabs[tabId] = {
        ...newState.draft_tabs[tabId],
        index,
        updated_at: Date.now()
      };
    });
    
    set(newState);
  },

  // Reorder tabs within workbench
  reorderWorkbenchTabs: (newOrder: string[]) => {
    const state = get();
    
    // Validate that all tabs in new order exist and are in workbench
    const validTabs = newOrder.filter(tabId => 
      state.draft_tabs[tabId] && !state.draft_tabs[tabId].scene_id && 
      state.workbench.unassigned_draft_tab_ids.includes(tabId)
    );
    
    if (validTabs.length !== newOrder.length) {
      console.warn("Some tabs in reorder array are invalid or not in workbench");
    }
    
    set({
      workbench: {
        ...state.workbench,
        unassigned_draft_tab_ids: validTabs
      }
    });
  },

  // Reorder tabs within idea bank
  reorderIdeaBankTabs: (newOrder: string[]) => {
    const state = get();
    
    // Validate that all tabs in new order exist and are in idea bank
    const validTabs = newOrder.filter(tabId => 
      state.draft_tabs[tabId] && 
      state.idea_bank.stored_draft_tab_ids.includes(tabId)
    );
    
    if (validTabs.length !== newOrder.length) {
      console.warn("Some tabs in reorder array are invalid or not in idea bank");
    }
    
    set({
      idea_bank: {
        ...state.idea_bank,
        stored_draft_tab_ids: validTabs
      }
    });
  },

  // Legacy methods for backward compatibility (deprecated)
  addTabToScene: (tabId: string, sceneId: string) => {
    console.warn("addTabToScene is deprecated, use moveDraftTabToScene instead");
    get().moveDraftTabToScene(tabId, sceneId);
  },

  removeTabFromScene: (tabId: string) => {
    console.warn("removeTabFromScene is deprecated, use moveDraftTabToWorkbench or moveDraftTabToIdeaBank instead");
    get().moveDraftTabToWorkbench(tabId);
  },

  moveTabToIdeaBank: (tabId: string) => {
    console.warn("moveTabToIdeaBank is deprecated, use moveDraftTabToIdeaBank instead");
    get().moveDraftTabToIdeaBank(tabId);
  },

  moveTabFromIdeaBank: (tabId: string, sceneId: string) => {
    console.warn("moveTabFromIdeaBank is deprecated, use moveDraftTabToScene instead");
    get().moveDraftTabToScene(tabId, sceneId);
  },

  moveTabToWorkbench: (tabId: string) => {
    console.warn("moveTabToWorkbench is deprecated, use moveDraftTabToWorkbench instead");
    get().moveDraftTabToWorkbench(tabId);
  },
  
  // === STAR ACTIONS ===
  
  createStar: (star: Omit<Star, 'id' | 'created_at'>) => {
    const newStar: Star = {
      ...star,
      id: uuidv4(),
      created_at: Date.now()
    };

    set(state => ({
      stars: { ...state.stars, [newStar.id]: newStar }
    }));

    return newStar.id;
  },

  updateStar: (id: string, updates: Partial<Star>) => {
    set(state => ({
      stars: {
        ...state.stars,
        [id]: state.stars[id] ? { ...state.stars[id], ...updates } : state.stars[id]
      }
    }));
  },

  deleteStar: (id: string) => {
    set(state => {
      const { [id]: deletedStar, ...remainingStars } = state.stars;
      
      // Clean up references in timeline events
      const updatedDraftTabs = { ...state.draft_tabs };
      Object.values(updatedDraftTabs).forEach(tab => {
        tab.timeline.forEach(event => {
          event.associated_stars = event.associated_stars.filter(starId => starId !== id);
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

    const event = tab.timeline.find(e => e.id === eventId);
    if (!event || event.associated_stars.includes(starId)) return;

    get().updateTimelineEvent(tabId, eventId, {
      associated_stars: [...event.associated_stars, starId]
    });
  },

  unlinkStarFromEvent: (starId: string, tabId: string, eventId: string) => {
    const tab = get().draft_tabs[tabId];
    if (!tab) return;

    const event = tab.timeline.find(e => e.id === eventId);
    if (!event) return;

    get().updateTimelineEvent(tabId, eventId, {
      associated_stars: event.associated_stars.filter(id => id !== starId)
    });
  },
  
  // === CHARACTER CONSTRAINT ACTIONS ===
  
  createCharacterConstraint: (eventId: string, tabId: string, characterId: string, constraintData: {
    type: 'character_behavior' | 'character_dialogue' | 'character_emotion' | 'character_social' | 'character_physical';
    title: string;
    description: string;
    situationContext?: string;
    constraintTags?: string[];
  }) => {
    const state = get();
    const tab = state.draft_tabs[tabId];
    const event = tab?.timeline.find((e: any) => e.id === eventId);
    
    const newConstraint: Star = {
      id: uuidv4(),
      title: constraintData.title,
      body: constraintData.description,
      tags: {
        characters: [characterId],
        scope: 'CurrentScene',
        status: 'Active',
        custom: [],
        constraint_context: constraintData.constraintTags || []
      },
      priority: 0.8, // High priority for constraints
      is_checked: true, // Auto-check new constraints
      created_at: Date.now(),
      origin_draft_tab_id: tabId,
      constraint_type: constraintData.type,
      applies_to_character: characterId,
      situation_context: constraintData.situationContext,
      source_event: event ? {
        tab_id: tabId,
        event_id: eventId,
        event_text: event.text
      } : undefined
    };

    set((state: any) => ({
      stars: { ...state.stars, [newConstraint.id]: newConstraint }
    }));

    return newConstraint.id;
  },

  getConstraintsForCharacter: (characterId: string) => {
    const state = get();
    return (Object.values(state.stars) as Star[]).filter((star: Star) => 
      star.applies_to_character === characterId && star.constraint_type
    );
  },

  getConstraintsForSituation: (situation: string) => {
    const state = get();
    return (Object.values(state.stars) as Star[]).filter((star: Star) => 
      star.situation_context?.toLowerCase().includes(situation.toLowerCase()) && star.constraint_type
    );
  },

  detectCharactersInEvent: (eventText: string) => {
    const state = get();
    const characters = Object.values(state.characters);
    
    const detectedCharacterIds = characters
      .filter(char => eventText.toLowerCase().includes(char.name.toLowerCase()))
      .map(char => char.id);

    return detectedCharacterIds;
  },

  // === CHARACTER ACTIONS ===
  
  createCharacter: (character: Omit<Character, 'id' | 'is_checked'>) => {
    const newCharacter: Character = {
      ...character,
      id: uuidv4(),
      is_checked: false
    };

    set(state => ({
      characters: { ...state.characters, [newCharacter.id]: newCharacter }
    }));

    return newCharacter.id;
  },

  updateCharacter: (id: string, updates: Partial<Character>) => {
    set(state => ({
      characters: {
        ...state.characters,
        [id]: state.characters[id] ? { ...state.characters[id], ...updates } : state.characters[id]
      }
    }));
  },

  deleteCharacter: (id: string) => {
    set(state => {
      const { [id]: deletedCharacter, ...remainingCharacters } = state.characters;
      
      // Clean up references in star tags
      const updatedStars = { ...state.stars };
      Object.values(updatedStars).forEach(star => {
        star.tags.characters = star.tags.characters.filter(charId => charId !== id);
      });
      
      return {
        characters: remainingCharacters,
        stars: updatedStars
      };
    });
  },

  toggleCharacterChecked: (id: string) => {
    const character = get().characters[id];
    if (character) {
      get().updateCharacter(id, { is_checked: !character.is_checked });
    }
  },

  // === PLAN STEP ACTIONS ===
  
  createPlanStep: (sceneId: string, text: string) => {
    const newStep: PlanStep = {
      id: uuidv4(),
      text,
      fulfilled_by: [],
      linked_stars: []
    };

    const scene = get().scenes[sceneId];
    if (!scene) return '';

    const updatedPlan = {
      ...scene.plan,
      parsed_steps: [...scene.plan.parsed_steps, newStep]
    };

    set(state => ({
      plan_steps: { ...state.plan_steps, [newStep.id]: newStep },
      scenes: {
        ...state.scenes,
        [sceneId]: { ...state.scenes[sceneId], plan: updatedPlan, updated_at: Date.now() }
      }
    }));

    return newStep.id;
  },

  updatePlanStep: (id: string, updates: Partial<PlanStep>) => {
    set(state => ({
      plan_steps: {
        ...state.plan_steps,
        [id]: state.plan_steps[id] ? { ...state.plan_steps[id], ...updates } : state.plan_steps[id]
      }
    }));
  },

  deletePlanStep: (id: string) => {
    set(state => {
      const { [id]: deletedStep, ...remainingSteps } = state.plan_steps;
      
      // Remove from scenes
      const updatedScenes = { ...state.scenes };
      Object.values(updatedScenes).forEach(scene => {
        scene.plan.parsed_steps = scene.plan.parsed_steps.filter(step => step.id !== id);
      });
      
      // Clean up references in draft tabs
      const updatedDraftTabs = { ...state.draft_tabs };
      Object.values(updatedDraftTabs).forEach(tab => {
        tab.fulfilled_plan_steps = tab.fulfilled_plan_steps.filter(stepId => stepId !== id);
      });
      
      return {
        plan_steps: remainingSteps,
        scenes: updatedScenes,
        draft_tabs: updatedDraftTabs
      };
    });
  },

  linkPlanStepToTab: (stepId: string, tabId: string) => {
    const step = get().plan_steps[stepId];
    const tab = get().draft_tabs[tabId];
    if (!step || !tab || step.fulfilled_by.includes(tabId)) return;

    get().updatePlanStep(stepId, {
      fulfilled_by: [...step.fulfilled_by, tabId]
    });

    get().updateDraftTab(tabId, {
      fulfilled_plan_steps: [...tab.fulfilled_plan_steps, stepId]
    });
  },

  unlinkPlanStepFromTab: (stepId: string, tabId: string) => {
    const step = get().plan_steps[stepId];
    const tab = get().draft_tabs[tabId];
    if (!step || !tab) return;

    get().updatePlanStep(stepId, {
      fulfilled_by: step.fulfilled_by.filter(id => id !== tabId)
    });

    get().updateDraftTab(tabId, {
      fulfilled_plan_steps: tab.fulfilled_plan_steps.filter(id => id !== stepId)
    });
  },

  // === UI ACTIONS ===
  
  openModal: (type: 'tab' | 'star' | 'character', id: string) => {
    set(state => ({
      ui: { ...state.ui, activeModal: { type, id } }
    }));
  },

  closeModal: () => {
    set(state => ({
      ui: { ...state.ui, activeModal: null }
    }));
  },

  setSelectedTab: (id: string | null) => {
    set(state => ({
      ui: { ...state.ui, selectedTabId: id }
    }));
  },

  toggleSidebar: () => {
    set(state => ({
      ui: { ...state.ui, isSidebarExpanded: !state.ui.isSidebarExpanded }
    }));
  },

  toggleContextPreview: () => {
    set(state => ({
      ui: { ...state.ui, showContextPreview: !state.ui.showContextPreview }
    }));
  },

  // === LLM ACTIONS ===
  
  buildLLMContext: (sceneId: string) => {
    const state = get();
    const scene = state.scenes[sceneId];
    if (!scene) return '';

    const checkedStars = get().getCheckedStars();
    const checkedCharacters = get().getCheckedCharacters();
    const sceneTabs = get().getDraftTabsForScene(sceneId);

    // Use LLMService to build context with character constraints
    return LLMService.buildContext({
      scene,
      characters: checkedCharacters,
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
      const characters = get().getCheckedCharacters();

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
        const tabId = createDraftTab(undefined, tab.title);
        console.log('Created draft tab:', tabId, tab.title);
        
        // Update the summary if provided by LLM
        if (tab.summary) {
          get().updateDraftTab(tabId, { summary: tab.summary });
          console.log('Set summary for draft tab:', tabId, tab.summary);
        }
        
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
    set(state => ({
      prompts: [...state.prompts, prompt],
    }));
  },

  // === PERSISTENCE ACTIONS ===
  
  saveProject: async () => {
    console.log('saveProject called');
    const state = get();
    console.log('Got state:', { version: state.version, metadata: state.metadata });
    
    const projectData: ProjectData = {
      version: state.version,
      metadata: {
        ...state.metadata,
        updated_at: Date.now()
      },
      scenes: state.scenes,
      draft_tabs: state.draft_tabs,
      workbench: state.workbench,
      stars: state.stars,
      characters: state.characters,
      plan_steps: state.plan_steps,
      idea_bank: state.idea_bank,
      active_scene_id: state.active_scene_id
    };

    try {
      console.log('Calling save_project with data size:', JSON.stringify(projectData).length);
      await invoke('save_project', { stateJson: JSON.stringify(projectData) });
      console.log('Save successful');
    } catch (error) {
      console.error('Failed to save project:', error);
      alert(`Save failed: ${error}`);
    }
  },

  loadProject: async () => {
    try {
      const loadedState = await invoke<string>('load_project');
      const rawData = JSON.parse(loadedState) as Partial<ProjectData>;
      const projectData = repairProjectData(rawData);
      
      set(state => ({
        ...projectData,
        // Keep UI and session state
        ui: state.ui,
        prompts: state.prompts,
        isLoading: state.isLoading
      }));
    } catch (error) {
      console.error('Failed to load project:', error);
      // Initialize with empty project on load failure
      const emptyProject = createEmptyProject('New Project');
      set(state => ({
        ...emptyProject,
        ui: state.ui,
        prompts: state.prompts,
        isLoading: state.isLoading
      }));
    }
  },

  saveProjectAs: async () => {
    console.log('saveProjectAs called');
    const state = get();
    const projectData: ProjectData = {
      version: state.version,
      metadata: {
        ...state.metadata,
        updated_at: Date.now()
      },
      scenes: state.scenes,
      draft_tabs: state.draft_tabs,
      workbench: state.workbench,
      stars: state.stars,
      characters: state.characters,
      plan_steps: state.plan_steps,
      idea_bank: state.idea_bank,
      active_scene_id: state.active_scene_id
    };

    try {
      console.log('Calling save_project_as with data size:', JSON.stringify(projectData).length);
      await invoke('save_project_as', { stateJson: JSON.stringify(projectData) });
      console.log('Save as successful');
    } catch (error) {
      console.error('Failed to save project as:', error);
      alert(`Save As failed: ${error}`);
    }
  },

  loadProjectFromFile: async () => {
    try {
      const loadedState = await invoke<string>('load_project_from_file');
      const rawData = JSON.parse(loadedState) as Partial<ProjectData>;
      const projectData = repairProjectData(rawData);
      
      set(state => ({
        ...projectData,
        // Keep UI and session state
        ui: state.ui,
        prompts: [],
        isLoading: state.isLoading
      }));
    } catch (error) {
      console.error('Failed to load project from file:', error);
    }
  },

  createNewProject: (title: string, author?: string) => {
    const newProject = createEmptyProject(title, author);
    set(state => ({
      ...newProject,
      // Keep UI state but reset others
      ui: { ...state.ui, activeModal: null, selectedTabId: null },
      prompts: [],
      isLoading: false
    }));
  },

  setLoading: (loading: boolean) => {
    set({ isLoading: loading });
  },
})); 