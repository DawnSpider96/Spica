import { create } from 'zustand';
import { PersistenceService } from '../services/persistenceService';
import { createSceneSlice, type SceneState, type SceneActions } from './sceneStore';
import { createCharacterSlice, type CharacterState, type CharacterActions } from './characterStore';
import { createContentSlice, type ContentState, type ContentActions } from './contentStore';
import { createUISlice, type UIState, type UIActions } from './uiStore';
import type { ProjectData } from '../types';

/**
 * Combined app store interface
 */
interface AppStore extends 
  SceneState, 
  CharacterState, 
  ContentState, 
  UIState,
  SceneActions, 
  CharacterActions, 
  ContentActions, 
  UIActions 
{
  // Project metadata
  version: string;
  metadata: {
    title: string;
    author?: string;
    created_at: number;
    updated_at: number;
  };

  // Persistence actions
  saveProject: () => Promise<void>;
  loadProject: () => Promise<void>;
  saveProjectAs: () => Promise<void>;
  loadProjectFromFile: () => Promise<void>;
  createNewProject: (title: string, author?: string) => void;
}

/**
 * Main application store combining all domain slices
 * This replaces the monolithic useAppStore.ts with a modular architecture
 */
export const useAppStore = create<AppStore>((set, get) => {
  // Initialize with empty project
  const initialProject = PersistenceService.createEmptyProject('New Project');

  return {
    // === DOMAIN SLICES ===
    ...createSceneSlice(set, get),
    ...createCharacterSlice(set, get),
    ...createContentSlice(set, get),
    ...createUISlice(set, get),

    // === PERSISTENCE ACTIONS ===
    
    saveProject: async () => {
      const state = get();
      const projectData: ProjectData = {
        version: state.version,
        metadata: state.metadata,
        scenes: state.scenes,
        draft_tabs: state.draft_tabs,
        stars: state.stars,
        characters: state.characters,
        plan_steps: state.plan_steps,
        idea_bank: state.idea_bank,
        active_scene_id: state.active_scene_id || undefined
      };

      try {
        await PersistenceService.saveProject(projectData);
      } catch (error) {
        console.error('Failed to save project:', error);
      }
    },

    loadProject: async () => {
      try {
        const projectData = await PersistenceService.loadProject();
        
        set((state) => ({
          // Load project data
          ...projectData,
          // Keep UI and session state
          ui: state.ui,
          prompts: state.prompts,
          isLoading: state.isLoading
        }));
      } catch (error) {
        console.error('Failed to load project:', error);
        // Initialize with empty project on load failure
        const emptyProject = PersistenceService.createEmptyProject('New Project');
        set((state) => ({
          ...emptyProject,
          ui: state.ui,
          prompts: state.prompts,
          isLoading: state.isLoading
        }));
      }
    },

    saveProjectAs: async () => {
      const state = get();
      const projectData: ProjectData = {
        version: state.version,
        metadata: state.metadata,
        scenes: state.scenes,
        draft_tabs: state.draft_tabs,
        stars: state.stars,
        characters: state.characters,
        plan_steps: state.plan_steps,
        idea_bank: state.idea_bank,
        active_scene_id: state.active_scene_id || undefined
      };

      try {
        await PersistenceService.saveProjectAs(projectData);
      } catch (error) {
        console.error('Failed to save project as:', error);
        alert(`Error saving project: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    },

    loadProjectFromFile: async () => {
      try {
        const projectData = await PersistenceService.loadProjectFromFile();
        
        set((state) => ({
          // Load project data
          ...projectData,
          // Keep UI and session state
          ui: state.ui,
          prompts: state.prompts,
          isLoading: state.isLoading
        }));
      } catch (error) {
        console.error('Failed to load project from file:', error);
        alert(`Error loading project: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    },

    createNewProject: (title: string, author?: string) => {
      const newProject = PersistenceService.createNewProject(title, author);
      set((state) => ({
        ...newProject,
        // Keep UI state but reset others
        ui: { ...state.ui, activeModal: null, selectedTabId: null },
        prompts: [],
        isLoading: false
      }));
    },

    // Initialize with the empty project data
    ...initialProject,
  };
});

// Export individual store slices for potential standalone use
export { createSceneSlice } from './sceneStore';
export { createCharacterSlice } from './characterStore';
export { createContentSlice } from './contentStore';
export { createUISlice } from './uiStore';

// Export types for consumers
export type { SceneState, SceneActions } from './sceneStore';
export type { CharacterState, CharacterActions } from './characterStore';
export type { ContentState, ContentActions } from './contentStore';
export type { UIState, UIActions } from './uiStore'; 