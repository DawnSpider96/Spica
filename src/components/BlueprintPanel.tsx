import React, { useState } from 'react';
import { useAppStore } from '../stores';
import { ChevronDown, ChevronRight, Plus, Settings, Users, Edit } from 'lucide-react';

export const BlueprintPanel: React.FC = () => {
  const { 
    scenes,
    characters,
    active_scene_id,
    updateScene,
    createCharacter,
    openModal
  } = useAppStore();
  
  const [collapsed, setCollapsed] = useState({
    setting: false,
    characters: false,
  });

  const activeScene = active_scene_id ? scenes[active_scene_id] : null;
  const allCharacters = Object.values(characters);

  const toggleSection = (section: keyof typeof collapsed) => {
    setCollapsed(prev => ({ ...prev, [section]: !prev[section] }));
  };

  const handleUpdateSetting = (field: 'setting' | 'backstory', value: string) => {
    if (!active_scene_id) return;
    updateScene(active_scene_id, { [field]: value });
  };

  const handleUpdateScenePlan = (value: string) => {
    if (!active_scene_id) return;
    useAppStore.getState().updateScenePlan(active_scene_id, value);
  };

  const handleCreateCharacter = () => {
    createCharacter({
      name: 'New Character',
      fields: { role: '', description: '' }
    });
  };



  if (!activeScene) {
    return (
      <div className="panel blueprint-panel">
        <div className="panel-header">
          <h2 className="panel-title">Blueprint</h2>
        </div>
        <div className="panel-content">
          <div className="empty-state">
            <p className="text-muted">No active scene</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="panel blueprint-panel">
      <div className="panel-header">
        <h2 className="panel-title">Blueprint</h2>
        <div className="panel-subtitle text-sm text-muted">
          {activeScene.name}
        </div>
      </div>
      
      <div className="panel-content">
        {/* Scene Setting & Context */}
        <div className="blueprint-section">
          <button 
            className="section-header"
            onClick={() => toggleSection('setting')}
          >
            <Settings size={16} />
            <span>Scene & Context</span>
            {collapsed.setting ? <ChevronRight size={16} /> : <ChevronDown size={16} />}
          </button>
          
          {!collapsed.setting && (
            <div className="section-content">
              <div className="mb-3">
                <label className="text-sm font-medium">Setting</label>
                <textarea
                  className="textarea"
                  placeholder="Where and when does this scene take place?"
                  value={activeScene.setting || ''}
                  onChange={(e) => handleUpdateSetting('setting', e.target.value)}
                  rows={3}
                />
              </div>
              
              <div className="mb-3">
                <label className="text-sm font-medium">Story Context</label>
                <textarea
                  className="textarea"
                  placeholder="What happened before this scene? What led up to this moment?"
                  value={activeScene.backstory || ''}
                  onChange={(e) => handleUpdateSetting('backstory', e.target.value)}
                  rows={3}
                />
              </div>
              
              <div>
                <label className="text-sm font-medium">Scene Plan</label>
                <textarea
                  className="textarea"
                  placeholder="What should happen in this scene? Key beats, conflicts, reveals..."
                  value={activeScene.plan.raw_text}
                  onChange={(e) => handleUpdateScenePlan(e.target.value)}
                  rows={4}
                />
              </div>
            </div>
          )}
        </div>

        {/* Characters */}
        <div className="blueprint-section">
          <button 
            className="section-header"
            onClick={() => toggleSection('characters')}
          >
            <Users size={16} />
            <span>Characters ({allCharacters.length})</span>
            {collapsed.characters ? <ChevronRight size={16} /> : <ChevronDown size={16} />}
          </button>
          
          {!collapsed.characters && (
            <div className="section-content">
              {allCharacters.map(character => (
                <div 
                  key={character.id} 
                  className="character-card card"
                  onClick={() => openModal('character', character.id)}
                >
                  <div className="character-header">
                    <h4 className="character-name">{character.name}</h4>
                    <button className="edit-button">
                      <Edit size={12} />
                    </button>
                  </div>
                  
                  <div className="character-fields">
                    {Object.entries(character.fields).slice(0, 3).map(([key, value]) => (
                      <div key={key} className="character-field text-sm">
                        <span className="field-key">{key}:</span>
                        <span className="field-value">{value.length > 30 ? `${value.substring(0, 30)}...` : value}</span>
                      </div>
                    ))}
                    {Object.keys(character.fields).length > 3 && (
                      <div className="text-xs text-muted">
                        +{Object.keys(character.fields).length - 3} more fields
                      </div>
                    )}
                  </div>
                </div>
              ))}
              
              <button 
                className="button button-secondary"
                onClick={handleCreateCharacter}
              >
                <Plus size={16} />
                Add Character
              </button>
            </div>
          )}
        </div>


      </div>
    </div>
  );
}; 