/**
 * UI store state interface
 */
export interface UIState {
  ui: {
    activeModal: { type: 'tab' | 'star' | 'character'; id: string } | null;
    selectedTabId: string | null;
    isSidebarExpanded: boolean;
    showContextPreview: boolean;
  };
}

/**
 * UI store actions interface
 */
export interface UIActions {
  openModal: (type: 'tab' | 'star' | 'character', id: string) => void;
  closeModal: () => void;
  setSelectedTab: (id: string | null) => void;
  toggleSidebar: () => void;
  toggleContextPreview: () => void;
}

/**
 * Creates the UI store slice
 */
export const createUISlice = (set: any, _get: any) => ({
  // === INITIAL STATE ===
  ui: {
    activeModal: null,
    selectedTabId: null,
    isSidebarExpanded: true,
    showContextPreview: false,
  },

  // === UI ACTIONS ===
  
  openModal: (type: 'tab' | 'star' | 'character', id: string) => {
    set((state: any) => ({
      ui: { ...state.ui, activeModal: { type, id } }
    }));
  },

  closeModal: () => {
    set((state: any) => ({
      ui: { ...state.ui, activeModal: null }
    }));
  },

  setSelectedTab: (id: string | null) => {
    set((state: any) => ({
      ui: { ...state.ui, selectedTabId: id }
    }));
  },

  toggleSidebar: () => {
    set((state: any) => ({
      ui: { ...state.ui, isSidebarExpanded: !state.ui.isSidebarExpanded }
    }));
  },

  toggleContextPreview: () => {
    set((state: any) => ({
      ui: { ...state.ui, showContextPreview: !state.ui.showContextPreview }
    }));
  },
}); 