import React, { useState } from 'react';
import { useAppStore } from '../stores';
import { ChevronDown, ChevronRight, Plus, Settings, Users, Star, Check, Edit } from 'lucide-react';

export const BlueprintPanel: React.FC = () => {
  const { 
    scenes,
    characters,
    stars,
    active_scene_id,
    updateScene,
    createCharacter,
    createStar,
    toggleStarChecked,
    toggleCharacterChecked,
    openModal 
  } = useAppStore();
  
  const [collapsed, setCollapsed] = useState({
    setting: false,
    characters: false,
    stars: false,
  });

  const activeScene = active_scene_id ? scenes[active_scene_id] : null;
  const allCharacters = Object.values(characters);
  const allStars = Object.values(stars);
  const checkedStars = allStars.filter(star => star.is_checked);
  const checkedCharacters = allCharacters.filter(character => character.is_checked);

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

  const handleCreateStar = () => {
    createStar({
      title: 'New Note',
      body: '',
      tags: {
        characters: [],
        scope: 'CurrentScene',
        status: 'Active',
        custom: []
      },
      priority: 0.5,
      is_checked: false
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
            <span className="checked-count">
              {checkedCharacters.length} checked
            </span>
            {collapsed.characters ? <ChevronRight size={16} /> : <ChevronDown size={16} />}
          </button>
          
          {!collapsed.characters && (
            <div className="section-content">
              {allCharacters.map(character => (
                <div 
                  key={character.id} 
                  className={`character-card card ${character.is_checked ? 'checked' : ''}`}
                >
                  <div className="character-header">
                    <button 
                      className={`star-checkbox ${character.is_checked ? 'checked' : ''}`}
                      onClick={() => toggleCharacterChecked(character.id)}
                >
                      {character.is_checked && <Check size={12} />}
                    </button>
                  <h4 className="character-name">{character.name}</h4>
                    <button 
                      className="edit-button"
                      onClick={() => openModal('character', character.id)}
                    >
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

        {/* Stars Summary */}
        <div className="blueprint-section">
          <button 
            className="section-header"
            onClick={() => toggleSection('stars')}
          >
            <Star size={16} />
            <span>Stars Summary</span>
            <span className="checked-count">
              {checkedStars.length} active
            </span>
            {collapsed.stars ? <ChevronRight size={16} /> : <ChevronDown size={16} />}
          </button>
          
          {!collapsed.stars && (
            <div className="section-content">
              <div className="stars-summary">
                <p className="text-sm text-muted">
                  Total: {allStars.length} stars • Active: {checkedStars.length}
                </p>
                {checkedStars.length > 0 && (
                  <div className="active-stars-preview">
                    {checkedStars.slice(0, 3).map(star => (
                      <div key={star.id} className="star-preview">
                        <span className="star-title">{star.title}</span>
                      </div>
                    ))}
                    {checkedStars.length > 3 && (
                      <div className="star-preview">
                        <span className="text-muted">+{checkedStars.length - 3} more</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
              
              <button 
                className="button button-secondary button-sm"
                onClick={handleCreateStar}
              >
                <Plus size={14} />
                Quick Star
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}; 