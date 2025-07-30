// Shared types between frontend and backend

// ===== CORE ENTITIES =====

export interface TimelineEvent {
  id: string;
  text: string;
  dialogue?: string;
  associated_stars: string[]; // Star IDs
}

export interface Description {
  id: string;
  text: string;
  is_important: boolean;
  origin_star_id?: string; // Star ID
}

export interface DraftTab {
  id: string;
  scene_id?: string; // Optional - undefined means it's in workbench
  index: number;
  timeline: TimelineEvent[];
  descriptions: Description[];
  summary?: string; // LLM-generated
  fulfilled_plan_steps: string[]; // PlanStep IDs
  suggested_plan_steps: string[]; // e.g., ["Reveal letter's origin"]
  created_at: number;
  updated_at: number;
}

export interface PlanStep {
  id: string;
  text: string;
  fulfilled_by: string[]; // DraftTab IDs
  linked_stars: string[]; // Star IDs
}

export interface ScenePlan {
  raw_text: string;
  parsed_steps: PlanStep[];
}

export interface StarTags {
  characters: string[]; // Character IDs
  scope: 'CurrentScene' | 'FuturePlot' | 'Backstory' | 'Worldbuilding';
  status: 'Active' | 'Resolved' | 'Deferred';
  custom: string[]; // freeform tags
}

export interface Star {
  id: string;
  title: string;
  body: string;
  tags: StarTags;
  priority: number; // 0.0 to 1.0
  is_checked: boolean;
  origin_draft_tab_id?: string; // DraftTab ID
  created_at: number;
  last_used_in_prompt?: number;
}

export interface Character {
  id: string;
  name: string;
  fields: { [key: string]: string }; // user-defined fields
}

export interface Scene {
  id: string;
  name: string;
  setting?: string;
  backstory?: string;
  plan: ScenePlan;
  draft_tab_ids: string[]; // ordered
  created_at: number;
  updated_at: number;
}

// ===== GLOBAL STATE =====

export interface ProjectMetadata {
  title: string;
  author?: string;
  created_at: number;
  updated_at: number;
}

export interface ProjectData {
  version: string;
  metadata: ProjectMetadata;
  scenes: { [id: string]: Scene };
  draft_tabs: { [id: string]: DraftTab };
  workbench: { unassigned_draft_tab_ids: string[] };
  stars: { [id: string]: Star };
  characters: { [id: string]: Character };
  plan_steps: { [id: string]: PlanStep };
  idea_bank: { stored_draft_tab_ids: string[] };
  active_scene_id?: string;
}

export interface AppState extends ProjectData {
  // UI state (not persisted)
  ui: UIState;
  
  // Session state (not persisted)
  prompts: Prompt[];
  isLoading: boolean;
}

export interface UIState {
  activeModal: { type: 'tab' | 'star' | 'character'; id: string } | null;
  selectedTabId: string | null;
  isSidebarExpanded: boolean;
  showContextPreview: boolean;
}

export interface Prompt {
  id: string;
  text: string;
  timestamp: number;
}

// ===== API TYPES =====

export interface LLMResponse {
  tabs: Array<{
    title: string;
    timeline: Array<{
      text: string;
      dialogue?: string;
    }>;
  }>;
}

export interface ApiError {
  error: true;
  message: string;
  code?: string;
}

export type ApiResult<T> = T | ApiError; 