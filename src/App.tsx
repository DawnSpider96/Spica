import React from 'react';
import { useAppStore } from './stores';
import { useHotkeys } from 'react-hotkeys-hook';
import { BlueprintPanel } from './components/BlueprintPanel';
import { WorkingArea } from './components/WorkingArea';
import { StarsPanel } from './components/StarsPanel';
import { ModalEditor } from './components/ModalEditor';
import { FileText, FolderOpen, Save, Plus } from 'lucide-react';
import './App.css';

function App() {
  const { 
    metadata,
    saveProject, 
    saveProjectAs,
    loadProjectFromFile,
    createNewProject,
    closeModal 
  } = useAppStore();

  // Removed automatic loading on startup

  // Global keyboard shortcuts
  useHotkeys('cmd+s, ctrl+s', (e) => {
    e.preventDefault();
    saveProject();
  });

  useHotkeys('cmd+shift+s, ctrl+shift+s', (e) => {
    e.preventDefault();
    saveProjectAs();
  });

  useHotkeys('cmd+o, ctrl+o', (e) => {
    e.preventDefault();
    loadProjectFromFile();
  });

  useHotkeys('cmd+n, ctrl+n', (e) => {
    e.preventDefault();
    handleNewProject();
  });

  useHotkeys('escape', () => {
    closeModal();
  });

  const handleNewProject = async () => {
    const hasUnsavedWork = true; // We could add logic to detect actual changes later
    
    if (hasUnsavedWork) {
      const shouldSave = window.confirm(
        'Save current project before creating a new one? This will save your current work.'
      );
      
      if (shouldSave) {
        try {
          await saveProject();
        } catch (error) {
          console.error('Failed to save before creating new project:', error);
          const continueAnyway = window.confirm('Failed to save current project. Continue creating new project anyway?');
          if (!continueAnyway) return;
        }
      }
    }
    
    const title = prompt('Project title:', 'New Project');
    if (title) {
      const author = prompt('Author (optional):', '');
      createNewProject(title, author || undefined);
    }
  };

  return (
    <div className="app">
      {/* Project Menu Bar */}
      <div className="project-menu">
        <div className="project-info">
          <FileText size={16} />
          <span className="project-title">{metadata.title}</span>
          {metadata.author && (
            <span className="project-author">by {metadata.author}</span>
          )}
        </div>
        
        <div className="project-actions">
          <button 
            className="button button-secondary"
            onClick={handleNewProject}
            title="Create new project (Ctrl+N)"
          >
            <Plus size={16} />
            New
          </button>
          
          <button 
            className="button button-secondary"
            onClick={loadProjectFromFile}
            title="Load project from file (Ctrl+O)"
          >
            <FolderOpen size={16} />
            Load
          </button>
          
          <button 
            className="button button-secondary"
            onClick={saveProject}
            title="Save project (Ctrl+S)"
          >
            <Save size={16} />
            Save
          </button>
          
          <button 
            className="button button-secondary"
            onClick={saveProjectAs}
            title="Save project as... (Ctrl+Shift+S)"
          >
            <Save size={16} />
            Save As
          </button>
        </div>
      </div>

      <div className="app-layout">
        <BlueprintPanel />
        <WorkingArea />
        <StarsPanel />
      </div>
      <ModalEditor />
    </div>
  );
}

export default App; 