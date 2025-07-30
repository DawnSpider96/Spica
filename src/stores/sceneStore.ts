import { v4 as uuidv4 } from 'uuid';
import { PersistenceService } from '../services/persistenceService';
import type { Scene, PlanStep } from '../types';

/**
 * Scene store state interface
 */
export interface SceneState {
  scenes: Record<string, Scene>;
  active_scene_id: string | null;
  plan_steps: Record<string, PlanStep>;
}

/**
 * Scene store actions interface
 */
export interface SceneActions {
  // Scene management
  createScene: (name: string) => string;
  updateScene: (id: string, updates: Partial<Scene>) => void;
  setActiveScene: (sceneId: string) => void;
  updateScenePlan: (sceneId: string, rawText: string) => void;
  getActiveScene: () => Scene | null;
  
  // Plan step management
  createPlanStep: (sceneId: string, text: string) => string;
  updatePlanStep: (id: string, updates: Partial<PlanStep>) => void;
  deletePlanStep: (id: string) => void;
  linkPlanStepToTab: (stepId: string, tabId: string) => void;
  unlinkPlanStepFromTab: (stepId: string, tabId: string) => void;
}

/**
 * Creates the scene store slice
 */
export const createSceneSlice = (set: any, get: any) => ({
  // === INITIAL STATE ===
  scenes: {},
  active_scene_id: null,
  plan_steps: {},

  // === SCENE ACTIONS ===
  
  createScene: (name: string) => {
    const scene = PersistenceService.createEmptyScene(name);
    set((state: any) => ({
      scenes: { ...state.scenes, [scene.id]: scene }
    }));
    return scene.id;
  },

  updateScene: (id: string, updates: Partial<Scene>) => {
    set((state: any) => ({
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

  getActiveScene: () => {
    const state = get();
    return state.active_scene_id ? state.scenes[state.active_scene_id] || null : null;
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

    set((state: any) => ({
      plan_steps: { ...state.plan_steps, [newStep.id]: newStep },
      scenes: {
        ...state.scenes,
        [sceneId]: { ...state.scenes[sceneId], plan: updatedPlan, updated_at: Date.now() }
      }
    }));

    return newStep.id;
  },

  updatePlanStep: (id: string, updates: Partial<PlanStep>) => {
    set((state: any) => ({
      plan_steps: {
        ...state.plan_steps,
        [id]: state.plan_steps[id] ? { ...state.plan_steps[id], ...updates } : state.plan_steps[id]
      }
    }));
  },

  deletePlanStep: (id: string) => {
    set((state: any) => {
      const { [id]: deletedStep, ...remainingSteps } = state.plan_steps;
      
      // Remove from scenes
      const updatedScenes = { ...state.scenes };
      (Object.values(updatedScenes) as Scene[]).forEach((scene: Scene) => {
        scene.plan.parsed_steps = scene.plan.parsed_steps.filter(step => step.id !== id);
      });
      
      // Clean up references in draft tabs
      const updatedDraftTabs = { ...state.draft_tabs };
      Object.values(updatedDraftTabs).forEach((tab: any) => {
        tab.fulfilled_plan_steps = tab.fulfilled_plan_steps.filter((stepId: string) => stepId !== id);
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

    // Update draft tab (this will need to be coordinated with content store)
    get().updateDraftTab?.(tabId, {
      fulfilled_plan_steps: [...tab.fulfilled_plan_steps, stepId]
    });
  },

  unlinkPlanStepFromTab: (stepId: string, tabId: string) => {
    const step = get().plan_steps[stepId];
    const tab = get().draft_tabs[tabId];
    if (!step || !tab) return;

    get().updatePlanStep(stepId, {
      fulfilled_by: step.fulfilled_by.filter((id: string) => id !== tabId)
    });

    // Update draft tab (this will need to be coordinated with content store)
    get().updateDraftTab?.(tabId, {
      fulfilled_plan_steps: tab.fulfilled_plan_steps.filter((id: string) => id !== stepId)
    });
  },
}); 