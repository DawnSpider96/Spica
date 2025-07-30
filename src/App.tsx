import React, { useEffect } from 'react';
import { useAppStore } from './store/useAppStore';
import { useHotkeys } from 'react-hotkeys-hook';
import { BlueprintPanel } from './components/BlueprintPanel';
import { WorkingArea } from './components/WorkingArea';
import { ScenePanel } from './components/ScenePanel';
import { ModalEditor } from './components/ModalEditor';
import './App.css';

function App() {
  const { loadProject, saveProject, closeModal } = useAppStore();

  // Load project on startup
  useEffect(() => {
    loadProject();
  }, [loadProject]);

  // Global keyboard shortcuts
  useHotkeys('cmd+s, ctrl+s', (e) => {
    e.preventDefault();
    saveProject();
  });

  useHotkeys('escape', () => {
    closeModal();
  });

  return (
    <div className="app">
      <div className="app-layout">
        <BlueprintPanel />
        <WorkingArea />
        <ScenePanel />
      </div>
      <ModalEditor />
    </div>
  );
}

export default App; 