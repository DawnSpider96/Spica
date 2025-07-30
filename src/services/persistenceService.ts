import { invoke } from '@tauri-apps/api/tauri';
import { v4 as uuidv4 } from 'uuid';
import type { ProjectData, Scene } from '../types';

/**
 * Service for handling project persistence (save/load)
 * Extracted from the main store to follow separation of concerns
 */
export class PersistenceService {
  
  /**
   * Creates an empty scene with default values
   */
  static createEmptyScene(name: string): Scene {
    return {
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
    };
  }

  /**
   * Creates an empty project with default structure
   */
  static createEmptyProject(title: string, author?: string): ProjectData {
    const sceneId = uuidv4();
    const scene = this.createEmptyScene('Main Scene');
    
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
  }

  /**
   * Repairs corrupted or incomplete project data
   * Ensures all required fields exist and cleans up orphaned references
   */
  static repairProjectData(data: Partial<ProjectData>): ProjectData {
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

    // Ensure we have an active scene
    if (!repaired.active_scene_id || !repaired.scenes[repaired.active_scene_id]) {
      const sceneIds = Object.keys(repaired.scenes);
      if (sceneIds.length > 0) {
        repaired.active_scene_id = sceneIds[0];
      } else {
        // Create a default scene
        const defaultScene = this.createEmptyScene('Main Scene');
        repaired.scenes[defaultScene.id] = defaultScene;
        repaired.active_scene_id = defaultScene.id;
      }
    }

    return repaired;
  }

  /**
   * Saves project data to the backend
   */
  static async saveProject(projectData: ProjectData): Promise<void> {
    const dataToSave = {
      ...projectData,
      metadata: {
        ...projectData.metadata,
        updated_at: Date.now()
      }
    };

    try {
      await invoke('save_project', { stateJson: JSON.stringify(dataToSave) });
    } catch (error) {
      console.error('Failed to save project:', error);
      throw error;
    }
  }

  /**
   * Loads project data from the backend
   */
  static async loadProject(): Promise<ProjectData> {
    try {
      const loadedState = await invoke<string>('load_project');
      const rawData = JSON.parse(loadedState) as Partial<ProjectData>;
      return this.repairProjectData(rawData);
    } catch (error) {
      console.error('Failed to load project:', error);
      // Return empty project on load failure
      return this.createEmptyProject('New Project');
    }
  }

  /**
   * Saves project data to a user-selected file location
   */
  static async saveProjectAs(projectData: ProjectData): Promise<void> {
    const dataToSave = {
      ...projectData,
      metadata: {
        ...projectData.metadata,
        updated_at: Date.now()
      }
    };

    try {
      await invoke('save_project_as', { stateJson: JSON.stringify(dataToSave) });
    } catch (error) {
      console.error('Failed to save project:', error);
      throw error;
    }
  }

  /**
   * Loads project data from a user-selected file
   */
  static async loadProjectFromFile(): Promise<ProjectData> {
    try {
      const loadedState = await invoke<string>('load_project_from_file');
      const rawData = JSON.parse(loadedState) as Partial<ProjectData>;
      return this.repairProjectData(rawData);
    } catch (error) {
      console.error('Failed to load project from file:', error);
      throw error;
    }
  }

  /**
   * Creates a new project and returns the project data
   */
  static createNewProject(title: string, author?: string): ProjectData {
    return this.createEmptyProject(title, author);
  }
} 