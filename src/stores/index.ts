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
  addTabToScene: (tabId: string, sceneId: string) => void;
  removeTabFromScene: (tabId: string) => void;
  reorderSceneTabs: (sceneId: string, fromIndex: number, toIndex: number) => void;
  reorderWorkbenchTabs: (fromIndex: number, toIndex: number) => void;
  reorderIdeaBankTabs: (fromIndex: number, toIndex: number) => void;
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
  
  addTabToScene: (tabId: string, sceneId: string) => {
    const scene = get().scenes[sceneId];
    const tab = get().draft_tabs[tabId];
    if (!scene || !tab) return;

    // Remove from workbench and idea bank
    set(state => ({
      workbench: {
        ...state.workbench,
        unassigned_draft_tab_ids: state.workbench.unassigned_draft_tab_ids.filter(id => id !== tabId)
      },
      idea_bank: {
        ...state.idea_bank,
        stored_draft_tab_ids: state.idea_bank.stored_draft_tab_ids.filter(id => id !== tabId)
      }
    }));

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
    const updatedTabIds = scene.draft_tab_ids.filter(id => id !== tabId);
    
    // Reindex remaining tabs
    updatedTabIds.forEach((id, index) => {
      get().updateDraftTab(id, { index });
    });

    get().updateScene(tab.scene_id, {
      draft_tab_ids: updatedTabIds
    });

    // Update tab to remove scene assignment
    get().updateDraftTab(tabId, {
      scene_id: undefined,
      index: 0
    });
  },

  reorderSceneTabs: (sceneId: string, fromIndex: number, toIndex: number) => {
    const scene = get().scenes[sceneId];
    if (!scene) return;

    const newTabIds = [...scene.draft_tab_ids];
    const [movedTabId] = newTabIds.splice(fromIndex, 1);
    newTabIds.splice(toIndex, 0, movedTabId);

    // Update all tab indices
    newTabIds.forEach((tabId, index) => {
      get().updateDraftTab(tabId, { index });
    });

    get().updateScene(sceneId, {
      draft_tab_ids: newTabIds
    });
  },

  reorderWorkbenchTabs: (fromIndex: number, toIndex: number) => {
    const state = get();
    const tabIds = [...state.workbench.unassigned_draft_tab_ids];
    if (tabIds.length < 2) return;

    const [movedTabId] = tabIds.splice(fromIndex, 1);
    tabIds.splice(toIndex, 0, movedTabId);

    set(state => ({
      workbench: {
        ...state.workbench,
        unassigned_draft_tab_ids: tabIds
      }
    }));
  },

  reorderIdeaBankTabs: (fromIndex: number, toIndex: number) => {
    const state = get();
    const tabIds = [...state.idea_bank.stored_draft_tab_ids];
    if (tabIds.length < 2) return;

    const [movedTabId] = tabIds.splice(fromIndex, 1);
    tabIds.splice(toIndex, 0, movedTabId);

    set(state => ({
      idea_bank: {
        ...state.idea_bank,
        stored_draft_tab_ids: tabIds
      }
    }));
  },

  moveTabToIdeaBank: (tabId: string) => {
    get().removeTabFromScene(tabId);
    
    set(state => ({
      idea_bank: {
        ...state.idea_bank,
        stored_draft_tab_ids: [...state.idea_bank.stored_draft_tab_ids, tabId]
      }
    }));
  },

  moveTabFromIdeaBank: (tabId: string, sceneId: string) => {
    get().addTabToScene(tabId, sceneId);
  },

  moveTabToWorkbench: (tabId: string) => {
    get().removeTabFromScene(tabId);
    
    set(state => ({
      workbench: {
        ...state.workbench,
        unassigned_draft_tab_ids: [...state.workbench.unassigned_draft_tab_ids, tabId]
      }
    }));
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