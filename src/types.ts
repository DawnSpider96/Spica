// Shared types between frontend and backend

// ===== CORE ENTITIES =====

export interface TimelineEvent {
  id: string;
  text: string;
  dialogue?: string;
  associated_stars: string[]; // Star IDs
  checked: boolean; // Whether this event should be included in LLM context
}

export interface Description {
  id: string;
  text: string;
  is_important: boolean;
  origin_star_id?: string; // Star ID
  target_event_id?: string; // Optional - if null, describes whole tab
  scope: 'event' | 'tab'; // Whether this description targets a specific event or the whole tab
}

export interface DraftTab {
  id: string;
  scene_id?: string; // Optional - undefined means it's in workbench
  index: number;
  timeline: TimelineEvent[];
  descriptions: Description[];
  summary?: string; // LLM-generated
  atmosphere?: string; // LLM-generated atmosphere description
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
  constraint_context?: string[]; // ["anger", "confrontation", "public"]
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
  // Character constraint fields
  constraint_type?: 'character_behavior' | 'character_dialogue' | 'character_emotion' | 'character_social' | 'character_physical';
  applies_to_character?: string; // Character ID
  situation_context?: string; // "when angry", "in public", "with authority"
  source_event?: {
    tab_id: string;
    event_id: string;
    event_text: string; // Snapshot of the problematic event
  };
}

export interface Character {
  id: string;
  name: string;
  fields: { [key: string]: string }; // user-defined fields
  is_checked: boolean;
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
    summary?: string;
    atmosphere?: string;
  }>;
}

export interface ApiError {
  error: true;
  message: string;
  code?: string;
}

export type ApiResult<T> = T | ApiError; 