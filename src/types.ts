// Shared types between frontend and backend
export interface Prompt {
  id: string;
  text: string;
  timestamp: number;
}

export interface DraftTab {
  id: string;
  title: string;
  content: string;
  metadata?: { [key: string]: any };
  createdAt: number;
}

export interface Character {
  id: string;
  name: string;
  description: string;
  tags?: string[];
}

export interface Star {
  id: string;
  title: string;
  content: string;
  tags?: string[];
  linkedTabId?: string;
}

export interface Blueprint {
  setting: string;
  characters: Character[];
  stars: Star[];
}

export interface UIState {
  activeModal: { type: 'tab' | 'star' | 'character'; id: string } | null;
  selectedTabId: string | null;
  isSidebarExpanded: boolean;
}

export interface AppState {
  // prompts: Prompt[];
  draftTabs: DraftTab[];
  sceneTabIds: string[];
  blueprint: Blueprint;
  ui: UIState;
}

// API Response types
export interface LLMResponse {
  tabs: Array<{
    title: string;
    content: string;
    type?: string;
  }>;
}

export interface ApiError {
  error: true;
  message: string;
  code?: string;
}

export type ApiResult<T> = T | ApiError; 