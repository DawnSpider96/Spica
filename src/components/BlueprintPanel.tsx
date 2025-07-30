import React, { useState } from 'react';
import { useAppStore } from '../store/useAppStore';
import { ChevronDown, ChevronRight, Plus, Settings, Users, Star } from 'lucide-react';

export const BlueprintPanel: React.FC = () => {
  const { blueprint, updateSetting, addCharacter, addStar, openModal } = useAppStore();
  const [collapsed, setCollapsed] = useState({
    setting: false,
    characters: false,
    stars: false,
  });

  const toggleSection = (section: keyof typeof collapsed) => {
    setCollapsed(prev => ({ ...prev, [section]: !prev[section] }));
  };

  return (
    <div className="panel blueprint-panel">
      <div className="panel-header">
        <h2 className="panel-title">Blueprint</h2>
      </div>
      
      <div className="panel-content">
        {/* Setting & Background */}
        <div className="blueprint-section">
          <button 
            className="section-header"
            onClick={() => toggleSection('setting')}
          >
            <Settings size={16} />
            <span>Setting & Background</span>
            {collapsed.setting ? <ChevronRight size={16} /> : <ChevronDown size={16} />}
          </button>
          
          {!collapsed.setting && (
            <div className="section-content">
              <textarea
                className="textarea"
                placeholder="Describe your story's world, setting, and background..."
                value={blueprint.setting}
                onChange={(e) => updateSetting(e.target.value)}
                rows={6}
              />
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
            <span>Characters ({blueprint.characters.length})</span>
            {collapsed.characters ? <ChevronRight size={16} /> : <ChevronDown size={16} />}
          </button>
          
          {!collapsed.characters && (
            <div className="section-content">
              {blueprint.characters.map(character => (
                <div 
                  key={character.id} 
                  className="character-card card"
                  onClick={() => openModal('character', character.id)}
                >
                  <h4 className="character-name">{character.name}</h4>
                  <p className="character-description text-sm text-muted">
                    {character.description.length > 100 
                      ? `${character.description.substring(0, 100)}...`
                      : character.description
                    }
                  </p>
                  {character.tags && character.tags.length > 0 && (
                    <div className="character-tags">
                      {character.tags.map(tag => (
                        <span key={tag} className="tag">{tag}</span>
                      ))}
                    </div>
                  )}
                </div>
              ))}
              
              <button 
                className="button button-secondary"
                onClick={() => addCharacter({ name: 'New Character', description: '' })}
              >
                <Plus size={16} />
                Add Character
              </button>
            </div>
          )}
        </div>

        {/* Stars */}
        <div className="blueprint-section">
          <button 
            className="section-header"
            onClick={() => toggleSection('stars')}
          >
            <Star size={16} />
            <span>Stars ({blueprint.stars.length})</span>
            {collapsed.stars ? <ChevronRight size={16} /> : <ChevronDown size={16} />}
          </button>
          
          {!collapsed.stars && (
            <div className="section-content">
              {blueprint.stars.map(star => (
                <div 
                  key={star.id} 
                  className="star-card card"
                  onClick={() => openModal('star', star.id)}
                >
                  <h4 className="star-title">{star.title}</h4>
                  <p className="star-content text-sm text-muted">
                    {star.content.length > 80 
                      ? `${star.content.substring(0, 80)}...`
                      : star.content
                    }
                  </p>
                  {star.tags && star.tags.length > 0 && (
                    <div className="star-tags">
                      {star.tags.map(tag => (
                        <span key={tag} className="tag">{tag}</span>
                      ))}
                    </div>
                  )}
                </div>
              ))}
              
              <button 
                className="button button-secondary"
                onClick={() => addStar({ title: 'New Note', content: '' })}
              >
                <Plus size={16} />
                Add Note
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}; 